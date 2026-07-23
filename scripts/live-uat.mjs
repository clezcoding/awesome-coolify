#!/usr/bin/env node
/**
 * Live UAT harness — declarative matrix, credential resolution, identity gate.
 * Maintainer-local only; never prints COOLIFY_TOKEN.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

const REGISTERED_TOOLS = [
  'system',
  'meta',
  'resource',
  'diagnose',
  'application',
  'emergency',
  'deployment',
  'service',
  'database',
  'private_key',
  'instance',
  'manifest',
  'server',
  'project',
  'environment',
  'docs',
];

const STDIO_REQUEST_TIMEOUT_MS = 30_000;

/** Shared suite filter — must match runInProcessRows in Plan 18-03 verbatim. */
export function matchesSuiteFilter(row, flags) {
  return (
    row.suite === 'smoke' ||
    row.suite === 'v3' ||
    (row.suite === 'full' && flags.full)
  );
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
            const handler = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            handler.resolve(msg);
          }
        } catch {
          /* ignore malformed lines */
        }
      }
      i = this.buffer.indexOf('\n');
    }
  }

  request(method, params) {
    const id = this.nextId++;
    const payload = `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout ${method}`));
      }, STDIO_REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
      });
      this.child.stdin.write(payload);
    });
  }

  notify(method, params) {
    this.child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`,
    );
  }
}

function spawnChild(routingEnv) {
  const distEntry = resolve(root, 'dist/index.js');
  if (!existsSync(distEntry)) {
    throw new Error('dist/index.js missing — run pnpm run build first');
  }
  return spawn('node', [distEntry], {
    env: {
      ...env,
      ...routingEnv,
      COOLIFY_MCP_LOG: 'error',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function extractStructuredContent(res) {
  return res?.result?.structuredContent ?? null;
}

function evaluateStdioRowResult(row, res, redact) {
  const structuredContent = extractStructuredContent(res);
  const rpcError = res?.error;
  let status = 'pass';
  let errorCode = null;
  let recoveryHintsPresent = false;

  if (rpcError?.code === -32602) {
    status = 'fail';
    errorCode = `RPC_${rpcError.code}`;
  } else if (!structuredContent || structuredContent.ok === false) {
    status = 'fail';
    errorCode =
      structuredContent?.error?.code ??
      (rpcError?.code !== undefined ? `RPC_${rpcError.code}` : 'UAT_UNKNOWN');
    const hints = structuredContent?.error?.recoveryHints;
    recoveryHintsPresent = Array.isArray(hints) && hints.length > 0;
  } else {
    const hints = structuredContent?.error?.recoveryHints;
    recoveryHintsPresent = Array.isArray(hints) && hints.length > 0;
  }

  return redact({
    id: row.id,
    tool: row.tool,
    status,
    durationMs: 0,
    errorCode,
    recoveryHintsPresent,
    structuredContent: structuredContent ?? null,
  });
}

async function runStdioRows({ matrix, flags, routingEnv, redact }) {
  const filtered = matrix.filter(
    (row) => row.mode === 'stdio' && matchesSuiteFilter(row, flags),
  );
  const v3Gaps = [];

  if (filtered.length === 0) {
    v3Gaps.push({
      reason: 'no-stdio-rows',
      message: 'No stdio matrix rows matched the active suite filter',
    });
    return { rows: [], v3Gaps };
  }

  const child = spawnChild(routingEnv);
  const client = new McpStdioClient(child);
  const rows = [];

  try {
    await client.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'live-uat', version: '1.0' },
    });
    client.notify('notifications/initialized', {});

    const listRes = await client.request('tools/list', {});
    const listedTools = (listRes?.result?.tools ?? []).map((tool) => tool.name);
    const missingTools = REGISTERED_TOOLS.filter(
      (name) => !listedTools.includes(name),
    );
    if (missingTools.length > 0) {
      throw new Error(
        `tools/list missing registered tools: ${missingTools.join(', ')}`,
      );
    }

    for (const row of filtered) {
      const startTime = Date.now();
      try {
        const res =
          row.tool === 'tools/list'
            ? await client.request('tools/list', {})
            : await client.request('tools/call', {
                name: row.tool,
                arguments: row.args ?? {},
              });
        const result = evaluateStdioRowResult(row, res, redact);
        result.durationMs = Date.now() - startTime;
        rows.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const errorCode = message.startsWith('Timeout')
          ? 'UAT_TIMEOUT'
          : 'UAT_CRASH';
        rows.push(
          redact({
            id: row.id,
            tool: row.tool,
            status: 'fail',
            durationMs: Date.now() - startTime,
            errorCode,
            recoveryHintsPresent: false,
            structuredContent: null,
          }),
        );
      }
    }
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }

  return { rows, v3Gaps };
}

function buildReport(rows, v3Gaps) {
  const summary = {
    pass: rows.filter((row) => row.status === 'pass').length,
    fail: rows.filter((row) => row.status === 'fail').length,
    skip: rows.filter((row) => row.status === 'skip').length,
    planned: rows.filter((row) => row.status === 'planned').length,
    v3_gaps: v3Gaps.length,
  };
  return { rows, summary, v3_gaps: v3Gaps };
}

function writeMarkdown(report, path, redact) {
  const lines = [
    '# Live UAT Report',
    '',
    '## Summary',
    '',
    '| pass | fail | skip | planned | v3_gaps |',
    '| --- | --- | --- | --- | --- |',
    `| ${report.summary.pass} | ${report.summary.fail} | ${report.summary.skip} | ${report.summary.planned} | ${report.summary.v3_gaps} |`,
    '',
    '## Rows',
    '',
    '| id | tool | status | durationMs | errorCode | recoveryHintsPresent |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of report.rows) {
    lines.push(
      `| ${row.id} | ${row.tool} | ${row.status} | ${row.durationMs} | ${row.errorCode ?? ''} | ${row.recoveryHintsPresent} |`,
    );
  }

  if (report.v3_gaps.length > 0) {
    lines.push('', '## v3_gaps', '');
    for (const gap of report.v3_gaps) {
      lines.push(`- **${gap.reason}**: ${gap.message}`);
    }
  }

  writeFileSync(path, `${redact(lines.join('\n'))}\n`, 'utf8');
}

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

  const { rows, v3Gaps } = await runStdioRows({
    matrix,
    flags: cli,
    routingEnv,
    redact,
  });
  const report = buildReport(rows, v3Gaps);
  const reportJson = redact(JSON.stringify(report));
  stdout.write(`${reportJson}\n`);

  if (cli.out) {
    writeFileSync(cli.out, `${reportJson}\n`, 'utf8');
    const mdPath = cli.out.endsWith('.json')
      ? cli.out.replace(/\.json$/, '.md')
      : `${cli.out}.md`;
    writeMarkdown(report, mdPath, redact);
  }

  if (report.summary.fail > 0) {
    exit(1);
  }
  exit(0);
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
