import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { fetchProjects } from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import type { FollowUpHint } from '../../utils/diagnose-hints.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const stopAllSchema = z
  .object({
    action: z.literal('stop_all'),
    confirm: z
      .boolean()
      .default(false)
      .describe('Explicit confirmation required'),
    format: z.enum(['pretty', 'json', 'table']).default('pretty').optional(),
    max_chars: z.number().int().positive().default(16000).optional(),
  })
  .strict();

export const redeployProjectSchema = z
  .object({
    action: z.literal('redeploy_project'),
    project_uuid: z.string().optional().describe('Project UUID'),
    project_name: z
      .string()
      .optional()
      .describe('Project name substring (case-insensitive contains-match)'),
    confirm: z
      .boolean()
      .default(false)
      .describe('Explicit confirmation required'),
    force: z
      .boolean()
      .default(false)
      .describe('Force rebuild without cache (mirror P4 application.deploy)'),
    wait: z
      .boolean()
      .default(false)
      .describe(
        'Poll each deployment to terminal — ask the human before enabling',
      ),
    timeout: z
      .number()
      .int()
      .min(10)
      .max(1800)
      .default(300)
      .describe('Per-app wait timeout in seconds'),
    format: z.enum(['pretty', 'json', 'table']).default('pretty').optional(),
    max_chars: z.number().int().positive().default(16000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.project_uuid && !data.project_name) {
      ctx.addIssue({
        code: 'custom',
        message: 'Either project_uuid or project_name must be provided',
        params: { code: 'COOLIFY_422' },
      });
    }
  });

export const restartProjectSchema = z
  .object({
    action: z.literal('restart_project'),
    project_uuid: z.string().optional().describe('Project UUID'),
    project_name: z
      .string()
      .optional()
      .describe('Project name substring (case-insensitive contains-match)'),
    confirm: z
      .boolean()
      .default(false)
      .describe('Explicit confirmation required'),
    format: z.enum(['pretty', 'json', 'table']).default('pretty').optional(),
    max_chars: z.number().int().positive().default(16000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.project_uuid && !data.project_name) {
      ctx.addIssue({
        code: 'custom',
        message: 'Either project_uuid or project_name must be provided',
        params: { code: 'COOLIFY_422' },
      });
    }
  });

export const emergencyToolSchema = z.discriminatedUnion('action', [
  stopAllSchema,
  redeployProjectSchema,
  restartProjectSchema,
]);

export type EmergencyAction = z.infer<typeof emergencyToolSchema>;

export async function validateConfirmGate(
  action: string,
  confirm: boolean,
  apps: Array<{ uuid: string; name: string }>,
): Promise<void> {
  if (confirm === true) return;

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action '${action}' is a destructive bulk operation and requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      would_affect: apps.length,
      sample_uuids: apps.slice(0, 5).map((app) => app.uuid),
      action,
    },
  });
}

export async function resolveProjectUuid(
  project_uuid: string | undefined,
  project_name: string | undefined,
  env: EnvConfig,
): Promise<string> {
  if (project_uuid) {
    return project_uuid;
  }

  const rawProjects = await fetchProjects(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const matched = rawProjects
    .filter(isRecord)
    .filter((project) => {
      const name = project.name;
      return (
        typeof name === 'string' &&
        name.toLowerCase().includes(project_name!.toLowerCase())
      );
    });

  if (matched.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_404',
      message: `No project matched name substring '${project_name}'`,
      recoveryHints: [
        'Verify the project name exists on this Coolify instance.',
      ],
    });
  }

  if (matched.length > 1) {
    throw new CoolifyApiError({
      code: 'COOLIFY_AMBIGUOUS_MATCH',
      message: `Multiple projects matched name substring '${project_name}' — refusing to mutate.`,
      recoveryHints: [
        'Re-run the mutation with an explicit project_uuid.',
        ...matched.map(
          (project) => `- ${String(project.name)} (${String(project.uuid)})`,
        ),
      ],
    });
  }

  return String(matched[0].uuid);
}

export type EmergencyActionResult =
  | ReadResponse<{
      results: Array<{
        uuid: string;
        name?: string;
        status: string;
        deployment_uuid?: string;
        error?: string;
        logs_available?: FollowUpHint;
        hint?: string;
        commit?: string;
        created_at?: string;
        finished_at?: string;
        force?: boolean;
      }>;
    }>
  | McpErrorResult;

export function isEmergencyErrorResult(
  result: EmergencyActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}

export async function handleEmergencyAction(
  _args: EmergencyAction,
  _env: EnvConfig,
): Promise<EmergencyActionResult> {
  return wrapMcpError(new Error('handleEmergencyAction not implemented'));
}
