/**
 * Three-layer join + four-bucket classification (maintainer/CI only).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    .map((part) => part.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
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
    const catalogMatch = source.match(
      /export const \w+ActionsCatalog\s*=\s*([\s\S]*?);/,
    );
    if (!catalogMatch) continue;

    // ponytail: concat-aware — application/database catalogs span `'...' + '...'` segments
    const catalogText = [...catalogMatch[1].matchAll(/(['"`])([\s\S]*?)\1/g)]
      .map((m) => m[2])
      .join('');
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
  const mapByAction = new Map(map.map((entry) => [entry.action, entry]));

  /** @type {Set<string>} */
  const actionNames = new Set();
  if (Object.keys(catalogs).length) {
    for (const [tool, actions] of Object.entries(catalogs)) {
      for (const action of actions) {
        actionNames.add(`${tool}.${action}`);
      }
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
      const openapiOverride = openapiKeys
        .map((key) => byOpenApiKey.get(key))
        .find(Boolean);

      if (openapiOverride) {
        bucket = openapiOverride.bucket;
        reason = openapiOverride.reason;
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
