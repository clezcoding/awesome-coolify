import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { EnvConfig } from '../config/env.js';
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
  handleServerAction,
  isServerErrorResult,
  serverActionSchema,
} from './tools/server.js';
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
      inputSchema: systemActionSchema,
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
      inputSchema: resourceActionSchema,
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
      inputSchema: diagnoseToolSchema,
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
        'Application lifecycle, deploy, and log actions (get, start, stop, restart, deploy, logs) — list via resource tool. Full-projection reads mask sensitive keys (password/token/secret/private/env) as *** by default; pass reveal: true to retrieve plaintext only when needed — do not persist revealed secrets. Log line content is not masked and may contain secrets printed by the application; do not persist logs to long-term storage.',
      inputSchema: applicationActionSchema,
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
      inputSchema: emergencyToolSchema,
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
      inputSchema: deploymentToolSchema,
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
        'Service lifecycle and deploy actions (get, start, stop, restart, deploy) — list via resource tool. Full-projection get masks sensitive keys as *** by default; pass reveal: true for plaintext only when needed — do not persist revealed secrets.',
      inputSchema: serviceActionSchema,
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
        'Database lifecycle actions (get, start, stop, restart) — list via resource tool. Full-projection get masks sensitive keys as *** by default; pass reveal: true for plaintext only when needed — do not persist revealed secrets.',
      inputSchema: databaseActionSchema,
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
      inputSchema: privateKeyActionSchema,
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
    'server',
    {
      description:
        'Server CRUD + validate (get, create, update, delete, delete_preview, validate). Servers are listed via resource tool with type=server (D-10). create auto-validates SSH reachability with a 30s poll unless validate:false (D-05/D-06); unreachable hosts return ok:true with validation.reachable:false and a COOLIFY_SSH_UNREACHABLE recovery hint — no auto-rollback (D-07). validate uses the same wait/timeout model (D-08). delete requires confirm:true (D-14) and defaults delete_volumes:false (D-16). delete_preview lists child resources as a warning, not a block (D-16).',
      inputSchema: serverActionSchema,
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
