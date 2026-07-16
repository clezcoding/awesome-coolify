#!/usr/bin/env node
/**
 * Dev/UAT launcher that mimics an MCP host:
 * reads COOLIFY_* from project or user Cursor mcp.json `env`, then runs dist/index.js.
 * Never prints token values.
 *
 * Usage: npm start
 *        node scripts/run-mcp.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distEntry = resolve(root, 'dist/index.js');

const PREFERRED_NAMES = [
  'awesome-coolify-mcp',
  'coolify-mcp',
  'coolify',
];

/**
 * @param {string} path
 * @returns {{ name: string, env: Record<string, string> } | null}
 */
function pickServer(path) {
  if (!existsSync(path)) return null;
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error(`[run-mcp] Invalid JSON: ${path}`);
    return null;
  }
  const servers = cfg.mcpServers ?? {};
  for (const name of PREFERRED_NAMES) {
    const env = servers[name]?.env;
    if (env?.COOLIFY_URL && env?.COOLIFY_TOKEN) {
      return { name, env };
    }
  }
  for (const [name, server] of Object.entries(servers)) {
    const env = server?.env;
    if (env?.COOLIFY_URL && env?.COOLIFY_TOKEN) {
      return { name, env };
    }
  }
  return null;
}

function resolveMcpEnv() {
  const candidates = [
    resolve(root, '.cursor/mcp.json'),
    resolve(homedir(), '.cursor/mcp.json'),
  ];
  for (const path of candidates) {
    const hit = pickServer(path);
    if (hit) {
      return { ...hit, path };
    }
  }
  return null;
}

function main() {
  if (!existsSync(distEntry)) {
    console.error(
      '[run-mcp] Missing dist/index.js — run `npm run build` first.',
    );
    process.exit(1);
  }

  const resolved = resolveMcpEnv();
  if (!resolved) {
    console.error(
      [
        '[run-mcp] No COOLIFY_URL/COOLIFY_TOKEN found in mcp.json.',
        'Checked:',
        `  ${resolve(root, '.cursor/mcp.json')}`,
        `  ${resolve(homedir(), '.cursor/mcp.json')}`,
        '',
        'Add an mcpServers entry with env (same as Cursor), or create a `.env`.',
        'Then: npm start',
      ].join('\n'),
    );
    process.exit(1);
  }

  // Host-style: inject config env; existing process.env wins for overrides.
  const childEnv = {
    ...process.env,
    ...resolved.env,
  };

  // stderr only — stdout is MCP JSON-RPC
  console.error(
    `[run-mcp] Starting coolify-mcp (env from ${resolved.path} → ${resolved.name})`,
  );

  const child = spawn(process.execPath, [distEntry], {
    cwd: root,
    env: childEnv,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main();
