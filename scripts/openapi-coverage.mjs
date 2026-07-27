#!/usr/bin/env node
/**
 * OpenAPI coverage generator — maintainer/CI only; never ships in npm tarball.
 *
 * Usage:
 *   pnpm run openapi:coverage
 *   node scripts/openapi-coverage.mjs --check
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { indexOpenApiOperations } from './lib/openapi-coverage-parse.mjs';
import { classifyRows, loadActionsCatalogs } from './lib/openapi-coverage-join.mjs';
import { renderCoverageMarkdown } from './lib/openapi-coverage-render.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const SPEC_PATH = resolve(root, 'docs/coolify_openapi.json');
const MAP_PATH = resolve(root, 'docs/coverage-map.yaml');
const OVERRIDES_PATH = resolve(root, 'docs/coverage-overrides.yaml');
const OUTPUT_PATH = resolve(root, 'docs/COVERAGE.md');
const TOOLS_DIR = resolve(root, 'src/mcp/tools');

/**
 * @returns {string}
 */
export async function generateCoverageMarkdown() {
  const rawSpec = readFileSync(SPEC_PATH, 'utf8');
  const operations = await indexOpenApiOperations(rawSpec);

  const mapDoc = parseYaml(readFileSync(MAP_PATH, 'utf8'));
  const overridesDoc = parseYaml(readFileSync(OVERRIDES_PATH, 'utf8'));

  const map = mapDoc?.actions ?? [];
  const overrides = [
    ...(overridesDoc?.overrides ?? []),
    ...(overridesDoc?.action_overrides ?? []),
  ];

  const catalogs = loadActionsCatalogs(TOOLS_DIR);
  const rows = classifyRows({ operations, map, overrides, catalogs });

  return renderCoverageMarkdown(rows);
}

/**
 * Regenerate and byte-compare docs/COVERAGE.md. Throws when missing or stale.
 *
 * @param {{ coveragePath?: string }} [options]
 */
export async function assertCoverageFresh(options = {}) {
  const outputPath = options.coveragePath ?? OUTPUT_PATH;
  let committed;
  try {
    committed = readFileSync(outputPath, 'utf8');
  } catch {
    throw new Error('docs/COVERAGE.md is missing — run pnpm run openapi:coverage');
  }

  const generated = await generateCoverageMarkdown();
  if (generated !== committed) {
    throw new Error(
      'docs/COVERAGE.md is stale — run pnpm run openapi:coverage and commit the result',
    );
  }
}

async function main() {
  const markdown = await generateCoverageMarkdown();

  if (check) {
    let committed;
    try {
      committed = readFileSync(OUTPUT_PATH, 'utf8');
    } catch {
      console.error('[openapi-coverage] docs/COVERAGE.md is missing — run generator first.');
      process.exit(1);
    }

    if (markdown !== committed) {
      console.error('[openapi-coverage] docs/COVERAGE.md is stale — run pnpm run openapi:coverage');
      process.exit(1);
    }

    process.exit(0);
  }

  writeFileSync(OUTPUT_PATH, markdown, 'utf8');
  process.stdout.write(markdown);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[openapi-coverage] ${error.message}`);
    process.exit(1);
  });
}
