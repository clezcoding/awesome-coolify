#!/usr/bin/env node
/**
 * Live UAT harness — declarative matrix, credential resolution, identity gate.
 * Maintainer-local only; never prints COOLIFY_TOKEN.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, env, exit, stderr, stdout } from 'node:process';

if (!env.TSX_ACTIVE) {
  const result = spawnSync('npx', ['tsx', ...argv.slice(1)], {
    stdio: 'inherit',
    env: { ...env, TSX_ACTIVE: 'true' },
  });
  exit(result.status ?? 0);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const matrixPath = resolve(root, 'scripts/live-uat.matrix.json');

const PREFERRED_NAMES = ['awesome-coolify-mcp', 'coolify-mcp', 'coolify'];

function pickServer(path) {
  if (!existsSync(path)) return null;
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
  const servers = cfg.mcpServers ?? {};
  for (const name of PREFERRED_NAMES) {
    const serverEnv = servers[name]?.env;
    if (serverEnv?.COOLIFY_URL && serverEnv?.COOLIFY_TOKEN) {
      return { name, env: serverEnv, path };
    }
  }
  for (const [name, server] of Object.entries(servers)) {
    const serverEnv = server?.env;
    if (serverEnv?.COOLIFY_URL && serverEnv?.COOLIFY_TOKEN) {
      return { name, env: serverEnv, path };
    }
  }
  return null;
}

function resolveMcpEnv() {
  for (const path of [
    resolve(root, '.cursor/mcp.json'),
    resolve(homedir(), '.cursor/mcp.json'),
  ]) {
    const hit = pickServer(path);
    if (hit) return hit;
  }
  return null;
}

function createRedactor(token) {
  return function redact(value) {
    if (!token) return value;
    if (typeof value === 'string') {
      return value.includes(token) ? value.split(token).join('***') : value;
    }
    if (Array.isArray(value)) {
      return value.map((entry) => redact(entry));
    }
    if (value && typeof value === 'object') {
      const copy = {};
      for (const [key, entry] of Object.entries(value)) {
        copy[key] = redact(entry);
      }
      return copy;
    }
    return value;
  };
}

function writeJson(stream, payload, redact) {
  const text = JSON.stringify(redact(payload));
  stream.write(`${text}\n`);
}

function abortSetup(error, redact) {
  writeJson(stderr, { status: 'setup-abort', error }, redact);
  exit(2);
}

function substitutePlaceholders(value, uatProjectUuid) {
  if (value === 'UAT_PROJECT_UUID_PLACEHOLDER') {
    return uatProjectUuid;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => substitutePlaceholders(entry, uatProjectUuid));
  }
  if (value && typeof value === 'object') {
    const copy = {};
    for (const [key, entry] of Object.entries(value)) {
      copy[key] = substitutePlaceholders(entry, uatProjectUuid);
    }
    return copy;
  }
  return value;
}

function loadMatrix(uatProjectUuid) {
  const raw = readFileSync(matrixPath, 'utf8');
  const rows = JSON.parse(raw);
  return rows.map((row) => ({
    ...row,
    args: substitutePlaceholders(row.args ?? {}, uatProjectUuid),
  }));
}

/** Downstream runner plans consume this state object. */
export const uatState = {
  cli: null,
  routingEnv: null,
  matrix: null,
  redact: null,
  toolsCovered: 0,
};

// TODO(18-02): stdio runner — McpStdioClient + tools/call dispatch
// TODO(18-02): in-process runner — handler map + row execution
// TODO(18-03): JSON/Markdown report writers + v3_gaps detection

