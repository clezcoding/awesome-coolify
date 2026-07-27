/**
 * Three-layer join + four-bucket classification (maintainer/CI only).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CoverageError } from './openapi-coverage-errors.mjs';

/**
 * @param {string} action
 * @returns {string}
 */
function stripCallParams(action) {
  const open = action.indexOf('(');
  if (open === -1) return action.trim();

  let depth = 0;
  for (let i = open; i < action.length; i++) {
    if (action[i] === '(') depth++;
    else if (action[i] === ')') {
      depth--;
      if (depth === 0) return action.slice(0, open).trim();
    }
  }

  return action.trim();
}

/**
 * @param {string} catalogText
 * @returns {string[]}
 */
export function parseCatalogActions(catalogText) {
  const match = catalogText.match(/Actions:\s*(.+)/s);
  if (!match) return [];

  return match[1]
    .split('·')
    .map((part) => part.trim())
    .map((part) => stripCallParams(part))
    .filter(Boolean);
}

/**
 * Linear scan for concatenated string literals after `export const …ActionsCatalog =`.
 * Avoids ReDoS-prone regex on maintainer-controlled repo sources (CodeQL js/redos).
 *
 * @param {string} source
 * @returns {string|null}
 */
function extractActionsCatalogLiteral(source) {
  const decl = /export const \w+ActionsCatalog\s*=/;
  const match = decl.exec(source);
  if (!match) return null;

  let i = match.index + match[0].length;
  /** @type {string[]} */
  const parts = [];

  while (i < source.length) {
    while (i < source.length && /[\s+]/.test(source[i])) i++;
    if (i >= source.length || source[i] === ';') break;

    const quote = source[i];
    if (quote !== "'" && quote !== '"' && quote !== '`') break;

    i++;
    let segment = '';
    while (i < source.length) {
      const ch = source[i];
      if (ch === '\\') {
        if (i + 1 >= source.length) break;
        segment += source[i + 1];
        i += 2;
        continue;
      }
      if (ch === quote) {
        i++;
        break;
      }
      segment += ch;
      i++;
    }
    parts.push(segment);
  }

  return parts.length ? parts.join('') : null;
}

/**
 * @param {string} toolsDir
 * @returns {Record<string, string[]>}
 */
export function loadActionsCatalogs(toolsDir) {
  /** @type {Record<string, string[]>} */
  const catalogs = {};

  for (const file of readdirSync(toolsDir)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;

    const tool = file.replace(/\.ts$/, '');
    const source = readFileSync(join(toolsDir, file), 'utf8');
    const catalogText = extractActionsCatalogLiteral(source);
    if (!catalogText) continue;

    catalogs[tool] = parseCatalogActions(catalogText);
  }

  return catalogs;
}

/**
 * @param {Array<{ key?: string, action?: string, bucket: string, reason?: string }>} overrides
 */
function splitOverrides(overrides = []) {
  /** @type {Map<string, { bucket: string, reason: string }>} */
  const byOpenApiKey = new Map();
  /** @type {Map<string, { bucket: string, reason: string }>} */
  const byAction = new Map();

  for (const entry of overrides) {
    const reason = entry.reason ?? '';
    if (entry.action) {
      byAction.set(entry.action, { bucket: entry.bucket, reason });
    } else if (entry.key) {
      byOpenApiKey.set(entry.key, { bucket: entry.bucket, reason });
    }
  }

  return { byOpenApiKey, byAction };
}

/**
 * @param {{
 *   operations: Array<{ key: string }>,
 *   map: Array<{ action: string, openapi?: string[], client?: string[] }>,
 *   overrides?: Array<{ key?: string, action?: string, bucket: string, reason?: string }>,
 *   catalogs?: Record<string, string[]>,
 * }} input
 */
