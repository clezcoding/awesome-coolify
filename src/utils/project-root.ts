import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function resolveProjectRoot(startDir?: string): string {
  const testWorkspace = process.env.COOLIFY_MCP_TEST_WORKSPACE;
  if (testWorkspace) {
    return resolve(testWorkspace);
  }

  let dir = resolve(startDir ?? process.cwd());
  const root = resolve('/');

  while (dir !== root) {
    if (
      existsSync(resolve(dir, '.git')) ||
      existsSync(resolve(dir, 'package.json')) ||
      existsSync(resolve(dir, '.coolify'))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return resolve(startDir ?? process.cwd());
}
