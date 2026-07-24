import * as z from 'zod/v4';
import { createFlatActionSchema } from './shared-read-params.js';

export const MCP_SERVER_NAME = 'awesome-coolify-mcp';
export const MCP_VERSION = '0.1.0';

export const metaActionsCatalog = 'Actions: version()';

export const metaSafetyFooter = 'Safety: read-only meta tool';

export const metaActionSchema = createFlatActionSchema(['version'], {}, { version: [] });

export type MetaAction = z.infer<typeof metaActionSchema>;

export interface MetaVersionResult {
  mcpVersion: string;
  serverName: string;
}

export async function handleMetaAction(
  args: MetaAction,
): Promise<MetaVersionResult> {
  switch (args.action) {
    case 'version':
      return {
        mcpVersion: MCP_VERSION,
        serverName: MCP_SERVER_NAME,
      };
    default: {
      const _exhaustive: never = args;
      throw new Error(`Unknown meta action: ${String(_exhaustive)}`);
    }
  }
}

export function formatMetaResult(result: MetaVersionResult): string {
  return JSON.stringify(result);
}
