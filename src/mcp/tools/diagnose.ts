import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import {
  fetchApplication,
  fetchApplicationEnvs,
  fetchAppDeployments,
  fetchResources,
  fetchServer,
  fetchServerDomains,
  fetchServerResources,
  fetchServers,
  triggerServerValidate,
} from '../../api/client.js';
import {
  projectAppDiagnose,
  projectResourceSummary,
  projectScanIssue,
  projectServerDiagnose,
  resolveProjection,
} from '../../utils/projections.js';
import { generateHints } from '../../utils/diagnose-hints.js';
import {
  classifyIssues,
  type ScanIssue,
} from '../../utils/issue-classifier.js';
import {
  buildReadResponse,
  paginateArray,
  type ReadResponse,
} from '../../utils/formatters.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import {
  rejectTableFormatOnFullProjection,
  sharedReadParamsSchema,
} from './shared-read-params.js';
import {
  FIND_MATCH_CAP,
  matchesExplicitFields,
  matchesQuery,
  projectServerSummary,
  rankFindMatches,
  type FindableResource,
} from './resource.js';

const APP_IDENTIFIER_FIELDS = ['query', 'uuid', 'name', 'domain'] as const;
const SERVER_IDENTIFIER_FIELDS = ['query', 'uuid', 'name', 'ip'] as const;

const MULTI_MATCH_HINT = 'Re-run diagnose with a specific UUID';

