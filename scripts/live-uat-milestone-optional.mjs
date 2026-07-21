#!/usr/bin/env node
/**
 * Live MCP UAT — milestone optional follow-ups:
 * - Phase 9 Test 10: project.create without initial_environment → COOLIFY_422
 * - Phase 13: database backup:list against live Coolify
 *
 * Reads COOLIFY_* from .cursor/mcp.json (project or user). Never prints tokens.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distEntry = resolve(root, 'dist/index.js');

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
    const env = servers[name]?.env;
    if (env?.COOLIFY_URL && env?.COOLIFY_TOKEN) return { name, env, path };
  }
  for (const [name, server] of Object.entries(servers)) {
    const env = server?.env;
    if (env?.COOLIFY_URL && env?.COOLIFY_TOKEN) return { name, env, path };
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

class McpStdioClient {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    child.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString();
      this.drain();
    });
  }

  drain() {
    let i = this.buffer.indexOf('\n');
    while (i !== -1) {
      const line = this.buffer.slice(0, i).trim();
      this.buffer = this.buffer.slice(i + 1);
      if (line) {
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            const h = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            h.resolve(msg);
          }
        } catch {
          /* ignore */
        }
      }
      i = this.buffer.indexOf('\n');
    }
  }

  request(method, params) {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout ${method}`));
      }, 90000);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(t);
          resolve(v);
        },
      });
      this.child.stdin.write(payload);
    });
  }

  notify(method, params) {
    this.child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n',
    );
  }
}

function structured(res) {
  return res?.result?.structuredContent ?? null;
}

function assertPhase9(label, args) {
  const sc = structured(args.res);
  const rpcErr = args.res?.error;
  if (rpcErr?.code === -32602) {
    throw new Error(`${label}: SDK -32602 validation error (expected handler COOLIFY_422)`);
  }
  if (sc?.ok !== false) {
    throw new Error(`${label}: expected ok:false, got ${JSON.stringify(sc?.ok)}`);
  }
  const code = sc?.error?.code;
  if (code !== 'COOLIFY_422') {
    throw new Error(`${label}: expected COOLIFY_422, got ${code}`);
  }
  const hints = sc?.error?.recoveryHints;
  if (!Array.isArray(hints) || hints.length === 0) {
    throw new Error(`${label}: expected non-empty recoveryHints`);
  }
  return { code, hintCount: hints.length, message: sc?.error?.message };
}

async function main() {
  if (!existsSync(distEntry)) {
    console.error('Run npm run build first');
    process.exit(1);
  }

  const resolved = resolveMcpEnv();
  if (!resolved) {
    console.error('No COOLIFY_URL/COOLIFY_TOKEN in mcp.json');
    process.exit(1);
  }

  console.log(`MCP env: server=${resolved.name} url=${resolved.env.COOLIFY_URL}`);

  const child = spawn('node', [distEntry], {
    env: {
      ...process.env,
      ...resolved.env,
      COOLIFY_MCP_LOG: 'error',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const client = new McpStdioClient(child);

  try {
    await client.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'live-uat-optional', version: '1.0' },
    });
    client.notify('notifications/initialized');

    const results = [];

    // Phase 9 — Test 10 missing initial_environment
    const name = `uat-gap-retest-${Date.now()}`;
    const r10a = await client.request('tools/call', {
      name: 'project',
      arguments: { action: 'create', name },
    });
    results.push({
      id: 'phase9-test10-missing',
      pass: true,
      detail: assertPhase9('missing initial_environment', { res: r10a }),
    });

    // Phase 9 — Test 10 empty string
    const r10b = await client.request('tools/call', {
      name: 'project',
      arguments: { action: 'create', name: `${name}-empty`, initial_environment: '' },
    });
    results.push({
      id: 'phase9-test10-empty',
      pass: true,
      detail: assertPhase9('empty initial_environment', { res: r10b }),
    });

    // Phase 13 — find a database UUID
    const listRes = await client.request('tools/call', {
      name: 'resource',
      arguments: { action: 'list', type: 'database' },
    });
    const listSc = structured(listRes);
    if (listSc?.ok !== true) {
      throw new Error(`resource.list database failed: ${JSON.stringify(listSc?.error ?? listRes.error)}`);
    }
    const items = listSc?.data?.items ?? listSc?.data ?? [];
    const dbList = Array.isArray(items) ? items : [];
    const dbUuid = dbList[0]?.uuid;
    if (!dbUuid) {
      throw new Error('No database found on Coolify — cannot run backup:list UAT');
    }

    const backupRes = await client.request('tools/call', {
      name: 'database',
      arguments: { action: 'backup:list', uuid: dbUuid },
    });
    const backupSc = structured(backupRes);
    if (backupSc?.ok !== true) {
      throw new Error(`backup:list failed: ${JSON.stringify(backupSc?.error ?? backupRes.error)}`);
    }
    const schedules = backupSc?.data?.schedules ?? backupSc?.data;
    if (!Array.isArray(schedules)) {
      throw new Error(`backup:list unexpected shape: ${JSON.stringify(backupSc?.data)?.slice(0, 200)}`);
    }

    results.push({
      id: 'phase13-backup-list',
      pass: true,
      detail: {
        database_uuid: dbUuid,
        schedule_count: schedules.length,
        sample_keys:
          schedules[0] && typeof schedules[0] === 'object'
            ? Object.keys(schedules[0]).slice(0, 8)
            : [],
      },
    });

    console.log(JSON.stringify({ status: 'pass', results }, null, 2));
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'fail', error: err.message }));
  process.exit(1);
});