export function classifyRows({ operations, map, overrides = [], catalogs = {} }) {
  const opKeys = new Set(operations.map((op) => op.key));
  const { byOpenApiKey, byAction } = splitOverrides(overrides);

  /** @type {Map<string, { action: string, client: string[], openapi: string[] }>} */
  const mapByAction = new Map();
  for (const entry of map) {
    if (mapByAction.has(entry.action)) {
      throw new CoverageError(
        `Duplicate coverage-map action: ${entry.action}`,
        'Duplicate action in docs/coverage-map.yaml',
      );
    }
    mapByAction.set(entry.action, entry);
  }

  /** @type {Set<string>} */
  const actionNames = new Set();
  if (Object.keys(catalogs).length) {
    for (const [tool, actions] of Object.entries(catalogs)) {
      for (const action of actions) {
        actionNames.add(`${tool}.${action}`);
      }
    }

    const missingFromCatalog = map
      .map((entry) => entry.action)
      .filter((action) => !actionNames.has(action));
    if (missingFromCatalog.length) {
      throw new CoverageError(
        `coverage-map.yaml actions missing from *ActionsCatalog: ${missingFromCatalog.join(', ')}`,
        'coverage-map.yaml lists actions missing from *ActionsCatalog exports',
      );
    }
  } else {
    for (const entry of map) actionNames.add(entry.action);
    for (const action of byAction.keys()) actionNames.add(action);
  }

  /** @type {Array<{ action: string, client: string, openapi: string, bucket: string, reason: string }>} */
  const rows = [];
  /** @type {Set<string>} */
  const linkedOpenApiKeys = new Set();

  for (const action of [...actionNames].sort()) {
    const mapEntry = mapByAction.get(action);
    const client = (mapEntry?.client ?? []).join(', ');
    const openapiKeys = mapEntry?.openapi ?? [];
    const openapi = openapiKeys.join(', ');

    if (byAction.has(action)) {
      const override = byAction.get(action);
      rows.push({
        action,
        client,
        openapi,
        bucket: override.bucket,
        reason: override.reason,
      });
      for (const key of openapiKeys) linkedOpenApiKeys.add(key);
      continue;
    }

    let bucket = 'gap';
    let reason = '';

    if (openapiKeys.length === 0) {
      bucket = 'gap';
      reason = 'No OpenAPI mapping in coverage-map.yaml';
    } else {
      const overridesForKeys = openapiKeys
        .map((key) => byOpenApiKey.get(key))
        .filter(Boolean);
      const uniqueBuckets = new Set(overridesForKeys.map((o) => o.bucket));

      if (
        overridesForKeys.length &&
        uniqueBuckets.size === 1 &&
        overridesForKeys.length === openapiKeys.length
      ) {
        bucket = overridesForKeys[0].bucket;
        reason = overridesForKeys[0].reason;
      } else if (overridesForKeys.length) {
        throw new CoverageError(
          `Conflicting/partial OpenAPI overrides for ${action}: use action_overrides`,
          'Conflicting OpenAPI overrides in docs/coverage-overrides.yaml — use action_overrides',
        );
      } else if (openapiKeys.every((key) => opKeys.has(key))) {
        bucket = 'covered';
        reason = '';
      } else {
        bucket = 'gap';
        reason = 'Mapped OpenAPI key missing from dereferenced spec';
      }
    }

    rows.push({ action, client, openapi, bucket, reason });
    for (const key of openapiKeys) linkedOpenApiKeys.add(key);
  }

  for (const [key, override] of byOpenApiKey) {
    if (linkedOpenApiKeys.has(key)) continue;
    rows.push({
      action: key,
      client: '',
      openapi: key,
      bucket: override.bucket,
      reason: override.reason,
    });
    linkedOpenApiKeys.add(key);
  }

  for (const op of operations) {
    if (linkedOpenApiKeys.has(op.key) || byOpenApiKey.has(op.key)) continue;
    rows.push({
      action: op.key,
      client: '',
      openapi: op.key,
      bucket: 'gap',
      reason: 'OpenAPI operation has no MCP action mapping',
    });
  }

  return rows;
}
