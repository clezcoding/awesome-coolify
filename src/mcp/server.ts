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
        'Synthesizes diagnose views for applications and servers, or runs a global fleet scan. Server action triggers validate with a non-blocking side-effect (D-10).',
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
        'Application lifecycle, deploy, and log actions (get, start, stop, restart, deploy, logs) — list via resource tool. Log line content is not masked and may contain secrets printed by the application; do not persist logs to long-term storage.',
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
      annotations: { openWorldHint: true, destructiveHint: true },
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
        'List per-app deployments, get deployment details (status, commit, timestamps, optional capped inline logs), or cancel an in-flight deployment. Cancel on an already-terminal deployment returns { cancelled: false, already_finished: true, status } — no error thrown (D-21).',
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
        'Service lifecycle and deploy actions (get, start, stop, restart, deploy) — list via resource tool',
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
        'Database lifecycle actions (get, start, stop, restart) — list via resource tool',
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
  const server = new McpServer({ name: 'coolify-mcp', version: '0.1.0' });
  registerCoolifyTools(server, env);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
