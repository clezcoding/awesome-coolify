import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let testWorkspaceRoot: string;

beforeEach(() => {
  testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-project-root-'));
});

afterEach(() => {
  delete process.env.COOLIFY_MCP_TEST_WORKSPACE;
  rmSync(testWorkspaceRoot, { recursive: true, force: true });
});

async function loadProjectRoot() {
  return import('./project-root.js');
}

function buildNestedTree(marker: 'git' | 'package' | 'coolify' | 'none') {
  const root = join(testWorkspaceRoot, 'workspace');
  const nested = join(root, 'apps', 'web', 'src');
  mkdirSync(nested, { recursive: true });

  if (marker === 'git') {
    mkdirSync(join(root, '.git'));
  } else if (marker === 'package') {
    writeFileSync(join(root, 'package.json'), '{"name":"test"}', 'utf-8');
  } else if (marker === 'coolify') {
    mkdirSync(join(root, '.coolify'));
  }

  return { root, nested };
}

describe('resolveProjectRoot', () => {
  it.fails(
    'walks up from nested subdir and returns the dir containing .git',
    async () => {
      const { resolveProjectRoot } = await loadProjectRoot();
      const { root, nested } = buildNestedTree('git');
      expect(resolveProjectRoot(nested)).toBe(root);
    },
  );

  it.fails(
    'walks up to a dir containing package.json when no .git exists',
    async () => {
      const { resolveProjectRoot } = await loadProjectRoot();
      const { root, nested } = buildNestedTree('package');
      expect(resolveProjectRoot(nested)).toBe(root);
    },
  );

  it.fails(
    'returns an existing .coolify/ parent when neither .git nor package.json found above',
    async () => {
      const { resolveProjectRoot } = await loadProjectRoot();
      const { root, nested } = buildNestedTree('coolify');
      expect(resolveProjectRoot(nested)).toBe(root);
    },
  );

  it.fails('falls back to startDir when no marker found', async () => {
    const { resolveProjectRoot } = await loadProjectRoot();
    const { nested } = buildNestedTree('none');
    expect(resolveProjectRoot(nested)).toBe(nested);
  });

  it.fails('COOLIFY_MCP_TEST_WORKSPACE env var overrides the start dir (test seam)', async () => {
    const { resolveProjectRoot } = await loadProjectRoot();
    const overrideRoot = join(testWorkspaceRoot, 'override-root');
    mkdirSync(overrideRoot, { recursive: true });
    mkdirSync(join(overrideRoot, '.git'));
    process.env.COOLIFY_MCP_TEST_WORKSPACE = overrideRoot;

    expect(resolveProjectRoot()).toBe(overrideRoot);
  });
});
