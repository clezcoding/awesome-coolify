import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { CoolifyApiError, RECOVERY_HINTS } from '../utils/errors.js';

const envSchema = z.object({
  COOLIFY_URL: z.string().url().optional(),
  COOLIFY_TOKEN: z.string().min(1).optional(),
  COOLIFY_VERIFY_SSL: z
    .preprocess((val) => val !== 'false', z.boolean())
    .default(true),
  COOLIFY_MCP_LOG: z.enum(['debug', 'info', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/** Keys the server needs from process env / .env / host mcp.json `env`. */
export const COOLIFY_ENV_KEYS = [
  'COOLIFY_URL',
  'COOLIFY_TOKEN',
  'COOLIFY_VERIFY_SSL',
  'COOLIFY_MCP_LOG',
] as const;

/**
 * Parse a dotenv-style file. Does not support multiline values.
 * Exported for unit tests.
 */
export function parseDotEnv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Fill missing keys from a .env file. Existing process.env values win
 * (same as hosts injecting mcp.json `env` — never override the host).
 */
export function mergeDotEnv(
  source: NodeJS.ProcessEnv,
  filePath: string = resolve(process.cwd(), '.env'),
): NodeJS.ProcessEnv {
  if (!existsSync(filePath)) return source;
  let parsed: Record<string, string>;
  try {
    parsed = parseDotEnv(readFileSync(filePath, 'utf8'));
  } catch {
    return source;
  }
  const merged: NodeJS.ProcessEnv = { ...source };
  for (const [key, value] of Object.entries(parsed)) {
    if (merged[key] === undefined || merged[key] === '') {
      merged[key] = value;
    }
  }
  return merged;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): EnvConfig {
  // Only auto-load .env when callers use the real process.env (host/CLI).
  // Unit tests pass plain objects and must not touch the filesystem.
  const resolved = source === process.env ? mergeDotEnv(process.env) : source;
  const parsed = envSchema.parse(resolved);

  const hasUrl = Boolean(parsed.COOLIFY_URL);
  const hasToken = Boolean(parsed.COOLIFY_TOKEN);
  if (hasUrl !== hasToken) {
    throw new CoolifyApiError({
      code: 'COOLIFY_PARTIAL_ENV',
      message:
        'Partial environment configuration: both COOLIFY_URL and COOLIFY_TOKEN must be set, or neither',
      recoveryHints: RECOVERY_HINTS.COOLIFY_PARTIAL_ENV,
    });
  }

  return parsed;
}

export function formatEnvLoadHint(error: unknown): string {
  const base =
    error instanceof Error ? error.message : String(error);
  return [
    base,
    '',
    'COOLIFY_URL and COOLIFY_TOKEN are optional for soft-start (D-18).',
    'When both are set, they override the registry default at call time.',
    'When neither is set, use the instance tool: instance.add or instance.import-env.',
    'Ways to provide credentials (same contract as production MCP hosts):',
    '  1. IDE/host mcp.json `env` block (Cursor/Claude/Codex) — preferred',
    '  2. Project `.env` file (see .env.example) — for bare CLI',
    '  3. instance.add / instance.import-env — persists to ~/.coolify-mcp/instances.json',
  ].join('\n');
}
