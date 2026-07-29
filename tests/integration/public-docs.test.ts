import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const PUBLIC_DOCS = [
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/COVERAGE.md',
  'docs/OPENAPI.md',
  'docs/assets/README.md',
  'docs/assets/cursor-icon-verify.md',
  'docs/en/cloud.md',
  'docs/de/cloud.md',
  'docs/en/setup.md',
  'docs/en/cursor.md',
  'docs/de/cursor.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  'skills/coolify-setup/SKILL.md',
  'skills/coolify-deploy/SKILL.md',
  'skills/coolify-diagnose/SKILL.md',
  'skills/coolify-incident/SKILL.md',
] as const;
const MARKDOWN_DOCS = PUBLIC_DOCS.filter((path) => extname(path) === '.md');
const TASK_ONE_DOCS = [
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/en/cursor.md',
  'docs/de/cursor.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
] as const;

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

function slugify(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function anchors(content: string): Set<string> {
  const result = new Set<string>();
  for (const match of content.matchAll(/^#{1,6}\s+(.+)$/gm)) result.add(slugify(match[1]));
  for (const match of content.matchAll(/\sid=["']([^"']+)["']/g)) result.add(match[1]);
  return result;
}

function localReferences(content: string): string[] {
  const refs = [
    ...content.matchAll(/!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g),
    ...content.matchAll(/(?:href|src)=["']([^"']+)["']/g),
  ].map((match) => match[1]);
  return refs.filter(
    (ref) =>
      !/^(?:https?:|mailto:|data:)/.test(ref) &&
      !/[<{][^>}]+[>}]/.test(ref) &&
      ref !== '#',
  );
}

describe('public documentation integrity', () => {
  it('has exact final public inventory and no Cursor draft residue', () => {
    expect(PUBLIC_DOCS).toHaveLength(20);
    for (const path of PUBLIC_DOCS) expect(existsSync(resolve(ROOT, path)), path).toBe(true);
    expect(existsSync(resolve(ROOT, 'CURSOR-SETUP-GUIDE.md.draft.md'))).toBe(false);
  });

  it('keeps protected files byte-identical to HEAD', () => {
    for (const path of ['README.md', 'README.de.md', 'LICENSE', '.planning/ROADMAP.md']) {
      const committed = execFileSync('git', ['show', `HEAD:${path}`], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      expect(read(path), path).toBe(committed);
    }
  });

  it('matches package, runtime, tool, prompt, and capability contracts', () => {
    const pkg = JSON.parse(read('package.json')) as {
      version: string;
      engines: { node: string };
    };
    expect(pkg.version).toBe('1.0.1');
    expect(pkg.engines.node).toBe('>=24');
    expect(read('src/mcp/server.ts').match(/registerTool\(/g)).toHaveLength(18);
    expect(read('src/mcp/prompts.ts').match(/registerPrompt\(/g)).toHaveLength(4);

    const joined = TASK_ONE_DOCS.map(read).join('\n');
    expect(joined).not.toMatch(/\b16 tools\b|~87 actions|repository is \*\*private\*\*/i);
    expect(joined).toContain('1.0.1');
    expect(joined).toContain('Node.js 24');
    expect(joined).toContain('18 tools');
    expect(joined).toContain('four prompts');
  });

  it('keeps local links, anchors, and referenced assets valid', () => {
    for (const path of MARKDOWN_DOCS) {
      const content = read(path);
      for (const ref of localReferences(content)) {
        const [targetPart, fragment] = ref.split('#', 2);
        const target = targetPart
          ? resolve(dirname(resolve(ROOT, path)), decodeURIComponent(targetPart))
          : resolve(ROOT, path);
        expect(existsSync(target), `${path} -> ${ref}`).toBe(true);
        if (fragment && extname(target) === '.md') {
          expect(anchors(readFileSync(target, 'utf8')).has(decodeURIComponent(fragment)), `${path} -> ${ref}`).toBe(true);
        }
      }
    }
  });

  it('keeps Cursor locale guides aligned and safe to copy', () => {
    const en = read('docs/en/cursor.md');
    const de = read('docs/de/cursor.md');
    for (const content of [en, de]) {
      expect(content).toContain('npx');
      expect(content).toContain('awesome-coolify-mcp@1.0.1');
      expect(content).toContain('.cursor/mcp.json');
      expect(content).toContain('18 tools');
      expect(content).toContain('four prompts');
      expect(content).toContain('COOLIFY_TOKEN');
      expect(content).not.toMatch(/\/Users\/|DEIN_API_TOKEN|puzzlesstool\.online/i);
    }
    expect(en.match(/^## /gm)).toHaveLength(de.match(/^## /gm)?.length ?? 0);
  });

  it('keeps Cloud locale guides aligned with current logs and inventory', () => {
    const en = read('docs/en/cloud.md');
    const de = read('docs/de/cloud.md');
    for (const content of [en, de]) {
      expect(content).toMatch(/18 (?:tools|MCP-Tools)/i);
      expect(content).toMatch(/four prompts|vier Prompts/i);
      expect(content).toContain('application.logs');
      expect(content).toContain('deployment_uuid');
      expect(content).toContain('diagnose.logs');
      expect(content).toMatch(/service.?.?database.*(?:unavailable|nicht verfügbar)/i);
      expect(content).toContain('system.version.capabilities');
    }
    expect(en.match(/^## /gm)).toHaveLength(de.match(/^## /gm)?.length ?? 0);
  });

  it('documents setup, OpenAPI ownership, branding, and generated coverage', () => {
    const setup = read('docs/en/setup.md');
    for (const contract of [
      'preflight',
      'wire',
      'resume',
      'create-git-app',
      'create-app-db',
      'create-one-click',
      'set_env',
      'env_file',
      'env_content',
      'deploy_and_watch',
      'deployment.watch',
      'diagnose.logs',
    ]) {
      expect(setup).toContain(contract);
    }
    expect(read('docs/OPENAPI.md')).toContain('pinned Coolify v4.1.2');
    expect(read('docs/OPENAPI.md')).toContain('never edit it by hand');
    expect(read('docs/assets/README.md')).toContain('alt text');
    expect(read('docs/assets/cursor-icon-verify.md')).not.toContain('screenshot pending');

    const coverage = read('docs/COVERAGE.md');
    expect(coverage).toContain('## Bucket definitions');
    expect(coverage).toContain('pnpm run openapi:coverage -- --check');
    expect(coverage).toContain('[OpenAPI maintenance](./OPENAPI.md)');
  });

  it('keeps safe public-reporting boundaries', () => {
    expect(read('SECURITY.md')).toContain(
      'https://github.com/clezcoding/awesome-coolify/security/advisories/new',
    );
    for (const path of [
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      '.github/ISSUE_TEMPLATE/feature_request.yml',
    ]) {
      expect(read(path)).toMatch(/token|credential/i);
      expect(read(path)).toMatch(/security advisor|security advisories/i);
    }
  });
});
