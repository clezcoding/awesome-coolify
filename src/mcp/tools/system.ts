import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { fetchHealth } from '../../api/client.js';

export const systemActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('health') }),
]);

export type SystemAction = z.infer<typeof systemActionSchema>;

export interface SystemHealthResult {
  connected: true;
  host: string;
}

export async function handleSystemAction(
  args: SystemAction,
  env: EnvConfig,
): Promise<SystemHealthResult> {
  switch (args.action) {
    case 'health': {
      await fetchHealth(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        env.COOLIFY_VERIFY_SSL,
      );
      return {
        connected: true,
        host: new URL(env.COOLIFY_URL).hostname,
      };
    }
    default: {
      const _exhaustive: never = args;
      throw new Error(`Unknown system action: ${String(_exhaustive)}`);
    }
  }
}

export function formatSystemResult(result: SystemHealthResult): string {
  return JSON.stringify(result);
}