async function main() {
  const uatProjectUuid = env.UAT_PROJECT_UUID?.trim();
  if (!uatProjectUuid) {
    abortSetup('UAT_PROJECT_UUID_REQUIRED', createRedactor(''));
  }

  const { z } = await import('zod');
  const { InstanceManager } = await import('../src/utils/instance-registry.ts');
  const { handleProjectAction, isProjectErrorResult } = await import(
    '../src/mcp/tools/project.ts'
  );

  const cliSchema = z.object({
    write: z.boolean().default(false),
    confirmDestructive: z.boolean().default(false),
    full: z.boolean().default(false),
    out: z.string().optional(),
  });

  function parseCliArgs(rawArgv) {
    const parsed = {
      write: false,
      confirmDestructive: false,
      full: false,
      out: undefined,
    };

    for (let i = 0; i < rawArgv.length; i++) {
      const arg = rawArgv[i];
      if (arg === '--write') {
        parsed.write = true;
        continue;
      }
      if (arg === '--confirm-destructive') {
        parsed.confirmDestructive = true;
        continue;
      }
      if (arg === '--full') {
        parsed.full = true;
        continue;
      }
      if (arg === '--out') {
        const next = rawArgv[i + 1];
        if (!next || next.startsWith('-')) {
          throw new Error('--out requires a path');
        }
        parsed.out = next;
        i += 1;
        continue;
      }
      if (arg.startsWith('-')) {
        throw new Error(`Unknown flag: ${arg}`);
      }
    }

    return cliSchema.parse(parsed);
  }

  function resolveRoutingEnv() {
    const mcpHit = resolveMcpEnv();
    if (mcpHit) {
      return {
        ...env,
        COOLIFY_URL: mcpHit.env.COOLIFY_URL,
        COOLIFY_TOKEN: mcpHit.env.COOLIFY_TOKEN,
        COOLIFY_VERIFY_SSL: mcpHit.env.COOLIFY_VERIFY_SSL ?? 'true',
      };
    }

    const envUrl = env.COOLIFY_URL?.trim();
    const envToken = env.COOLIFY_TOKEN?.trim();
    if (envUrl && envToken) {
      return { ...env };
    }

    try {
      const creds = InstanceManager.resolveCredentials(undefined, env);
      return {
        ...env,
        COOLIFY_URL: creds.url,
        COOLIFY_TOKEN: creds.token,
        COOLIFY_VERIFY_SSL: creds.verifySsl ? 'true' : 'false',
      };
    } catch {
      return null;
    }
  }

  let cli;
  try {
    cli = parseCliArgs(argv.slice(2));
  } catch (error) {
    const redact = createRedactor('');
    abortSetup(
      error instanceof Error ? error.message : 'Invalid CLI arguments',
      redact,
    );
  }

  const routingEnv = resolveRoutingEnv();
  const redact = createRedactor(routingEnv?.COOLIFY_TOKEN ?? '');

  if (!routingEnv?.COOLIFY_URL || !routingEnv?.COOLIFY_TOKEN) {
    abortSetup('COOLIFY_NO_INSTANCE', redact);
  }

  const projectResult = await handleProjectAction(
    { action: 'get', uuid: uatProjectUuid },
    routingEnv,
  );
  if (isProjectErrorResult(projectResult)) {
    abortSetup('UAT_PROJECT_UUID_MISMATCH', redact);
  }

  const matrix = loadMatrix(uatProjectUuid);
  const toolsCovered = new Set(
    matrix.map((row) => row.tool).filter((tool) => tool !== 'tools/list'),
  ).size;

  uatState.cli = cli;
  uatState.routingEnv = routingEnv;
  uatState.matrix = matrix;
  uatState.redact = redact;
  uatState.toolsCovered = toolsCovered;

  writeJson(
    stdout,
    {
      status: 'skeleton-ready',
      rows: matrix.length,
      toolsCovered,
    },
    redact,
  );
}

main().catch(async (error) => {
  let token = env.COOLIFY_TOKEN ?? '';
  try {
    const mcpHit = resolveMcpEnv();
    if (mcpHit?.env?.COOLIFY_TOKEN) {
      token = mcpHit.env.COOLIFY_TOKEN;
    }
  } catch {
    /* ignore */
  }
  abortSetup(error instanceof Error ? error.message : 'UAT harness failed', createRedactor(token));
});
