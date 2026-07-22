import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { EnvConfig } from '../config/env.js';
import { withInstanceRoutingSchema } from './tools/shared-read-params.js';
import {
  formatMetaResult,
  handleMetaAction,
  metaActionSchema,
} from './tools/meta.js';
import {
  formatSystemResult,
  handleSystemAction,
  isMcpErrorResult,
  type InfrastructureOverviewResult,
  systemActionSchema,
} from './tools/system.js';
import {
  handleResourceAction,
  isResourceErrorResult,
  resourceActionSchema,
} from './tools/resource.js';
import {
  handleApplicationAction,
  isApplicationErrorResult,
  applicationActionSchema,
} from './tools/application.js';
import {
  handleServiceAction,
  isServiceErrorResult,
  serviceActionSchema,
} from './tools/service.js';
import {
  handleDatabaseAction,
  isDatabaseErrorResult,
  databaseActionSchema,
} from './tools/database.js';
import {
  handlePrivateKeyAction,
  isPrivateKeyErrorResult,
  privateKeyActionSchema,
} from './tools/private_key.js';
import {
  handleInstanceAction,
  isInstanceErrorResult,
  instanceActionSchema,
} from './tools/instance.js';
import {
  handleServerAction,
  isServerErrorResult,
  serverActionSchema,
} from './tools/server.js';
import {
  handleProjectAction,
  isProjectErrorResult,
  projectActionSchema,
} from './tools/project.js';
import {
  handleEnvironmentAction,
  isEnvironmentErrorResult,
  environmentActionSchema,
} from './tools/environment.js';
import {
  handleDocsAction,
  docsActionSchema,
} from './tools/docs.js';
import {
  handleDiagnoseAction,
  isDiagnoseErrorResult,
  diagnoseToolSchema,
} from './tools/diagnose.js';
import {
  handleDeploymentAction,
  isDeploymentErrorResult,
  deploymentToolSchema,
} from './tools/deployment.js';
import {
  handleEmergencyAction,
  isEmergencyErrorResult,
  emergencyToolSchema,
} from './tools/emergency.js';

function isInfrastructureOverviewResult(
  result: unknown,
): result is InfrastructureOverviewResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'ok' in result &&
    (result as InfrastructureOverviewResult).ok === true &&
    '_meta' in result &&
    '_formattedText' in result &&
    'data' in result
  );
}

export const toolOutputSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      hint: z.string().optional(),
      // Confirm-gate / CoolifyApiError envelope fields — required so Cursor's
      // outputSchema validation (additionalProperties:false) accepts previews.
      recoveryHints: z.array(z.string()).optional(),
      httpStatus: z.number().optional(),
      data: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  _meta: z
    .object({
      truncated: z.boolean(),
      chars: z.number(),
      max_chars: z.number(),
      page: z.number().optional(),
      per_page: z.number().optional(),
      total: z.number().optional(),
      envOverride: z.boolean().optional(),
    })
    .optional(),
  _formattedText: z.string().optional(),
  _size_warning: z.string().optional(),
});

