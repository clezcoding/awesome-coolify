import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let cached: string | undefined;

function packageJsonPath(): string {
  const dir = dirname(fileURLToPath(import.meta.url));
  // Bundled dist/index.js → ../package.json; source src/utils → ../../package.json
  for (const rel of ['../package.json', '../../package.json']) {
    const candidate = resolve(dir, rel);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('package.json not found adjacent to MCP package');
}

export function readPackageVersion(): string {
  if (cached) return cached;
  cached = JSON.parse(readFileSync(packageJsonPath(), 'utf8')).version as string;
  return cached;
}
