import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS = [
  'coolify-setup',
  'coolify-deploy',
  'coolify-diagnose',
  'coolify-incident',
] as const;

describe('skills manifest', () => {
  for (const dir of SKILLS) {
    const testFn = dir === 'coolify-setup' ? it : it.fails;
    testFn(`skills/${dir}/SKILL.md has frontmatter name matching directory`, () => {
      const skillPath = join('skills', dir, 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);

      const content = readFileSync(skillPath, 'utf8');
      expect(content).toMatch(/^---\nname: /);

      const nameMatch = content.match(/^---\s*\nname:\s*(.+)\s*\n/m);
      expect(nameMatch?.[1]?.trim()).toBe(dir);
    });
  }
});
