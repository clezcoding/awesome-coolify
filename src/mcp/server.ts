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
  systemActionSchema,
} from './tools/system.js';

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
