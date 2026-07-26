import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import { checkGhAuth } from '../../utils/gh-preflight.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  createFlatActionSchema,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';

export const setupActionsCatalog =
  'Actions: preflight() · wire(mode, ...) · resume(mode?, ...)';

export const setupSafetyFooter =
  'Safety: optional instance · no auto-push · gh soft-pause';

const SETUP_STEPS_AFTER_PREFLIGHT = [
  'repo',
  'linkage',
  'recipe',
  'manifest',
  'domains',
  'env',
  'deploy_watch',
] as const;

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
    server_uuid: z.string().optional().describe('Target server UUID'),
    project_uuid: z.string().optional().describe('Project UUID'),
    project_name: z.string().optional().describe('Project name for lookup'),
    environment_name: z.string().optional().describe('Environment name'),
    environment_uuid: z.string().optional().describe('Environment UUID'),
    recipe_type: z
      .string()
      .optional()
      .describe('Recipe action for greenfield wire'),
    ...sharedReadParamsFlatShape,
  },
  {
    preflight: [],
    wire: [
      'mode',
      'include_domains',
      'set_env',
      'deploy_and_watch',
      'server_uuid',
      'project_uuid',
      'project_name',
      'environment_name',
      'environment_uuid',
      'recipe_type',
      'format',
      'max_chars',
    ],
    resume: [
      'mode',
      'include_domains',
      'set_env',
      'deploy_and_watch',
      'server_uuid',
      'project_uuid',
      'project_name',
      'environment_name',
      'environment_uuid',
      'recipe_type',
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

type PreflightFields = Pick<
  SetupAction,
  'format' | 'max_chars' | 'mode' | 'include_domains' | 'set_env' | 'deploy_and_watch'
>;

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

function throwSetupPaused(
  reason: 'gh_missing' | 'gh_unauthenticated',
  message: string,
): never {
  throw new CoolifyApiError({
    code: 'COOLIFY_SETUP_PAUSED',
    message,
    recoveryHints: RECOVERY_HINTS.COOLIFY_SETUP_PAUSED,
    data: {
      pause_reason: reason,
      resume_action: 'resume',
      resume_params: {},
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

async function runGhPreflight(
  parsed: PreflightFields,
): Promise<ReadResponse<Record<string, unknown>>> {
  const ghResult = await checkGhAuth();

  if (!ghResult.ok) {
    throwSetupPaused(ghResult.reason, ghResult.message);
  }

  const data: Record<string, unknown> = {
    setup_status: 'in_progress',
    current_step: 'gh_preflight',
    steps_completed: ['gh_preflight'],
    steps_remaining: [...SETUP_STEPS_AFTER_PREFLIGHT],
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

async function handlePreflight(
  parsed: Extract<SetupAction, { action: 'preflight' }>,
): Promise<ReadResponse<Record<string, unknown>>> {
  return runGhPreflight(parsed);
}

async function handleResume(
  parsed: Extract<SetupAction, { action: 'resume' }>,
): Promise<ReadResponse<Record<string, unknown>>> {
  return runGhPreflight(parsed);
}

async function handleWire(
  _parsed: Extract<SetupAction, { action: 'wire' }>,
): Promise<never> {
  throw new CoolifyApiError({
    code: 'COOLIFY_NOT_IMPLEMENTED',
    message:
      'setup wire is not yet implemented — use preflight and resume; full wire ships in Plan 22-02.',
    recoveryHints: RECOVERY_HINTS.COOLIFY_NOT_IMPLEMENTED,
  });
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
        return await handleWire(parsed);
      case 'resume':
        return await handleResume(parsed);
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
