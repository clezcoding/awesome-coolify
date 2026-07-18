#!/usr/bin/env node
/**
 * Stop ONLY awesome-coolify MCP server processes from this repo.
 * Does NOT touch Cursor extension-hosts or other coolify-mcp npm packages.
 *
 * Usage:
 *   npm run kill-mcp
 *   node scripts/kill-mcp.mjs
 *   node scripts/kill-mcp.mjs --dry-run
 *   node scripts/kill-mcp.mjs --inspect
 */
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const inspect = process.argv.includes('--inspect');

/** Processes whose command line contains one of these repo paths are killed. */
const KILL_MARKERS = [
  `${root}/dist/index.js`,
  `${root}/scripts/mcp-spy.mjs`,
  `${root}/scripts/run-mcp.mjs`,
];

/**
 * Related processes we intentionally skip (shown in --inspect / default footer).
 * @type {Array<{ test: (command: string) => boolean; reason: string }>}
 */
const SKIPPED_RELATED = [
  {
    test: (cmd) => /extension-host.*awesome-coolify/i.test(cmd),
    reason: 'Cursor workspace extension-host (not the MCP server)',
  },
  {
    test: (cmd) =>
      /coolify-mcp/i.test(cmd) && !cmd.includes(`${root}/`),
    reason: 'Other coolify MCP package (npm/npx), not awesome-coolify repo',
  },
  {
    test: (cmd) =>
      /supabase-coolify-mcp/i.test(cmd) && !cmd.includes(`${root}/`),
    reason: 'Other coolify MCP package (npm/npx), not awesome-coolify repo',
  },
  {
    test: (cmd) =>
      cmd.includes(`${root}/`) &&
      /vitest|tsup|graphify update|npm test|npm run test/i.test(cmd),
    reason: 'Dev/test tooling in repo (not MCP server)',
  },
];

/**
 * @returns {Array<{ pid: number; command: string }>}
 */
function listProcesses() {
  // -ww avoids truncated command lines on macOS
  const output = execSync('ps -ww -eo pid=,command=', { encoding: 'utf8' });
  const rows = [];

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;

    rows.push({ pid: Number(match[1]), command: match[2] });
  }

  return rows;
}

/**
 * @param {Array<{ pid: number; command: string }>} rows
 * @returns {Array<{ pid: number; command: string }>}
 */
function findKillTargets(rows) {
  return rows
    .filter(({ pid, command }) => {
      if (pid === process.pid) return false;
      return KILL_MARKERS.some((marker) => command.includes(marker));
    })
    .sort((a, b) => a.pid - b.pid);
}

/**
 * @param {Array<{ pid: number; command: string }>} rows
 * @returns {Array<{ pid: number; command: string; reason: string }>}
 */
function findSkippedRelated(rows, killPids) {
  const killSet = new Set(killPids);
  const hits = [];

  for (const row of rows) {
    if (killSet.has(row.pid) || row.pid === process.pid) continue;

    for (const rule of SKIPPED_RELATED) {
      if (rule.test(row.command)) {
        hits.push({ ...row, reason: rule.reason });
        break;
      }
    }
  }

  return hits.sort((a, b) => a.pid - b.pid);
}

/**
 * @param {number[]} pids
 * @param {NodeJS.Signals} signal
 */
function signalPids(pids, signal) {
  for (const pid of pids) {
    if (dryRun) {
      console.error(`[kill-mcp] dry-run: would send ${signal} to ${pid}`);
      continue;
    }
    try {
      process.kill(pid, signal);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ESRCH') {
        console.error(`[kill-mcp] Failed ${signal} on ${pid}: ${error.message}`);
      }
    }
  }
}

/**
 * @param {number[]} pids
 * @returns {number[]}
 */
function stillAlive(pids) {
  return pids.filter((pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function printInspect(killTargets, skipped) {
  console.error('[kill-mcp] Inspect — awesome-coolify repo only\n');

  console.error('Would KILL (awesome-coolify MCP):');
  if (killTargets.length === 0) {
    console.error('  (none)');
  } else {
    for (const { pid, command } of killTargets) {
      console.error(`  ${pid}: ${command}`);
    }
  }

  console.error('\nWould SKIP (related but not awesome-coolify MCP):');
  if (skipped.length === 0) {
    console.error('  (none)');
  } else {
    for (const { pid, command, reason } of skipped) {
      console.error(`  ${pid}: ${reason}`);
      console.error(`       ${command}`);
    }
  }

  console.error(
    '\nNote: Cursor may respawn the MCP server on the next tool call.',
  );
  console.error(
    'To keep it stopped: disable "awesome-coolify" in Cursor MCP settings, then run kill-mcp.',
  );
}

function main() {
  const rows = listProcesses();
  const killTargets = findKillTargets(rows);
  const skipped = findSkippedRelated(
    rows,
    killTargets.map(({ pid }) => pid),
  );

  if (inspect) {
    printInspect(killTargets, skipped);
    process.exit(0);
  }

  if (killTargets.length === 0) {
    console.error('[kill-mcp] No awesome-coolify MCP server processes found.');
    if (skipped.length > 0) {
      console.error(
        `[kill-mcp] ${skipped.length} related process(es) still running — intentionally skipped.`,
      );
      console.error('[kill-mcp] Run with --inspect to see what was skipped and why.');
    } else {
      console.error('[kill-mcp] Run with --inspect to audit related processes.');
    }
    process.exit(0);
  }

  for (const { pid, command } of killTargets) {
    console.error(`[kill-mcp] ${dryRun ? 'found' : 'stopping'} ${pid}: ${command}`);
  }

  const pids = killTargets.map(({ pid }) => pid);
  signalPids(pids, 'SIGTERM');

  if (!dryRun) {
    sleep(500);
    const survivors = stillAlive(pids);
    if (survivors.length > 0) {
      console.error(`[kill-mcp] Force-killing ${survivors.length} process(es)...`);
      signalPids(survivors, 'SIGKILL');
    }
  }

  const remaining = dryRun ? pids : stillAlive(pids);
  if (remaining.length > 0 && !dryRun) {
    console.error(`[kill-mcp] Warning: still running: ${remaining.join(', ')}`);
    process.exit(1);
  }

  console.error(
    dryRun
      ? `[kill-mcp] Dry run complete (${pids.length} process(es) matched).`
      : `[kill-mcp] Stopped ${pids.length} awesome-coolify MCP process(es).`,
  );

  if (skipped.length > 0) {
    console.error(
      `[kill-mcp] Left ${skipped.length} related non-target process(es) running (see --inspect).`,
    );
  }

  console.error(
    '[kill-mcp] Cursor may restart MCP on next use — disable it in MCP settings to keep it off.',
  );
}

main();
