/**
 * OpenAPI spec parse + operation index (maintainer/CI only).
 */
import { dereference } from '@scalar/openapi-parser';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Dereference committed OpenAPI JSON and enumerate METHOD /path keys.
 *
 * @param {string} rawJson
 * @returns {Promise<Array<{ key: string, operationId?: string, tags?: string[] }>>}
 */
export async function indexOpenApiOperations(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('OpenAPI JSON parse failed — check docs/coolify_openapi.json');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('OpenAPI document must be a non-array object');
  }

  const { schema, errors } = await dereference(rawJson);
  if (errors?.length) {
    throw new Error(`OpenAPI dereference failed: ${errors.length} errors`);
  }
  if (!schema?.paths || typeof schema.paths !== 'object') {
    throw new Error(
      'OpenAPI dereference produced no paths — check docs/coolify_openapi.json',
    );
  }

  /** @type {Array<{ key: string, operationId?: string, tags?: string[] }>} */
  const operations = [];

  for (const [path, item] of Object.entries(schema.paths)) {
    if (!item || typeof item !== 'object') continue;

    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;

      operations.push({
        key: `${method.toUpperCase()} ${path}`,
        operationId: op.operationId,
        tags: op.tags,
      });
    }
  }

  if (operations.length === 0) {
    throw new Error('OpenAPI spec contains no HTTP operations');
  }

  return operations;
}
