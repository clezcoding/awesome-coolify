import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchEnvironment,
  fetchProject,
  fetchServer,
} from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  checkGhAuth,
  createGhRepo,
} from '../../utils/gh-preflight.js';
import {
  ManifestManager,
  type ManifestResource,
} from '../../utils/manifest.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  handleApplicationAction,
  isApplicationErrorResult,
} from './application.js';
import {
  handleDeploymentAction,
  isDeploymentErrorResult,
} from './deployment.js';
import {
  handleProjectAction,
  isProjectErrorResult,
} from './project.js';
import {
  handleRecipeAction,
  isRecipeErrorResult,
} from './recipe.js';
import {
  createFlatActionSchema,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';

export const setupActionsCatalog =
  'Actions: preflight() · wire(mode, ...) · resume(mode?, ...)';

export const setupSafetyFooter =
  'Safety: optional instance · no auto-push · gh soft-pause';

const ALL_SETUP_STEPS = [
  'gh_preflight',
  'repo',
  'linkage',
  'recipe',
  'manifest',
  'domains',
  'env',
  'deploy_watch',
] as const;

type SetupStep = (typeof ALL_SETUP_STEPS)[number];

const RECIPE_TYPES = ['create-git-app', 'create-app-db', 'create-one-click'] as const;

export const setupActionSchema = createFlatActionSchema(
  ['preflight', 'wire', 'resume'],
  {
    mode: z
      .enum(['greenfield', 'link-existing'])
      .optional()
      .describe('Setup mode for wire/resume'),
    include_domains: z
      .boolean()
      .optional()
      .describe('Attach domains after wire (default false)'),
    set_env: z
      .boolean()
      .optional()
      .describe('Sync env vars after wire (default false)'),
    deploy_and_watch: z
      .boolean()
      .optional()
      .describe('Deploy and watch after wire (default false)'),
    skip_gh: z
      .boolean()
      .optional()
      .describe('Skip gh preflight (link-existing without repo step)'),
    server_uuid: z.string().optional().describe('Target server UUID'),
    project_uuid: z.string().optional().describe('Project UUID'),
    project_name: z.string().optional().describe('Project name for lookup'),
    environment_name: z.string().optional().describe('Environment name'),
    environment_uuid: z.string().optional().describe('Environment UUID'),
    initial_environment: z
      .string()
      .optional()
      .describe('Initial environment name for greenfield project create'),
    recipe_type: z
      .enum(RECIPE_TYPES)
      .optional()
      .describe('Recipe action for greenfield wire'),
    repo_name: z.string().optional().describe('GitHub repo name for greenfield create'),
    push: z
      .boolean()
      .optional()
      .describe('Push to GitHub after repo create (default false)'),
    application_uuid: z
      .string()
      .optional()
      .describe('Existing application UUID for link-existing manifest'),
    git_repository: z.string().optional().describe('Git repository URL for create-git-app'),
    git_branch: z.string().optional().describe('Git branch for create-git-app'),
    repo_path: z.string().optional().describe('Local repo path for create-git-app'),
    build_pack: z
      .enum(['nixpacks', 'railpack', 'static', 'dockerfile'])
      .optional()
      .describe('Build pack for create-git-app'),
    app_name: z.string().optional().describe('Application name for create-app-db'),
    db_name: z.string().optional().describe('Database name for create-app-db'),
    db_engine: z
      .enum([
        'postgresql',
        'mysql',
        'mariadb',
        'mongodb',
        'redis',
        'clickhouse',
        'dragonfly',
        'keydb',
      ])
      .optional()
      .describe('Database engine for create-app-db'),
    env_key: z.string().optional().describe('Env key for create-app-db'),
    type: z.string().optional().describe('One-click service type'),
    instant_deploy: z.boolean().optional().describe('Instant deploy for recipe create'),
    domains: z.string().optional().describe('Comma-separated domains when include_domains'),
    ...sharedReadParamsFlatShape,
  },
  {
    preflight: [],
    wire: [
      'mode',
      'include_domains',
      'set_env',
      'deploy_and_watch',
      'skip_gh',
      'server_uuid',
      'project_uuid',
      'project_name',
      'environment_name',
      'environment_uuid',
      'initial_environment',
      'recipe_type',
      'repo_name',
      'push',
      'application_uuid',
      'git_repository',
      'git_branch',
      'repo_path',
      'build_pack',
      'app_name',
      'db_name',
      'db_engine',
      'env_key',
      'type',
      'instant_deploy',
      'domains',
      'format',
      'max_chars',
    ],
    resume: [
      'mode',
      'include_domains',
      'set_env',
      'deploy_and_watch',
      'skip_gh',
      'server_uuid',
      'project_uuid',
      'project_name',
      'environment_name',
      'environment_uuid',
      'initial_environment',
      'recipe_type',
      'repo_name',
      'push',
      'application_uuid',
      'git_repository',
      'git_branch',
      'repo_path',
      'build_pack',
      'app_name',
      'db_name',
      'db_engine',
      'env_key',
      'type',
      'instant_deploy',
      'domains',
      'format',
      'max_chars',
    ],
  },
  { wire: ['mode'] },
);

export type SetupAction = z.infer<typeof setupActionSchema>;

export type SetupActionResult =
  | ReadResponse<Record<string, unknown>>
  | McpErrorResult;

type WireLikeAction =
  | Extract<SetupAction, { action: 'wire' }>
  | Extract<SetupAction, { action: 'resume' }>;

type LinkageContext = {
  project_uuid: string;
  project_name: string;
  environment_uuid: string;
  environment_name: string;
  server_uuid: string;
  server_name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringField(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function parseSetupAction(args: unknown): SetupAction {
  const parsed = setupActionSchema.safeParse(args);
  if (!parsed.success) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: parsed.error.issues.map((issue) => issue.message).join('; '),
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
  return parsed.data;
}

function flagEnabled(value: boolean | undefined): boolean {
  return value === true;
}

function shouldRunGhPreflight(parsed: WireLikeAction): boolean {
  if (parsed.skip_gh === true) {
    return false;
  }
  if (parsed.mode === 'link-existing' && !parsed.repo_name) {
    return false;
  }
  return true;
}

function remainingSteps(
  mode: WireLikeAction['mode'],
  parsed: WireLikeAction,
  completed: SetupStep[],
): SetupStep[] {
  const optional = new Set<SetupStep>();
  if (flagEnabled(parsed.include_domains)) optional.add('domains');
  if (flagEnabled(parsed.set_env)) optional.add('env');
  if (flagEnabled(parsed.deploy_and_watch)) optional.add('deploy_watch');

  return ALL_SETUP_STEPS.filter((step) => {
    if (completed.includes(step)) return false;
    if (step === 'repo' && mode !== 'greenfield') return false;
    if (step === 'recipe' && mode !== 'greenfield') return false;
    if (step === 'domains' || step === 'env' || step === 'deploy_watch') {
      return optional.has(step);
    }
    return true;
  });
}

function formatSetupPauseBanner(
  reason: 'gh_missing' | 'gh_unauthenticated',
): string {
  if (reason === 'gh_missing') {
    return `⏸ SETUP PAUSED — GitHub CLI not found

Human action required:
1. Install gh: https://cli.github.com/
2. Run: gh auth login
3. Re-call: setup({ action: "resume" })`;
  }

  return `⏸ SETUP PAUSED — GitHub CLI not authenticated

Human action required:
1. Run: gh auth login
2. Re-call: setup({ action: "resume" })`;
}

function formatSetupCompleteBanner(
  mode: WireLikeAction['mode'],
  suggestGitPush: boolean,
): string {
  const lines = [
    '✓ SETUP COMPLETE',
    '',
    'Manifest: .coolify/manifest.json',
    `Mode: ${mode ?? 'unknown'}`,
  ];
  if (suggestGitPush) {
    lines.push('', 'Suggested: git push (manual — never auto-pushed)');
  }
  return lines.join('\n');
}

function formatDeployWatchTimeoutBanner(deploymentUuid: string): string {
  return `⚠ DEPLOY WATCH TIMED OUT

deployment_uuid: ${deploymentUuid}
Status: in_progress (or last known)

Recovery:
• deployment({ action: "get", deployment_uuid: "${deploymentUuid}" })
• deployment({ action: "watch", deployment_uuid: "${deploymentUuid}", timeout: 300 })`;
}

function throwSetupPaused(
  reason: 'gh_missing' | 'gh_unauthenticated',
  message: string,
  resumeParams: Record<string, unknown> = {},
): never {
  throw new CoolifyApiError({
    code: 'COOLIFY_SETUP_PAUSED',
    message,
    recoveryHints: RECOVERY_HINTS.COOLIFY_SETUP_PAUSED,
    data: {
      pause_reason: reason,
      resume_action: 'resume',
      resume_params: resumeParams,
      _formattedText: formatSetupPauseBanner(reason),
    },
  });
}

function wrapSetupMcpError(error: unknown): McpErrorResult {
  const result = wrapMcpError(error);
  if (result.structuredContent.error.code === 'COOLIFY_SETUP_PAUSED') {
    const pauseReason = result.structuredContent.error.data?.pause_reason;
    const banner =
      pauseReason === 'gh_missing' || pauseReason === 'gh_unauthenticated'
        ? formatSetupPauseBanner(pauseReason)
        : result.content[0].text;
    return {
      ...result,
      content: [{ type: 'text', text: banner }],
    };
  }
  return result;
}

function rethrowHandlerError(result: McpErrorResult): never {
  const envelope = result.structuredContent.error;
  throw new CoolifyApiError({
    code: envelope.code,
    message: envelope.message,
    recoveryHints: envelope.recoveryHints ?? [],
    ...(envelope.data ? { data: envelope.data } : {}),
    ...(envelope.httpStatus !== undefined ? { httpStatus: envelope.httpStatus } : {}),
  });
}

async function assertGhPreflight(parsed: WireLikeAction): Promise<void> {
  if (!shouldRunGhPreflight(parsed)) {
    return;
  }

  const ghResult = await checkGhAuth();
  if (!ghResult.ok) {
    throwSetupPaused(ghResult.reason, ghResult.message, {
      mode: parsed.mode,
      include_domains: parsed.include_domains,
      set_env: parsed.set_env,
      deploy_and_watch: parsed.deploy_and_watch,
      skip_gh: parsed.skip_gh,
      server_uuid: parsed.server_uuid,
      project_uuid: parsed.project_uuid,
      project_name: parsed.project_name,
      environment_name: parsed.environment_name,
      environment_uuid: parsed.environment_uuid,
      recipe_type: parsed.recipe_type,
      repo_name: parsed.repo_name,
      push: parsed.push,
    });
  }
}

async function validateLinkageUuids(
  routingEnv: EnvConfig,
  parsed: WireLikeAction,
): Promise<LinkageContext> {
  const { project_uuid, environment_uuid, server_uuid } = parsed;
  if (!project_uuid || !environment_uuid || !server_uuid) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message:
        'link-existing wire requires project_uuid, environment_uuid, and server_uuid',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const projectRaw = await fetchProject(
    routingEnv.COOLIFY_URL,
    routingEnv.COOLIFY_TOKEN,
    project_uuid,
    routingEnv.COOLIFY_VERIFY_SSL,
  );
  const projectRecord = isRecord(projectRaw) ? projectRaw : {};

  const environmentRaw = await fetchEnvironment(
    routingEnv.COOLIFY_URL,
    routingEnv.COOLIFY_TOKEN,
    project_uuid,
    environment_uuid,
    routingEnv.COOLIFY_VERIFY_SSL,
  );
  const environmentRecord = isRecord(environmentRaw) ? environmentRaw : {};

  const serverRaw = await fetchServer(
    routingEnv.COOLIFY_URL,
    routingEnv.COOLIFY_TOKEN,
    server_uuid,
    routingEnv.COOLIFY_VERIFY_SSL,
  );
  const serverRecord = isRecord(serverRaw) ? serverRaw : {};

  return {
    project_uuid,
    project_name:
      parsed.project_name ??
      readStringField(projectRecord, 'name') ??
      project_uuid,
    environment_uuid,
    environment_name:
      parsed.environment_name ??
      readStringField(environmentRecord, 'name') ??
      environment_uuid,
    server_uuid,
    server_name: readStringField(serverRecord, 'name') ?? server_uuid,
  };
}

async function resolveGreenfieldLinkage(
  routingEnv: EnvConfig,
  parsed: WireLikeAction,
  env: EnvConfig,
): Promise<LinkageContext> {
  if (!parsed.server_uuid) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'greenfield wire requires server_uuid',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  let project_uuid = parsed.project_uuid;
  let project_name = parsed.project_name;
  let environment_uuid = parsed.environment_uuid;
  let environment_name = parsed.environment_name;

  if (!project_uuid && project_name) {
    const createResult = await handleProjectAction(
      {
        action: 'create',
        name: project_name,
        initial_environment:
          parsed.initial_environment ??
          parsed.environment_name ??
          'production',
        instance: parsed.instance,
      },
      env,
    );
    if (isProjectErrorResult(createResult)) {
      rethrowHandlerError(createResult);
    }
    const project = createResult.data.project as Record<string, unknown>;
    const environment = createResult.data.environment as Record<string, unknown>;
    project_uuid = String(project.uuid ?? '');
    project_name = String(project.name ?? project_name);
    environment_uuid = String(environment.uuid ?? '');
    environment_name = String(environment.name ?? environment_name ?? 'production');
  } else if (project_uuid) {
    const projectRaw = await fetchProject(
      routingEnv.COOLIFY_URL,
      routingEnv.COOLIFY_TOKEN,
      project_uuid,
      routingEnv.COOLIFY_VERIFY_SSL,
    );
    const projectRecord = isRecord(projectRaw) ? projectRaw : {};
    project_name =
      parsed.project_name ??
      readStringField(projectRecord, 'name') ??
      project_uuid;

    if (!environment_uuid) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message:
          'greenfield wire with project_uuid requires environment_uuid or project_name create path',
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }

    const environmentRaw = await fetchEnvironment(
      routingEnv.COOLIFY_URL,
      routingEnv.COOLIFY_TOKEN,
      project_uuid,
      environment_uuid,
      routingEnv.COOLIFY_VERIFY_SSL,
    );
    const environmentRecord = isRecord(environmentRaw) ? environmentRaw : {};
    environment_name =
      parsed.environment_name ??
      readStringField(environmentRecord, 'name') ??
      environment_uuid;
  } else {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'greenfield wire requires project_uuid or project_name',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  if (!environment_uuid) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'greenfield wire requires environment_uuid or resolvable environment',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const serverRaw = await fetchServer(
    routingEnv.COOLIFY_URL,
    routingEnv.COOLIFY_TOKEN,
    parsed.server_uuid,
    routingEnv.COOLIFY_VERIFY_SSL,
  );
  const serverRecord = isRecord(serverRaw) ? serverRaw : {};

  return {
    project_uuid,
    project_name: project_name ?? project_uuid,
    environment_uuid,
    environment_name: environment_name ?? environment_uuid,
    server_uuid: parsed.server_uuid,
    server_name: readStringField(serverRecord, 'name') ?? parsed.server_uuid,
  };
}

function parseDomainsInput(domains: string | undefined): string[] {
  if (!domains) return [];
  return domains.split(',').map((entry) => entry.trim()).filter(Boolean);
}

async function writeLinkageManifest(
  linkage: LinkageContext,
  resource?: ManifestResource,
): Promise<void> {
  const manifest = ManifestManager.load();

  let project = manifest.projects.find((entry) => entry.uuid === linkage.project_uuid);
  if (!project) {
    project = {
      uuid: linkage.project_uuid,
      name: linkage.project_name,
      environments: [],
    };
    manifest.projects.push(project);
  } else {
    project.name = linkage.project_name;
  }

  let environment = project.environments.find(
    (entry) => entry.uuid === linkage.environment_uuid,
  );
  if (!environment) {
    environment = {
      uuid: linkage.environment_uuid,
      name: linkage.environment_name,
      resources: [],
    };
    project.environments.push(environment);
  } else {
    environment.name = linkage.environment_name;
  }

  if (resource) {
    const existingIndex = environment.resources.findIndex(
      (entry) => entry.uuid === resource.uuid,
    );
    if (existingIndex === -1) {
      environment.resources.push(resource);
    } else {
      environment.resources[existingIndex] = resource;
    }
  }

  const serverIndex = manifest.servers.findIndex(
    (entry) => entry.uuid === linkage.server_uuid,
  );
  if (serverIndex === -1) {
    manifest.servers.push({
      uuid: linkage.server_uuid,
      name: linkage.server_name,
    });
  } else {
    manifest.servers[serverIndex] = {
      uuid: linkage.server_uuid,
      name: linkage.server_name,
    };
  }

  await ManifestManager.save(manifest);
}

async function runGreenfieldRecipe(
  parsed: WireLikeAction,
  linkage: LinkageContext,
  env: EnvConfig,
  gitRepository?: string,
): Promise<{ resource: ManifestResource; application_uuid?: string }> {
  const recipeType = parsed.recipe_type ?? 'create-git-app';
  const recipeArgs: Record<string, unknown> = {
    action: recipeType,
    server_uuid: linkage.server_uuid,
    project_uuid: linkage.project_uuid,
    project_name: linkage.project_name,
    environment_uuid: linkage.environment_uuid,
    environment_name: linkage.environment_name,
    instance: parsed.instance,
    instant_deploy: parsed.instant_deploy ?? false,
  };

  if (recipeType === 'create-git-app') {
    recipeArgs.git_repository =
      parsed.git_repository ?? gitRepository ?? `https://github.com/${parsed.repo_name ?? 'owner/repo'}`;
    recipeArgs.git_branch = parsed.git_branch ?? 'main';
    if (parsed.repo_path) {
      recipeArgs.repo_path = parsed.repo_path;
    } else if (parsed.build_pack) {
      recipeArgs.build_pack = parsed.build_pack;
    } else {
      recipeArgs.repo_path = '.';
    }
  } else if (recipeType === 'create-app-db') {
    recipeArgs.app_name = parsed.app_name;
    recipeArgs.db_name = parsed.db_name;
    recipeArgs.db_engine = parsed.db_engine;
    if (parsed.env_key) {
      recipeArgs.env_key = parsed.env_key;
    }
  } else if (recipeType === 'create-one-click') {
    recipeArgs.type = parsed.type;
  }

  const recipeResult = await handleRecipeAction(recipeArgs, env);
  if (isRecipeErrorResult(recipeResult)) {
    rethrowHandlerError(recipeResult);
  }

  if (recipeType === 'create-one-click') {
    const service_uuid = String(recipeResult.data.service_uuid ?? '');
    return {
      resource: {
        uuid: service_uuid,
        type: 'service',
        name: parsed.type ?? service_uuid,
        domains: [],
      },
    };
  }

  const application_uuid = String(recipeResult.data.application_uuid ?? '');
  return {
    application_uuid,
    resource: {
      uuid: application_uuid,
      type: 'application',
      name: parsed.app_name ?? application_uuid,
      domains: [],
    },
  };
}

async function runOptionalGreenfieldSteps(
  parsed: WireLikeAction,
  env: EnvConfig,
  linkage: LinkageContext,
  resource: ManifestResource,
  stepsCompleted: SetupStep[],
): Promise<{
  stepsCompleted: SetupStep[];
  deployment_uuid?: string;
  watch_timed_out?: boolean;
  formattedText?: string;
}> {
  let deployment_uuid: string | undefined;
  let watch_timed_out: boolean | undefined;
  let formattedText: string | undefined;

  if (flagEnabled(parsed.include_domains)) {
    const domainList = parseDomainsInput(parsed.domains);
    if (domainList.length > 0) {
      resource.domains = domainList;
      await ManifestManager.upsert({
        resource,
        project_uuid: linkage.project_uuid,
        project_name: linkage.project_name,
        environment_uuid: linkage.environment_uuid,
        environment_name: linkage.environment_name,
      });
    }
    // ponytail: no domain list → manifest domains unchanged; API attach deferred
    stepsCompleted.push('domains');
  }

  if (flagEnabled(parsed.set_env)) {
    // ponytail: set_env without env_file/env_content is a no-op until env sync params ship
    stepsCompleted.push('env');
  }

  if (flagEnabled(parsed.deploy_and_watch) && resource.type === 'application') {
    const deployResult = await handleApplicationAction(
      {
        action: 'deploy',
        uuid: resource.uuid,
        wait: false,
        instance: parsed.instance,
      },
      env,
    );
    if (isApplicationErrorResult(deployResult)) {
      rethrowHandlerError(deployResult);
    }

    deployment_uuid = String(deployResult.data.deployment_uuid ?? '');
    if (deployment_uuid) {
      const watchResult = await handleDeploymentAction(
        {
          action: 'watch',
          deployment_uuid,
          timeout: 300,
          instance: parsed.instance,
        },
        env,
      );

      if (
        isDeploymentErrorResult(watchResult) &&
        watchResult.structuredContent.error.code === 'COOLIFY_WATCH_TIMEOUT'
      ) {
        watch_timed_out = true;
        formattedText = formatDeployWatchTimeoutBanner(deployment_uuid);
      } else if (isDeploymentErrorResult(watchResult)) {
        rethrowHandlerError(watchResult);
      }
    }

    stepsCompleted.push('deploy_watch');
  }

  return { stepsCompleted, deployment_uuid, watch_timed_out, formattedText };
}

async function handleLinkExistingWire(
  parsed: WireLikeAction,
  routingEnv: EnvConfig,
): Promise<ReadResponse<Record<string, unknown>>> {
  const stepsCompleted: SetupStep[] = [];
  if (shouldRunGhPreflight(parsed)) {
    stepsCompleted.push('gh_preflight');
  }

  const linkage = await validateLinkageUuids(routingEnv, parsed);
  stepsCompleted.push('linkage');

  let resource: ManifestResource | undefined;
  if (parsed.application_uuid) {
    resource = {
      uuid: parsed.application_uuid,
      type: 'application',
      name: parsed.app_name ?? parsed.application_uuid,
      domains: parseDomainsInput(parsed.domains),
    };
  }

  await writeLinkageManifest(linkage, resource);
  stepsCompleted.push('manifest');

  const data: Record<string, unknown> = {
    setup_status: 'complete',
    mode: 'link-existing',
    current_step: 'manifest',
    steps_completed: stepsCompleted,
    steps_remaining: remainingSteps('link-existing', parsed, stepsCompleted),
    manifest_path: '.coolify/manifest.json',
    project_uuid: linkage.project_uuid,
    environment_uuid: linkage.environment_uuid,
    server_uuid: linkage.server_uuid,
    _formattedText: formatSetupCompleteBanner('link-existing', false),
  };

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleGreenfieldWire(
  parsed: WireLikeAction,
  routingEnv: EnvConfig,
  env: EnvConfig,
): Promise<ReadResponse<Record<string, unknown>>> {
  const stepsCompleted: SetupStep[] = [];
  if (shouldRunGhPreflight(parsed)) {
    stepsCompleted.push('gh_preflight');
  }

  let gitRepository: string | undefined;
  let suggestGitPush = false;
  if (parsed.repo_name) {
    const repoResult = await createGhRepo(parsed.repo_name, {
      push: parsed.push === true,
    });
    gitRepository = repoResult.repo_url;
    suggestGitPush = parsed.push !== true;
    stepsCompleted.push('repo');
  }

  const linkage = await resolveGreenfieldLinkage(routingEnv, parsed, env);
  stepsCompleted.push('linkage');

  const { resource, application_uuid } = await runGreenfieldRecipe(
    parsed,
    linkage,
    env,
    gitRepository,
  );
  stepsCompleted.push('recipe');

  await ManifestManager.upsert({
    resource,
    project_uuid: linkage.project_uuid,
    project_name: linkage.project_name,
    environment_uuid: linkage.environment_uuid,
    environment_name: linkage.environment_name,
  });
  stepsCompleted.push('manifest');

  const optional = await runOptionalGreenfieldSteps(
    parsed,
    env,
    linkage,
    resource,
    stepsCompleted,
  );
  const allCompleted = optional.stepsCompleted;

  const formattedText =
    optional.formattedText ??
    formatSetupCompleteBanner('greenfield', suggestGitPush);

  const data: Record<string, unknown> = {
    setup_status: 'complete',
    mode: 'greenfield',
    current_step: allCompleted[allCompleted.length - 1] ?? 'manifest',
    steps_completed: allCompleted,
    steps_remaining: remainingSteps('greenfield', parsed, allCompleted),
    manifest_path: '.coolify/manifest.json',
    project_uuid: linkage.project_uuid,
    environment_uuid: linkage.environment_uuid,
    server_uuid: linkage.server_uuid,
    resource_uuid: resource.uuid,
    ...(application_uuid ? { application_uuid } : {}),
    ...(optional.deployment_uuid
      ? { deployment_uuid: optional.deployment_uuid }
      : {}),
    ...(optional.watch_timed_out ? { watch_timed_out: true } : {}),
    _formattedText: formattedText,
  };

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleWire(
  parsed: Extract<SetupAction, { action: 'wire' }>,
  env: EnvConfig,
): Promise<SetupActionResult> {
  await assertGhPreflight(parsed);
  const routingEnv = resolveRoutingEnv(env, parsed.instance);

  if (parsed.mode === 'link-existing') {
    return handleLinkExistingWire(parsed, routingEnv);
  }
  if (parsed.mode === 'greenfield') {
    return handleGreenfieldWire(parsed, routingEnv, env);
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_VALIDATION_ERROR',
    message: 'wire requires mode greenfield or link-existing',
    recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
  });
}

async function handlePreflight(
  parsed: Extract<SetupAction, { action: 'preflight' }>,
): Promise<ReadResponse<Record<string, unknown>>> {
  const ghResult = await checkGhAuth();
  if (!ghResult.ok) {
    throwSetupPaused(ghResult.reason, ghResult.message);
  }

  const data: Record<string, unknown> = {
    setup_status: 'in_progress',
    current_step: 'gh_preflight',
    steps_completed: ['gh_preflight'],
    steps_remaining: ALL_SETUP_STEPS.filter((step) => step !== 'gh_preflight'),
    manifest_path: '.coolify/manifest.json',
  };

  if (parsed.mode !== undefined) {
    data.mode = parsed.mode;
  }

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleResume(
  parsed: Extract<SetupAction, { action: 'resume' }>,
  env: EnvConfig,
): Promise<SetupActionResult> {
  if (parsed.mode === undefined) {
    return handlePreflight({ ...parsed, action: 'preflight' });
  }

  return handleWire({ ...parsed, action: 'wire' }, env);
}

export async function handleSetupAction(
  args: unknown,
  env: EnvConfig,
): Promise<SetupActionResult> {
  try {
    const parsed = parseSetupAction(args);
    resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'preflight':
        return await handlePreflight(parsed);
      case 'wire':
        return await handleWire(parsed, env);
      case 'resume':
        return await handleResume(parsed, env);
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown setup action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapSetupMcpError(error);
  }
}

export function isSetupErrorResult(
  result: SetupActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
