/**
 * Install configurator HTML security + D-22 adapter markers (Phase 07-03).
 * Decisions: D-13, D-18, D-19, D-21, D-22, D-10, T-07-09.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const INSTALL_HTML = resolve(ROOT, 'docs/install.html');
const INDEX_HTML = resolve(ROOT, 'docs/index.html');

const STALE_COOLIFY_MCP = /(?<![\w-])coolify-mcp(?![\w-])/;

const CLIENT_NAMES = [
  'Cursor',
  'VS Code',
  'Claude Desktop',
  'Claude Code',
  'Windsurf',
  'OpenCode',
  'Codex CLI',
  'Gemini CLI',
  'Antigravity',
  'OpenClaw',
  'Hermes',
  'Kimi',
  'Kilo',
  'Cline',
  'Goose',
  'LM Studio',
] as const;

function readHtml(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('install configurator (Pages)', () => {
  const installHtml = readHtml(INSTALL_HTML);
  const indexHtml = readHtml(INDEX_HTML);

  it('D-21: docs/install.html and docs/index.html exist and are non-empty', () => {
    expect(installHtml.length).toBeGreaterThan(0);
    expect(indexHtml.length).toBeGreaterThan(0);
  });

  it('D-21: install.html lists 15+ MCP client names', () => {
    const present = CLIENT_NAMES.filter((name) => installHtml.includes(name));
    expect(present.length).toBeGreaterThanOrEqual(15);
  });

  it('D-23: install.html contains Cursor deeplink and VS Code install URL patterns', () => {
    expect(installHtml).toMatch(/cursor:\/\/anysphere/);
    expect(installHtml).toMatch(/vscode:mcp\/install|vscode\.dev\/redirect/);
  });

  it('D-19: install.html has no fetch, XMLHttpRequest, or form action (client-side only)', () => {
    expect(installHtml).not.toMatch(/fetch\(/);
    expect(installHtml).not.toMatch(/XMLHttpRequest/);
    expect(installHtml).not.toMatch(/<form[^>]+action/i);
  });

  it('T-07-09: neither HTML file loads external scripts via script src', () => {
    expect(installHtml).not.toMatch(/<script\s+src=/i);
    expect(indexHtml).not.toMatch(/<script\s+src=/i);
  });

  it('D-13: neither HTML file links to .planning or spike-findings', () => {
    expect(installHtml).not.toMatch(/\.planning\/|spike-findings/);
    expect(indexHtml).not.toMatch(/\.planning\/|spike-findings/);
  });

  it('D-10: neither HTML file references instances.json', () => {
    expect(installHtml).not.toMatch(/instances\.json/);
    expect(indexHtml).not.toMatch(/instances\.json/);
  });

  it('D-02: neither HTML file uses stale coolify-mcp package name (word-boundary)', () => {
    expect('awesome-coolify-mcp'.match(STALE_COOLIFY_MCP)).toBeNull();
    expect('coolify-mcp'.match(STALE_COOLIFY_MCP)?.[0]).toBe('coolify-mcp');
    expect(installHtml).not.toMatch(STALE_COOLIFY_MCP);
    expect(indexHtml).not.toMatch(STALE_COOLIFY_MCP);
  });

  it('D-19: install.html security notice — browser-only, secrets never leave page', () => {
    expect(installHtml).toMatch(/browser/i);
    expect(installHtml).toMatch(/never leave/i);
  });

  it('D-22: install.html source contains all 7 per-client format adapter markers', () => {
    expect(installHtml).toMatch(/mcpServers\s*[:=]/);
    expect(installHtml).toMatch(/["']inputs["'].*\$\{input:/s);
    expect(installHtml).toMatch(/["']type["']\s*:\s*["']local["']/);
    expect(installHtml).toMatch(/\[mcp_servers\./);
    expect(installHtml).toMatch(/mcp_servers\s*:/);
    expect(installHtml).toMatch(/mcpServers\s*:/);
    expect(installHtml).toMatch(/mcp\.servers|mcp\/servers/);
  });

  it('D-18: install.html disclaims Claude Desktop mcpb packaging and emits no .mcpb path', () => {
    expect(installHtml).toMatch(/No Claude Desktop.*mcpb.*packaging/i);
    expect(installHtml).not.toMatch(/\.mcpb\b/);
  });
});
