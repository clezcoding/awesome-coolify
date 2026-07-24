import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { EnvConfig } from '../config/env.js';
import { withInstanceRoutingSchema } from './tools/shared-read-params.js';
import {
  formatMetaResult,
  handleMetaAction,
  metaActionSchema,
  metaActionsCatalog,
  metaSafetyFooter,
} from './tools/meta.js';
import {
  formatSystemResult,
  handleSystemAction,
  isMcpErrorResult,
  type InfrastructureOverviewResult,
  systemActionSchema,
  systemActionsCatalog,
  systemSafetyFooter,
} from './tools/system.js';
import {
  handleResourceAction,
  isResourceErrorResult,
  resourceActionSchema,
  resourceActionsCatalog,
  resourceSafetyFooter,
} from './tools/resource.js';
import {
  handleApplicationAction,
  isApplicationErrorResult,
  applicationActionSchema,
  applicationActionsCatalog,
  applicationSafetyFooter,
} from './tools/application.js';
import {
  handleServiceAction,
  isServiceErrorResult,
  serviceActionSchema,
  serviceActionsCatalog,
  serviceSafetyFooter,
} from './tools/service.js';
import {
  handleDatabaseAction,
  isDatabaseErrorResult,
  databaseActionSchema,
  databaseActionsCatalog,
  databaseSafetyFooter,
} from './tools/database.js';
import {
  handlePrivateKeyAction,
  isPrivateKeyErrorResult,
  privateKeyActionSchema,
  privateKeyActionsCatalog,
  privateKeySafetyFooter,
} from './tools/private_key.js';
import {
  handleInstanceAction,
  isInstanceErrorResult,
  instanceActionSchema,
  instanceActionsCatalog,
  instanceSafetyFooter,
} from './tools/instance.js';
import {
  handleManifestAction,
  isManifestErrorResult,
  manifestActionSchema,
  manifestActionsCatalog,
  manifestSafetyFooter,
} from './tools/manifest.js';
import {
  handleServerAction,
  isServerErrorResult,
  serverActionSchema,
  serverActionsCatalog,
  serverSafetyFooter,
} from './tools/server.js';
import {
  handleProjectAction,
  isProjectErrorResult,
  projectActionSchema,
  projectActionsCatalog,
  projectSafetyFooter,
} from './tools/project.js';
import {
  handleEnvironmentAction,
  isEnvironmentErrorResult,
  environmentActionSchema,
  environmentActionsCatalog,
  environmentSafetyFooter,
} from './tools/environment.js';
import {
  handleDocsAction,
  docsActionSchema,
  docsActionsCatalog,
  docsSafetyFooter,
} from './tools/docs.js';
import {
  handleDiagnoseAction,
  isDiagnoseErrorResult,
  diagnoseToolSchema,
  diagnoseActionsCatalog,
  diagnoseSafetyFooter,
} from './tools/diagnose.js';
import {
  handleDeploymentAction,
  isDeploymentErrorResult,
  deploymentToolSchema,
  deploymentActionsCatalog,
  deploymentSafetyFooter,
} from './tools/deployment.js';
import {
  handleEmergencyAction,
  isEmergencyErrorResult,
  emergencyToolSchema,
  emergencyActionsCatalog,
  emergencySafetyFooter,
} from './tools/emergency.js';
import { registerCoolifyPrompts } from './prompts.js';

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

function composeToolDescription(
  purpose: string,
  catalog: string,
  footer: string,
): string {
  return `${purpose}\n${catalog}\n${footer}`;
}

export function registerCoolifyTools(
  server: McpServer,
  env: EnvConfig,
): void {
  server.registerTool(
    'system',
    {
      description: composeToolDescription(
        'System actions for Coolify (health, version, verify, infrastructure_overview).',
        systemActionsCatalog,
        systemSafetyFooter,
      ),
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
      description: composeToolDescription(
        'MCP server metadata (version).',
        metaActionsCatalog,
        metaSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Unified resource listing and cross-type discovery.',
        resourceActionsCatalog,
        resourceSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Synthesizes diagnose views for applications and servers, or runs a global fleet scan.',
        diagnoseActionsCatalog,
        diagnoseSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Application lifecycle, deploy, log, and environment-variable actions — list via resource tool.',
        applicationActionsCatalog,
        applicationSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Emergency and bulk operations (stop_all, redeploy_project, restart_project).',
        emergencyActionsCatalog,
        emergencySafetyFooter,
      ),
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
      description: composeToolDescription(
        'List per-app deployments, get deployment details, or cancel an in-flight deployment.',
        deploymentActionsCatalog,
        deploymentSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Service CRUD, lifecycle, and environment-variable actions — list via resource tool.',
        serviceActionsCatalog,
        serviceSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Database CRUD, lifecycle, env vars, and backup-schedule actions — list via resource tool.',
        databaseActionsCatalog,
        databaseSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Private key CRUD for SSH keys registered in Coolify.',
        privateKeyActionsCatalog,
        privateKeySafetyFooter,
      ),
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
      description: composeToolDescription(
        'Multi-instance registry CRUD for ~/.coolify-mcp/instances.json.',
        instanceActionsCatalog,
        instanceSafetyFooter,
      ),
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
    'manifest',
    {
      description: composeToolDescription(
        'Local manifest cache CRUD and sync/diff for .coolify/manifest.json.',
        manifestActionsCatalog,
        manifestSafetyFooter,
      ),
      inputSchema: manifestActionSchema,
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleManifestAction(args, env);
      if (isManifestErrorResult(result)) {
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
      description: composeToolDescription(
        'Server CRUD and validate — servers listed via resource tool with type=server.',
        serverActionsCatalog,
        serverSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Project CRUD for Coolify organizational containers.',
        projectActionsCatalog,
        projectSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Environment CRUD scoped to a parent project — no update action.',
        environmentActionsCatalog,
        environmentSafetyFooter,
      ),
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
      description: composeToolDescription(
        'Search static Coolify documentation guides.',
        docsActionsCatalog,
        docsSafetyFooter,
      ),
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
  const server = new McpServer({
    name: 'awesome-coolify-mcp',
    version: '0.1.0',
    title: 'Awesome Coolify',
    description:
      'MCP server for Coolify 4.1.x — deploy, diagnose, and CRUD for keys, servers, projects, and environments via action-based tools',
    websiteUrl: 'https://github.com/clezcoding/awesome-coolify',
    icons: [
      {
        src: 'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png',
        mimeType: 'image/png',
        sizes: ['192x192'],
      },
    ],
  });
  registerCoolifyTools(server, env);
  registerCoolifyPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