export function registerCoolifyTools(
  server: McpServer,
  env: EnvConfig,
): void {
  server.registerTool(
    'system',
    {
      description: 'System actions for Coolify (health, version, verify)',
      inputSchema: withInstanceRoutingSchema(systemActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true, readOnlyHint: true },
    },
    async (args) => {
      const result = await handleSystemAction(args, env);
      if (isMcpErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      if (isInfrastructureOverviewResult(result)) {
        return {
          content: [{ type: 'text', text: result._formattedText }],
          structuredContent: {
            ok: true,
            data: result.data,
            _meta: result._meta,
          },
        };
      }
      const text = formatSystemResult(result);
      return {
        content: [{ type: 'text', text }],
        structuredContent: { ok: true, data: result },
      };
    },
  );

  server.registerTool(
    'meta',
    {
      description: 'MCP server metadata (version)',
      inputSchema: metaActionSchema,
      outputSchema: toolOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const result = await handleMetaAction(args);
      const text = formatMetaResult(result);
      return {
        content: [{ type: 'text', text }],
        structuredContent: { ok: true, data: result },
      };
    },
  );

  server.registerTool(
    'resource',
    {
      description: 'Unified resource listing and cross-type discovery',
      inputSchema: withInstanceRoutingSchema(resourceActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true, readOnlyHint: true },
    },
    async (args) => {
      const result = await handleResourceAction(args, env);
      if (isResourceErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'diagnose',
    {
      description:
        'Synthesizes diagnose views for applications and servers, or runs a global fleet scan. Full-projection app diagnose masks sensitive keys in raw_application as *** by default; pass reveal: true for plaintext only when needed — do not persist revealed secrets. Server action triggers validate with a non-blocking side-effect (D-10).',
      inputSchema: withInstanceRoutingSchema(diagnoseToolSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleDiagnoseAction(args, env);
      if (isDiagnoseErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'application',
    {
      description:
        'Application lifecycle, deploy, log, and environment-variable actions (get, start, stop, restart, deploy, logs, envs:list, envs:get, envs:create, envs:update, envs:delete, envs:bulk-update, envs:sync) — list via resource tool. envs:delete, envs:bulk-update, and envs:sync apply/prune require confirm:true. envs:sync accepts XOR env_file|env_content; dry_run defaults false (apply); optional prune with confirm; conflict_policy overwrite|keep_remote|abort when values conflict (abort skips conflicted keys only — other writes still apply). Env values masked as *** by default; pass reveal:true only after asking the human — do not persist revealed secrets. Log line content is not masked and may contain secrets printed by the application; do not persist logs to long-term storage.',
      inputSchema: withInstanceRoutingSchema(applicationActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleApplicationAction(args, env);
      if (isApplicationErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'emergency',
    {
      description:
        'Emergency and bulk operations (stop_all, redeploy_project, restart_project). High-impact destructive actions — require explicit confirm: true to execute. Call without confirm first to preview would_affect and sample_uuids; ask the human before retrying with confirm: true. Always ask the human before setting wait: true on redeploy_project.',
      inputSchema: withInstanceRoutingSchema(emergencyToolSchema),
      outputSchema: toolOutputSchema,
      // Note: omit destructiveHint — Cursor agent host currently drops tools
      // with destructiveHint:true from the exposed tool list (lease stays at 9).
      // Safety remains via confirm gate + description wording.
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleEmergencyAction(args, env);
      if (isEmergencyErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'deployment',
    {
      description:
        'List per-app deployments, get deployment details (status, commit, timestamps, optional capped inline logs), or cancel an in-flight deployment. Full-projection get masks sensitive keys as *** by default; pass reveal: true for plaintext only when needed — do not persist revealed secrets. Cancel on an already-terminal deployment returns { cancelled: false, already_finished: true, status } — no error thrown (D-21).',
      inputSchema: withInstanceRoutingSchema(deploymentToolSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleDeploymentAction(args, env);
      if (isDeploymentErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'service',
    {
      description:
        'Service CRUD, lifecycle, and environment-variable actions (get, start, stop, restart, deploy, create, update, delete, delete_preview, envs:list, envs:get, envs:create, envs:update, envs:delete, envs:bulk-update) — list via resource tool. Local .env sync is application-only (not on service). envs:delete and envs:bulk-update require confirm:true. Env values masked as *** by default; pass reveal:true only after asking the human — do not persist revealed secrets. create: one-click type XOR compose/compose_file; instant_deploy defaults true. update: curated fields + transparent compose I/O; HTTP 409 domain conflicts include recovery hint to retry with force_domain_override: true. delete requires confirm: true with safe defaults (delete_volumes/delete_configurations/docker_cleanup/delete_connected_networks default false). Full-projection get/update masks sensitive keys as *** by default; pass reveal: true for plaintext only when needed — do not persist revealed secrets.',
      inputSchema: withInstanceRoutingSchema(serviceActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleServiceAction(args, env);
      if (isServiceErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'database',
    {
      description:
        'Database CRUD, lifecycle, environment-variable, and backup-schedule actions (get, start, stop, restart, create, update, delete, delete_preview, envs:list, envs:get, envs:create, envs:update, envs:delete, envs:bulk-update, backup:create, backup:list, backup:update, backup:delete, backup:now, backup:history) — list via resource tool. Local .env sync is application-only (not on database). Database envs:* omit is_preview (OpenAPI Pitfall 1). envs:delete and envs:bulk-update require confirm:true. Env values masked as *** by default; pass reveal:true only after asking the human — do not persist revealed secrets. backup:delete requires confirm:true; delete_s3 defaults false and delete_s3:true still requires confirm. backup:create frequency accepts OpenAPI presets or cron; backup:update frequency accepts presets only — cron on update returns COOLIFY_VALIDATION_ERROR. backup:now triggers immediate backup via PATCH with backup_now:true and requires scheduled_backup_uuid. Backup config S3 credentials masked as *** by default; pass reveal:true only after asking the human — do not persist revealed secrets. create: 8 engines via engine discriminator; instant_deploy defaults true. update: curated engine-specific fields; is_public: true requires confirm: true. delete requires confirm: true with safe defaults (delete_volumes/delete_configurations/docker_cleanup/delete_connected_networks default false). Full-projection get/create/update masks credentials and connection strings as *** by default; pass reveal: true for plaintext only when needed — do not persist revealed secrets.',
      inputSchema: withInstanceRoutingSchema(databaseActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleDatabaseAction(args, env);
      if (isDatabaseErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'private_key',
    {
      description:
        'Private key CRUD (list, get, create, update, delete, delete_preview) for SSH keys registered in Coolify. PEM material is never returned by any action — full projection masks the private_key field even with reveal:true (D-02). list accepts reveal on the schema but rejects reveal:true at the handler with COOLIFY_422 (D-11) — PEM material is never returned. delete requires confirm:true (D-14); deleting a key still referenced by servers returns COOLIFY_409 with dependent_server_uuids (D-15). delete_preview lists dependents without deleting.',
      inputSchema: withInstanceRoutingSchema(privateKeyActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handlePrivateKeyAction(args, env);
      if (isPrivateKeyErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'instance',
    {
      description:
        'Multi-instance registry CRUD (list, get, add, update, delete, set-default, import-env, cloud-info) for ~/.coolify-mcp/instances.json. Tokens masked as *** unless reveal:true — do not persist revealed secrets. delete requires confirm:true; deleting the default or last instance requires force:true. import-env opt-in copies COOLIFY_URL+COOLIFY_TOKEN from process env — never auto-run. cloud-info is local/static discovery (isCloud, resolved url, source, setupHints, knownLimits, docsLink) — no live API probe. No instance routing param on other actions — ops always target the local registry file (D-03).',
      inputSchema: instanceActionSchema,
      outputSchema: toolOutputSchema,
    },
    async (args) => {
      const result = await handleInstanceAction(args, env);
      if (isInstanceErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'server',
    {
      description:
        'Server CRUD + validate (get, create, update, delete, delete_preview, validate). Servers are listed via resource tool with type=server (D-10). create auto-validates SSH reachability with a 30s poll unless validate:false (D-05/D-06); unreachable hosts return ok:true with validation.reachable:false and a COOLIFY_SSH_UNREACHABLE recovery hint — no auto-rollback (D-07). validate uses the same wait/timeout model (D-08). delete requires confirm:true (D-14) and defaults delete_volumes:false (D-16). delete_preview lists child resources as a warning, not a block (D-16).',
      inputSchema: withInstanceRoutingSchema(serverActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleServerAction(args, env);
      if (isServerErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'project',
    {
      description:
        'Project CRUD (list, get, create, update, delete, delete_preview) for Coolify organizational containers. create requires initial_environment (required — no default; agent must ask user for production vs custom name per D-09/D-10) — missing/empty → COOLIFY_422 with recovery hint; response returns { project, environment, environments? } (D-11); the auto-spawned production env is never auto-deleted. get/update/delete/delete_preview accept uuid XOR name; name multi-match → COOLIFY_AMBIGUOUS_MATCH (D-14). delete requires confirm:true (D-05); deleting a project with remaining environments returns COOLIFY_409 with environment_uuids — no force/cascade (D-07). delete_preview lists blockers without deleting (D-08).',
      inputSchema: withInstanceRoutingSchema(projectActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleProjectAction(args, env);
      if (isProjectErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'environment',
    {
      description:
        'Environment CRUD (list, get, create, delete, delete_preview) scoped to a parent project — no update action (Coolify API has no PATCH). list accepts project_uuid XOR project_name; name multi-match → COOLIFY_AMBIGUOUS_MATCH (D-12). get/delete accept uuid XOR name within the parent project scope (D-13). create with a duplicate name returns COOLIFY_409 with a recovery hint (D-15). delete requires confirm:true (D-05); deleting a non-empty environment (has apps/services/databases) returns COOLIFY_409 with child_resource_uuids — no force/cascade (D-06). delete_preview lists child resources without deleting (D-08).',
      inputSchema: withInstanceRoutingSchema(environmentActionSchema),
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleEnvironmentAction(args, env);
      if (isEnvironmentErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );

  server.registerTool(
    'docs',
    {
      description: 'Search static Coolify documentation guides',
      inputSchema: docsActionSchema,
      outputSchema: toolOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const result = await handleDocsAction(args);
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );
}

export async function createAndConnectServer(
  env: EnvConfig,
): Promise<McpServer> {
  const server = new McpServer({ name: 'awesome-coolify-mcp', version: '0.1.0' });
  registerCoolifyTools(server, env);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
