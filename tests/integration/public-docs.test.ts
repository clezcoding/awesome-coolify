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

function resolveProtectedBaseRef(): string {
  if (process.env.GITHUB_BASE_SHA) return process.env.GITHUB_BASE_SHA;
  for (const ref of ['origin/main', 'main']) {
    try {
      execFileSync('git', ['rev-parse', '--verify', ref], { cwd: ROOT, stdio: 'pipe' });
      return ref;
    } catch {
      // try next ref
    }
  }
  throw new Error(
    'No git base ref for protected file parity — fetch origin/main or set GITHUB_BASE_SHA',
  );
}

function readGitRef(path: string, ref: string): string {
  return execFileSync('git', ['show', `${ref}:${path}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function stripInlineHtml(text: string): string {
  let out = '';
  let inTag = false;
  for (const ch of text) {
    if (ch === '<') {
      inTag = true;
      continue;
    }
    if (ch === '>') {
      inTag = false;
      continue;
    }
    if (!inTag) out += ch;
  }
  return out;
}

function slugify(heading: string): string {
  return stripInlineHtml(heading)
    .trim()
    .toLowerCase()
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

function proseLines(content: string): string[] {
  let fenced = false;
  return content.split('\n').filter((line) => {
    if (/^```/.test(line)) {
      fenced = !fenced;
      return false;
    }
    return !fenced;
  });
}

describe('public documentation integrity', () => {
  it('has exact final public inventory and no Cursor draft residue', () => {
    expect(PUBLIC_DOCS).toHaveLength(20);
    for (const path of PUBLIC_DOCS) expect(existsSync(resolve(ROOT, path)), path).toBe(true);
    expect(existsSync(resolve(ROOT, 'CURSOR-SETUP-GUIDE.md.draft.md'))).toBe(false);
  });

  it('keeps protected files byte-identical to the merge base', () => {
    const baseRef = resolveProtectedBaseRef();
    const basePkgVersion = JSON.parse(readGitRef('package.json', baseRef)).version;
    const headPkgVersion = JSON.parse(read('package.json')).version;
    const protectedPaths = ['LICENSE', '.planning/ROADMAP.md'];
    if (basePkgVersion === headPkgVersion) {
      protectedPaths.unshift('README.md', 'README.de.md');
    }
    for (const path of protectedPaths) {
      expect(read(path), path).toBe(readGitRef(path, baseRef));
    }
  });

  it('matches package, runtime, tool, prompt, and capability contracts', () => {
    const pkg = JSON.parse(read('package.json')) as {
      version: string;
      engines: { node: string };
    };
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.engines.node).toBe('>=24');
    expect(read('src/mcp/server.ts').match(/registerTool\(/g)).toHaveLength(18);
    expect(read('src/mcp/prompts.ts').match(/registerPrompt\(/g)).toHaveLength(4);

    const joined = TASK_ONE_DOCS.map(read).join('\n');
    expect(joined).not.toMatch(/\b16 tools\b|~87 actions|repository is \*\*private\*\*/i);
    expect(joined).toContain(pkg.version);
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
    const pkgVersion = JSON.parse(read('package.json')).version as string;
    const en = read('docs/en/cursor.md');
    const de = read('docs/de/cursor.md');
    for (const content of [en, de]) {
      expect(content).toContain('npx');
      expect(content).toContain(`awesome-coolify-mcp@${pkgVersion}`);
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

  it('keeps public skills synchronized with prompt and tool contracts', () => {
    const setup = read('skills/coolify-setup/SKILL.md');
    const deploy = read('skills/coolify-deploy/SKILL.md');
    const diagnose = read('skills/coolify-diagnose/SKILL.md');
    const incident = read('skills/coolify-incident/SKILL.md');

    for (const [content, prompt] of [
      [setup, 'new-project'],
      [deploy, 'deploy'],
      [diagnose, 'diagnose'],
      [incident, 'incident'],
    ]) {
      expect(content).toContain(`MCP prompt analog:** \`${prompt}\``);
      expect(content).toContain('deployment.watch');
      expect(content).toContain('confirm');
    }
    for (const sibling of [
      '../coolify-setup/SKILL.md',
      '../coolify-deploy/SKILL.md',
      '../coolify-diagnose/SKILL.md',
      '../coolify-incident/SKILL.md',
    ]) {
      expect([setup, deploy, diagnose, incident].some((content) => content.includes(sibling))).toBe(
        true,
      );
    }

    expect(setup).toMatch(/exactly one|XOR/i);
    expect(setup).toContain('COOLIFY_CONFIRM_REQUIRED');
    expect(deploy).toContain('wait: false');
    expect(deploy).toContain('deployment.logs');
    expect(deploy).toContain('application.logs');
    expect(diagnose).toMatch(/Actions:.*logs\(/s);
    expect(diagnose).toMatch(/service\/database.*(?:unavailable|limitation)/i);

    const order = [
      'system({ action: "version" })',
      'diagnose({ action: "logs"',
      'application({ action: "logs"',
      'deployment({ action: "logs"',
      'application({ action: "restart"',
      'confirm: false',
      'confirm: true',
    ];
    let cursor = -1;
    for (const marker of order) {
      const next = incident.indexOf(marker);
      expect(next, marker).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  it('keeps public Markdown lint-compatible', () => {
    for (const path of MARKDOWN_DOCS) {
      const content = read(path);
      const prose = proseLines(content);
      if (!path.startsWith('.github/')) {
        expect(prose.filter((line) => /^#\s+/.test(line)), `${path}: one H1`).toHaveLength(1);
      }
      expect(content, `${path}: trailing whitespace`).not.toMatch(/[ \t]+$/m);
      expect(content, `${path}: empty link`).not.toMatch(/\[[^\]]*]\(\s*\)/);
      expect(content.match(/^```/gm)?.length ?? 0, `${path}: fenced blocks`).toSatisfy(
        (count: number) => count % 2 === 0,
      );
      if (path !== 'CHANGELOG.md') {
        expect(prose.join('\n'), `${path}: unresolved marker`).not.toMatch(/\b(?:TODO|FIXME)\b/);
      }
      expect(content, `${path}: decorative badge`).not.toMatch(
        /^\s*\[!\[[^\]]*]\([^)]*\)]\([^)]*\)/m,
      );

      let previous = 0;
      for (const line of prose) {
        const match = line.match(/^(#{1,6})\s+/);
        if (!match) continue;
        const depth = match[1].length;
        if (previous) expect(depth, `${path}: heading depth`).toBeLessThanOrEqual(previous + 1);
        previous = depth;
      }

      const explicitIds = [...content.matchAll(/\sid=["']([^"']+)["']/g)].map(
        (match) => match[1],
      );
      expect(new Set(explicitIds).size, `${path}: duplicate explicit anchor`).toBe(
        explicitIds.length,
      );
    }
  });
});
