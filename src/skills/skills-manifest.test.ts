import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS = [
  'coolify-setup',
  'coolify-deploy',
  'coolify-diagnose',
  'coolify-incident',
] as const;

const PROMPT_ANALOGS: Record<(typeof SKILLS)[number], string> = {
  'coolify-setup': 'new-project',
  'coolify-deploy': 'deploy',
  'coolify-diagnose': 'diagnose',
  'coolify-incident': 'incident',
};

describe('skills manifest', () => {
  it('four skill directories exist', () => {
    for (const dir of SKILLS) {
      expect(existsSync(join('skills', dir, 'SKILL.md'))).toBe(true);
    }
  });

  for (const dir of SKILLS) {
    it(`skills/${dir}/SKILL.md has frontmatter name matching directory`, () => {
      const skillPath = join('skills', dir, 'SKILL.md');
      const content = readFileSync(skillPath, 'utf8');
      expect(content).toMatch(/^---\nname: /);

      const nameMatch = content.match(/^---\s*\nname:\s*(.+)\s*\n/m);
      expect(nameMatch?.[1]?.trim()).toBe(dir);
    });

    it(`skills/${dir}/SKILL.md documents deployment.watch workflow`, () => {
      const content = readFileSync(join('skills', dir, 'SKILL.md'), 'utf8');
      expect(content).toMatch(/deployment\.watch|deployment\(\{ action: "watch"/);
    });

    it(`skills/${dir}/SKILL.md documents confirm safety gates`, () => {
      const content = readFileSync(join('skills', dir, 'SKILL.md'), 'utf8');
      expect(content).toContain('confirm');
    });

    it(`skills/${dir}/SKILL.md names MCP prompt analog ${PROMPT_ANALOGS[dir]}`, () => {
      const content = readFileSync(join('skills', dir, 'SKILL.md'), 'utf8');
      expect(content).toContain(PROMPT_ANALOGS[dir]);
    });
  }

  it('coolify-deploy documents recipe or deploy workflow steps', () => {
    const content = readFileSync(join('skills', 'coolify-deploy', 'SKILL.md'), 'utf8');
    expect(content).toMatch(/create-git-app|application\(\{ action: "deploy"/);
  });
});
