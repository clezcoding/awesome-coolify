#!/usr/bin/env node
/**
 * Temporary stdio spy: logs MCP traffic while forwarding to dist/index.js.
 * Remove once Cursor tool-list issue is diagnosed.
 */
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const real = resolve(root, 'dist/index.js');
const log = resolve(root, '.cursor/mcp-spy.log');

appendFileSync(
  log,
  `\n==== spy start ${new Date().toISOString()} pid=${process.pid} ====\n`,
);

const child = spawn(process.execPath, [real], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env,
  cwd: root,
});

function stamp(dir, data) {
  const s = data.toString();
  appendFileSync(log, `\n--- ${dir} ${new Date().toISOString()} ---\n${s}`);
  for (const line of s.split('\n')) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'tools/list' || msg.id != null) {
        const tools = msg.result?.tools;
        if (Array.isArray(tools)) {
          appendFileSync(
            log,
            `>> TOOLS(${tools.length}): ${tools.map((t) => t.name).join(', ')}\n`,
          );
          const app = tools.find((t) => t.name === 'application');
          if (app) {
            appendFileSync(
              log,
              `>> APP_DESC: ${String(app.description).slice(0, 120)}\n`,
            );
          }
        }
      }
    } catch {
      /* ignore non-json */
    }
  }
}

process.stdin.on('data', (d) => {
  stamp('IN', d);
  child.stdin.write(d);
});
child.stdout.on('data', (d) => {
  stamp('OUT', d);
  process.stdout.write(d);
});
child.stderr.on('data', (d) => {
  stamp('ERR', d);
  process.stderr.write(d);
});
child.on('exit', (code, signal) => {
  appendFileSync(
    log,
    `\n==== spy exit code=${code} signal=${signal} ====\n`,
  );
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
process.stdin.on('end', () => child.stdin.end());
