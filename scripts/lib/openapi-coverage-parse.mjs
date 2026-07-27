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
  const { schema, errors } = await dereference(rawJson);
  if (errors?.length) {
    throw new Error(`OpenAPI dereference failed: ${errors.length} errors`);
  }

  /** @type {Array<{ key: string, operationId?: string, tags?: string[] }>} */
  const operations = [];

  for (const [path, item] of Object.entries(schema?.paths ?? {})) {
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

  return operations;
}
