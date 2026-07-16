import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchResources,
  fetchProjects,
  triggerAppStop,
  triggerDeploy,
  triggerAppRestart,
  fetchDeployment,
} from '../../api/client.js';
import { extractDeploymentUuid } from './application.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import { logsAvailableHint } from '../../utils/diagnose-hints.js';
import { pollDeploymentUntilTerminal } from '../../utils/deploy-poll.js';
import { projectDeploymentSummary } from '../../utils/projections.js';
import type { FollowUpHint } from '../../utils/diagnose-hints.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type EmergencyApp = { uuid: string; name: string };

function mapRunningApps(raw: unknown[]): EmergencyApp[] {
  return raw
    .filter(isRecord)
    .filter(
      (record) =>
        record.type === 'application' &&
        typeof record.status === 'string' &&
        record.status.startsWith('running'),
    )
    .map((record) => ({
      uuid: String(record.uuid ?? record.id ?? ''),
      name: String(record.name ?? ''),
    }));
}

function mapProjectApps(raw: unknown[], projectUuid: string): EmergencyApp[] {
  return raw
    .filter(isRecord)
    .filter(
      (record) =>
        record.type === 'application' &&
        isRecord(record.project) &&
        String(record.project.uuid) === projectUuid,
    )
    .map((record) => ({
      uuid: String(record.uuid ?? record.id ?? ''),
      name: String(record.name ?? ''),
    }));
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
  args: EmergencyAction,
  env: EnvConfig,
): Promise<EmergencyActionResult> {
  try {
    const parsed = emergencyToolSchema.parse(args);

    switch (parsed.action) {
      case 'stop_all': {
        const raw = await fetchResources(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        const runningApps = mapRunningApps(raw);
        await validateConfirmGate('stop_all', parsed.confirm, runningApps);

        const results: Array<{
          uuid: string;
          name?: string;
          status: string;
          error?: string;
        }> = [];

        for (const app of runningApps) {
          try {
            await triggerAppStop(
              env.COOLIFY_URL,
              env.COOLIFY_TOKEN,
              app.uuid,
              env.COOLIFY_VERIFY_SSL,
            );
            results.push({
              uuid: app.uuid,
              name: app.name,
              status: 'stopped',
            });
          } catch (error) {
            results.push({
              uuid: app.uuid,
              name: app.name,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        return buildReadResponse(
          { results },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'redeploy_project': {
        const projectUuid = await resolveProjectUuid(
          parsed.project_uuid,
          parsed.project_name,
          env,
        );
        const raw = await fetchResources(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        const projectApps = mapProjectApps(raw, projectUuid);
        await validateConfirmGate(
          'redeploy_project',
          parsed.confirm,
          projectApps,
        );

        const results: Array<{
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
        }> = [];

        for (const app of projectApps) {
          try {
            const deployRaw = await triggerDeploy(
              env.COOLIFY_URL,
              env.COOLIFY_TOKEN,
              app.uuid,
              parsed.force,
              env.COOLIFY_VERIFY_SSL,
            );
            const deploymentUuid = extractDeploymentUuid(deployRaw);

            let entry: (typeof results)[number] = {
              uuid: app.uuid,
              name: app.name,
              deployment_uuid: deploymentUuid,
              status: 'queued',
              force: parsed.force,
              logs_available: logsAvailableHint(deploymentUuid),
            };

            if (parsed.wait && deploymentUuid) {
              const fetcher = async () => {
                const dep = await fetchDeployment(
                  env.COOLIFY_URL,
                  env.COOLIFY_TOKEN,
                  deploymentUuid,
                  env.COOLIFY_VERIFY_SSL,
                );
                return (isRecord(dep) ? dep : {}) as Record<string, unknown>;
              };
              const terminal = await pollDeploymentUntilTerminal(
                fetcher,
                parsed.timeout * 1000,
              );
              const summary = projectDeploymentSummary(terminal);
              entry = {
                uuid: app.uuid,
                name: app.name,
                ...summary,
                logs_available: logsAvailableHint(deploymentUuid),
                ...(summary.status === 'timeout'
                  ? {
                      hint: `Re-call deployment.get with deployment_uuid=${deploymentUuid} to continue polling`,
                    }
                  : {}),
              };
            }

            results.push(entry);
          } catch (error) {
            results.push({
              uuid: app.uuid,
              name: app.name,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        return buildReadResponse(
          { results },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'restart_project': {
        const projectUuid = await resolveProjectUuid(
          parsed.project_uuid,
          parsed.project_name,
          env,
        );
        const raw = await fetchResources(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        const projectApps = mapProjectApps(raw, projectUuid);
        await validateConfirmGate(
          'restart_project',
          parsed.confirm,
          projectApps,
        );

        const results: Array<{
          uuid: string;
          name?: string;
          status: string;
          error?: string;
        }> = [];

        for (const app of projectApps) {
          try {
            await triggerAppRestart(
              env.COOLIFY_URL,
              env.COOLIFY_TOKEN,
              app.uuid,
              env.COOLIFY_VERIFY_SSL,
            );
            results.push({
              uuid: app.uuid,
              name: app.name,
              status: 'requested',
            });
          } catch (error) {
            results.push({
              uuid: app.uuid,
              name: app.name,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        return buildReadResponse(
          { results },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown emergency action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}