function hasAtLeastOneIdentifier(
  data: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.some(
    (field) =>
      data[field] !== undefined &&
      data[field] !== null &&
      data[field] !== '',
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const appActionSchema = z
  .object({
    action: z.literal('app'),
    query: z.string().optional().describe('Fuzzy query string (UUID, name, or FQDN)'),
    uuid: z.string().optional().describe('Explicit application UUID'),
    name: z.string().optional().describe('Explicit application name substring'),
    domain: z.string().optional().describe('Explicit application FQDN substring'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .optional()
      .describe('Max recent deployments to include (default 10, max 50)'),
    ...sharedReadParamsSchema,
  })
  .superRefine((data, ctx) => {
    if (!hasAtLeastOneIdentifier(data, APP_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'At least one identifier (query|uuid|name|domain) required for action app',
        params: { code: 'COOLIFY_422' },
      });
    }
  });

const serverActionSchema = z
  .object({
    action: z.literal('server'),
    query: z.string().optional().describe('Fuzzy query string (UUID, name, or IP)'),
    uuid: z.string().optional().describe('Explicit server UUID'),
    name: z.string().optional().describe('Explicit server name substring'),
    ip: z.string().optional().describe('Explicit server IP substring'),
    trigger_validate: z
      .boolean()
      .default(true)
      .describe('Triggers non-blocking server verification (D-10)'),
    ...sharedReadParamsSchema,
  })
  .superRefine((data, ctx) => {
    if (!hasAtLeastOneIdentifier(data, SERVER_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'At least one identifier (query|uuid|name|ip) required for action server',
        params: { code: 'COOLIFY_422' },
      });
    }
  });

const scanActionSchema = z.object({
  action: z.literal('scan'),
  ...sharedReadParamsSchema,
});

export const diagnoseToolSchema = z.discriminatedUnion('action', [
  appActionSchema,
  serverActionSchema,
  scanActionSchema,
]);

export type DiagnoseAction = z.infer<typeof diagnoseToolSchema>;

export type DiagnoseMatchResult = ReadResponse<{
  matches: FindableResource[];
  hint: string;
}>;

export type DiagnoseAppResult = ReadResponse<
  ReturnType<typeof projectAppDiagnose>
>;

export type DiagnoseServerResult = ReadResponse<
  ReturnType<typeof projectServerDiagnose>
>;

export type DiagnoseScanResult = ReadResponse<{
  critical: ScanIssue[];
  high: ScanIssue[];
  info: ScanIssue[];
}>;

export type DiagnoseActionResult =
  | DiagnoseMatchResult
  | DiagnoseAppResult
  | DiagnoseServerResult
  | DiagnoseScanResult
  | McpErrorResult;

async function resolveAppUuid(
  parsed: z.infer<typeof appActionSchema>,
  env: EnvConfig,
): Promise<
  | { kind: 'single'; uuid: string }
  | { kind: 'zero' }
  | { kind: 'multi'; matches: FindableResource[] }
> {
  if (parsed.uuid) {
    return { kind: 'single', uuid: parsed.uuid };
  }

  const rawResources = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const applications = rawResources
    .filter(isRecord)
    .filter((raw) => raw.type === 'application')
    .map(projectResourceSummary) as FindableResource[];

  const searchTerms = {
    query: parsed.query,
    name: parsed.name,
    uuid: parsed.uuid,
    domain: parsed.domain,
  };

  let matches: FindableResource[];
  if (parsed.query) {
    matches = applications.filter((item) => matchesQuery(item, parsed.query!));
  } else {
    matches = applications.filter((item) =>
      matchesExplicitFields(item, {
        uuid: parsed.uuid,
        name: parsed.name,
        domain: parsed.domain,
      }),
    );
  }

  const ranked = rankFindMatches(matches, searchTerms).slice(0, FIND_MATCH_CAP);

  if (ranked.length === 0) {
    return { kind: 'zero' };
  }
  if (ranked.length > 1) {
    return { kind: 'multi', matches: ranked };
  }
  return { kind: 'single', uuid: ranked[0].uuid };
}

async function resolveServerUuid(
  parsed: z.infer<typeof serverActionSchema>,
  env: EnvConfig,
): Promise<
  | { kind: 'single'; uuid: string }
  | { kind: 'zero' }
  | { kind: 'multi'; matches: FindableResource[] }
> {
  if (parsed.uuid) {
    return { kind: 'single', uuid: parsed.uuid };
  }

  const rawServers = await fetchServers(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const servers = rawServers
    .filter(isRecord)
    .map(projectServerSummary) as FindableResource[];

  const searchTerms = {
    query: parsed.query,
    name: parsed.name,
    uuid: parsed.uuid,
    ip: parsed.ip,
  };

  let matches: FindableResource[];
  if (parsed.query) {
    matches = servers.filter((item) => matchesQuery(item, parsed.query!));
  } else {
    matches = servers.filter((item) =>
      matchesExplicitFields(item, {
        uuid: parsed.uuid,
        name: parsed.name,
        ip: parsed.ip,
      }),
    );
  }

  const ranked = rankFindMatches(matches, searchTerms).slice(0, FIND_MATCH_CAP);

  if (ranked.length === 0) {
    return { kind: 'zero' };
  }
  if (ranked.length > 1) {
    return { kind: 'multi', matches: ranked };
  }
  return { kind: 'single', uuid: ranked[0].uuid };
}

async function handleDiagnoseApp(
  parsed: z.infer<typeof appActionSchema>,
  env: EnvConfig,
): Promise<DiagnoseMatchResult | DiagnoseAppResult> {
  const projection = resolveProjection(parsed.projection, parsed.include_full);
  rejectTableFormatOnFullProjection(parsed.format, projection);

  const resolution = await resolveAppUuid(parsed, env);

  if (resolution.kind === 'zero') {
    return buildReadResponse(
      { matches: [], hint: MULTI_MATCH_HINT },
      { format: parsed.format, max_chars: parsed.max_chars },
    );
  }

  if (resolution.kind === 'multi') {
    return buildReadResponse(
      { matches: resolution.matches, hint: MULTI_MATCH_HINT },
      { format: parsed.format, max_chars: parsed.max_chars },
    );
  }

  const appUuid = resolution.uuid;
  const deploymentLimit = parsed.limit ?? 10;

  const basePromise = fetchApplication(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const envsPromise = fetchApplicationEnvs(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const deploymentsPromise = fetchAppDeployments(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const [baseSettled, envsSettled, deploymentsSettled] = await Promise.allSettled([
    basePromise,
    envsPromise,
    deploymentsPromise,
  ]);

  if (baseSettled.status === 'rejected') {
    throw baseSettled.reason;
  }

  const envCount =
    envsSettled.status === 'fulfilled' && Array.isArray(envsSettled.value)
      ? envsSettled.value.length
      : null;

  const deployments =
    deploymentsSettled.status === 'fulfilled' &&
    Array.isArray(deploymentsSettled.value)
      ? deploymentsSettled.value.slice(0, deploymentLimit)
      : [];

  const raw = isRecord(baseSettled.value) ? baseSettled.value : {};
  const data = projectAppDiagnose(
    raw,
    envCount,
    deployments,
    projection,
    parsed.max_chars,
  );

  data.hints = generateHints(
    'application',
    data.uuid,
    data.status,
    data.health_check_status,
  );

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleDiagnoseServer(
  parsed: z.infer<typeof serverActionSchema>,
  env: EnvConfig,
): Promise<DiagnoseMatchResult | DiagnoseServerResult> {
  const projection = resolveProjection(parsed.projection, parsed.include_full);
  rejectTableFormatOnFullProjection(parsed.format, projection);

  const resolution = await resolveServerUuid(parsed, env);

  if (resolution.kind === 'zero') {
    return buildReadResponse(
      { matches: [], hint: MULTI_MATCH_HINT },
      { format: parsed.format, max_chars: parsed.max_chars },
    );
  }

  if (resolution.kind === 'multi') {
    return buildReadResponse(
      { matches: resolution.matches, hint: MULTI_MATCH_HINT },
      { format: parsed.format, max_chars: parsed.max_chars },
    );
  }

  const serverUuid = resolution.uuid;

  const [baseSettled, resourcesSettled, domainsSettled, validateSettled] =
    await Promise.allSettled([
      fetchServer(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        serverUuid,
        env.COOLIFY_VERIFY_SSL,
      ),
      fetchServerResources(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        serverUuid,
        env.COOLIFY_VERIFY_SSL,
      ),
      fetchServerDomains(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        serverUuid,
        env.COOLIFY_VERIFY_SSL,
      ),
      parsed.trigger_validate
        ? triggerServerValidate(
            env.COOLIFY_URL,
            env.COOLIFY_TOKEN,
            serverUuid,
            env.COOLIFY_VERIFY_SSL,
          )
        : Promise.resolve(null),
    ]);

  if (baseSettled.status === 'rejected') {
    throw baseSettled.reason;
  }

  const resources =
    resourcesSettled.status === 'fulfilled' &&
    Array.isArray(resourcesSettled.value)
      ? resourcesSettled.value
      : [];

  const domains =
    domainsSettled.status === 'fulfilled' && Array.isArray(domainsSettled.value)
      ? domainsSettled.value
      : [];

  const validationStarted =
    parsed.trigger_validate && validateSettled.status === 'fulfilled';

  const raw = isRecord(baseSettled.value) ? baseSettled.value : {};
  const data = projectServerDiagnose(raw, resources, domains, validationStarted);

  data.hints = generateHints(
    'server',
    data.uuid,
    data.is_reachable ? 'running' : 'unreachable',
  );

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleDiagnoseScan(
  parsed: z.infer<typeof scanActionSchema>,
  env: EnvConfig,
): Promise<DiagnoseScanResult> {
  const [rawServers, rawResources] = await Promise.all([
    fetchServers(env.COOLIFY_URL, env.COOLIFY_TOKEN, env.COOLIFY_VERIFY_SSL),
    fetchResources(env.COOLIFY_URL, env.COOLIFY_TOKEN, env.COOLIFY_VERIFY_SSL),
  ]);

  const servers = rawServers.filter(isRecord);
  const resources = rawResources.filter(isRecord);

  const classified = classifyIssues(servers, resources);

  const projectBucket = (issues: ScanIssue[]) => issues.map(projectScanIssue);
  const critical = projectBucket(classified.critical);
  const high = projectBucket(classified.high);
  const info = projectBucket(classified.info);

  const flattened = [...critical, ...high, ...info];
  const total = flattened.length;
  paginateArray(flattened, parsed.page, parsed.per_page);

  return buildReadResponse(
    { critical, high, info },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
      page: parsed.page,
      per_page: parsed.per_page,
      total,
    },
  );
}

export async function handleDiagnoseAction(
  args: DiagnoseAction,
  env: EnvConfig,
): Promise<DiagnoseActionResult> {
  const parsed = diagnoseToolSchema.parse(args);

  try {
    switch (parsed.action) {
      case 'app':
        return await handleDiagnoseApp(parsed, env);
      case 'server':
        return await handleDiagnoseServer(parsed, env);
      case 'scan':
        return await handleDiagnoseScan(parsed, env);
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown diagnose action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isDiagnoseErrorResult(
  result: DiagnoseActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
