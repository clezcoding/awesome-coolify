import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { EnvConfig } from '../config/env.js';
import {
  formatSystemResult,
  handleSystemAction,
  isMcpErrorResult,
  systemActionSchema,
} from './tools/system.js';

export async function createAndConnectServer(env: EnvConfig): Promise<McpServer> {
  const server = new McpServer({ name: 'coolify-mcp', version: '0.1.0' });

  server.registerTool(
    'system',
    {
      description: 'System actions for Coolify (health, version, verify)',
      inputSchema: systemActionSchema,
    },
    async (args) => {
      const result = await handleSystemAction(args, env);
      if (isMcpErrorResult(result)) {
        return result;
      }
      const text = formatSystemResult(result);
      return {
        content: [{ type: 'text', text }],
        structuredContent: result,
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
