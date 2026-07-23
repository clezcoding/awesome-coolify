import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CoolifyApiError, RECOVERY_HINTS } from './errors.js';

export function resolveProjectRoot(startDir?: string): string {
  const testWorkspace = process.env.COOLIFY_MCP_TEST_WORKSPACE;
  if (testWorkspace) {
    return resolve(testWorkspace);
  }

  const start = resolve(startDir ?? process.cwd());
  let dir = start;
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

  throw new CoolifyApiError({
    code: 'COOLIFY_VALIDATION_ERROR',
    message: `Could not resolve project root from '${start}': no .git, package.json, or .coolify marker found. Run the MCP server from a project workspace root.`,
    recoveryHints: [
      'Run the MCP server with cwd set to the repository root (directory containing .git, package.json, or .coolify/).',
      'For tests, set COOLIFY_MCP_TEST_WORKSPACE to an explicit workspace path.',
      ...RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    ],
  });
}
