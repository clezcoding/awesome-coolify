import https from 'node:https';
import { ofetch } from 'ofetch';
import {
  CoolifyApiError,
  mapApiError,
  RECOVERY_HINTS,
  toStructuredError,
} from '../utils/errors.js';
import { redactSecrets } from '../utils/redact.js';

const MAX_RETRIES = 3;

function createFetchOptions(token: string, verifySsl: boolean) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    ...(verifySsl
      ? {}
      : {
          agent: new https.Agent({ rejectUnauthorized: false }),
        }),
  };
}

function createRetryOptions(token: string, verifySsl: boolean) {
  return {
    retry: MAX_RETRIES,
    retryDelay: (context: { options: { retry?: number } }) =>
      1000 * 2 ** (MAX_RETRIES - (context.options.retry ?? 0)),
    retryStatusCodes: [429, 500, 502, 503, 504],
    ...createFetchOptions(token, verifySsl),
    onResponseError({
      response,
    }: {
      response: { status: number };
    }) {
      mapApiError(null, response.status);
    },
    onRequestError({ error }: { error: unknown }) {
      if (error instanceof Error) {
        error.message = redactSecrets(error.message);
      }
      mapApiError(error);
    },
  };
}

function withMappedErrors<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw new CoolifyApiError(toStructuredError(error));
    }
  }) as T;
}

export function createAuthenticatedFetch(token: string, verifySsl = true) {
  return withMappedErrors(
    ofetch.create(createRetryOptions(token, verifySsl)),
  );
}

export function createCoolifyClient(
  url: string,
  token: string,
  verifySsl = true,
) {
  return withMappedErrors(
    ofetch.create({
      baseURL: `${url.replace(/\/$/, '')}/api/v1`,
      ...createRetryOptions(token, verifySsl),
    }),
  );
}

export async function fetchHealth(
  url: string,
  token: string,
  verifySsl = true,
): Promise<void> {
  const baseUrl = url.replace(/\/$/, '');
  const rawFetch = createAuthenticatedFetch(token, verifySsl);

  try {
    await rawFetch(`${baseUrl}/api/health`, { method: 'GET' });
  } catch {
    await rawFetch(`${baseUrl}/api/v1/version`, { method: 'GET' });
  }
}

export async function fetchVersion(
  url: string,
  token: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/version');
}

export async function fetchResources(
  url: string,
  token: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client('/resources', { method: 'GET' });
  return Array.isArray(result) ? result : [];
}

export async function fetchServers(
  url: string,
  token: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client('/servers', { method: 'GET' });
  return Array.isArray(result) ? result : [];
}

export async function fetchProjects(
  url: string,
  token: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client('/projects', { method: 'GET' });
  return Array.isArray(result) ? result : [];
}

export async function fetchProject(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/projects/${uuid}`, { method: 'GET' });
}

export async function createProject(
  url: string,
  token: string,
  payload: { name: string; description?: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  const body = {
    name: payload.name,
    ...(payload.description ? { description: payload.description } : {}),
  };
  return client('/projects', { method: 'POST', body });
}

export async function updateProject(
  url: string,
  token: string,
  uuid: string,
  payload: { name?: string; description?: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  const body: Record<string, string> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  return client(`/projects/${uuid}`, { method: 'PATCH', body });
}

export async function deleteProject(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/projects/${uuid}`, { method: 'DELETE' });
}

export async function fetchEnvironments(
  url: string,
  token: string,
  projectUuid: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(`/projects/${projectUuid}/environments`, {
    method: 'GET',
  });
  return Array.isArray(result) ? result : [];
}

export async function fetchEnvironment(
  url: string,
  token: string,
  projectUuid: string,
  nameOrUuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/projects/${projectUuid}/${nameOrUuid}`, { method: 'GET' });
}

export async function createEnvironment(
  url: string,
  token: string,
  projectUuid: string,
  payload: { name: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/projects/${projectUuid}/environments`, {
    method: 'POST',
    body: payload,
  });
}

export async function deleteEnvironment(
  url: string,
  token: string,
  projectUuid: string,
  nameOrUuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/projects/${projectUuid}/environments/${nameOrUuid}`, {
    method: 'DELETE',
  });
}

export async function fetchApplication(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}`, { method: 'GET' });
}

export async function fetchApplicationLogs(
  url: string,
  token: string,
  uuid: string,
  lines = 100,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}/logs`, {
    method: 'GET',
    query: { lines },
  });
}

export async function createPublicApplication(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/applications/public', { method: 'POST', body: payload });
}

export async function createPrivateGithubAppApplication(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/applications/private-github-app', {
    method: 'POST',
    body: payload,
  });
}

export async function createPrivateDeployKeyApplication(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/applications/private-deploy-key', {
    method: 'POST',
    body: payload,
  });
}

export async function createDockerfileApplication(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/applications/dockerfile', { method: 'POST', body: payload });
}

export async function createDockerimageApplication(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/applications/dockerimage', { method: 'POST', body: payload });
}

export async function updateApplication(
  url: string,
  token: string,
  uuid: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}`, { method: 'PATCH', body: payload });
}

export async function deleteApplication(
  url: string,
  token: string,
  uuid: string,
  params: {
    delete_configurations?: boolean;
    delete_volumes?: boolean;
    docker_cleanup?: boolean;
    delete_connected_networks?: boolean;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}`, {
    method: 'DELETE',
    query: params,
  });
}

export async function fetchService(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/services/${uuid}`, { method: 'GET' });
}

export async function fetchDatabase(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${uuid}`, { method: 'GET' });
}

export async function createService(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/services', { method: 'POST', body: payload });
}

export async function updateService(
  url: string,
  token: string,
  uuid: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/services/${uuid}`, { method: 'PATCH', body: payload });
}

export async function deleteService(
  url: string,
  token: string,
  uuid: string,
  params: {
    delete_configurations?: boolean;
    delete_volumes?: boolean;
    docker_cleanup?: boolean;
    delete_connected_networks?: boolean;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/services/${uuid}`, {
    method: 'DELETE',
    query: params,
  });
}

export async function createPostgresqlDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/postgresql', { method: 'POST', body: payload });
}

export async function createMysqlDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/mysql', { method: 'POST', body: payload });
}

export async function createMariadbDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/mariadb', { method: 'POST', body: payload });
}

export async function createMongodbDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/mongodb', { method: 'POST', body: payload });
}

export async function createRedisDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/redis', { method: 'POST', body: payload });
}

export async function createClickhouseDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/clickhouse', { method: 'POST', body: payload });
}

export async function createDragonflyDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/dragonfly', { method: 'POST', body: payload });
}

export async function createKeydbDatabase(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/keydb', { method: 'POST', body: payload });
}

export async function updateDatabase(
  url: string,
  token: string,
  uuid: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${uuid}`, { method: 'PATCH', body: payload });
}

export async function deleteDatabase(
  url: string,
  token: string,
  uuid: string,
  params: {
    delete_configurations?: boolean;
    delete_volumes?: boolean;
    docker_cleanup?: boolean;
    delete_connected_networks?: boolean;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${uuid}`, {
    method: 'DELETE',
    query: params,
  });
}

export async function fetchApplicationEnvs(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown[]> {
  return fetchEnvs('application', url, token, uuid, verifySsl);
}

export type ResourceType = 'application' | 'service' | 'database';

export interface Env {
  uuid: string;
  key: string;
  value: string;
  is_preview?: boolean;
  is_literal?: boolean;
  is_multiline?: boolean;
  is_shown_once?: boolean;
}

export interface EnvBulkEntry {
  key: string;
  value: string;
  is_preview?: boolean;
  is_literal?: boolean;
  is_multiline?: boolean;
  is_shown_once?: boolean;
}

export interface EnvCreatePayload extends EnvBulkEntry {}

const RESOURCE_PATH: Record<ResourceType, string> = {
  application: 'applications',
  service: 'services',
  database: 'databases',
};

function resourceEnvsPath(resource: ResourceType, uuid: string): string {
  return `/${RESOURCE_PATH[resource]}/${uuid}/envs`;
}

function rejectDatabaseIsPreview(
  resource: ResourceType,
  isPreview: boolean | undefined,
): void {
  if (resource === 'database' && isPreview === true) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message:
        'is_preview is not supported for database environment variables (D-16)',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
}

export async function fetchEnvs(
  resource: ResourceType,
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<Env[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(resourceEnvsPath(resource, uuid), {
    method: 'GET',
  });
  return Array.isArray(result) ? (result as Env[]) : [];
}

export async function createEnv(
  resource: ResourceType,
  url: string,
  token: string,
  uuid: string,
  payload: EnvCreatePayload,
  verifySsl = true,
): Promise<{ uuid: string }> {
  rejectDatabaseIsPreview(resource, payload.is_preview);
  const client = createCoolifyClient(url, token, verifySsl);
  return client(resourceEnvsPath(resource, uuid), {
    method: 'POST',
    body: payload,
  }) as Promise<{ uuid: string }>;
}

export async function updateEnvViaBulk(
  resource: ResourceType,
  url: string,
  token: string,
  uuid: string,
  entries: EnvBulkEntry[],
  verifySsl = true,
): Promise<Env[]> {
  for (const entry of entries) {
    rejectDatabaseIsPreview(resource, entry.is_preview);
  }
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(`${resourceEnvsPath(resource, uuid)}/bulk`, {
    method: 'PATCH',
    body: { data: entries },
  });
  return Array.isArray(result) ? (result as Env[]) : [];
}

export const bulkUpdateEnvs = updateEnvViaBulk;

export async function deleteEnv(
  resource: ResourceType,
  url: string,
  token: string,
  uuid: string,
  env_uuid: string,
  verifySsl = true,
): Promise<void> {
  const client = createCoolifyClient(url, token, verifySsl);
  await client(`${resourceEnvsPath(resource, uuid)}/${env_uuid}`, {
    method: 'DELETE',
  });
}

export async function fetchAppDeployments(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(`/deployments/applications/${uuid}`, {
    method: 'GET',
  });
  // Coolify 4.1.x wraps deployments in { count, deployments } envelope.
  // Older versions returned a flat array. Accept both.
  if (Array.isArray(result)) return result;
  if (
    result &&
    typeof result === 'object' &&
    Array.isArray((result as { deployments?: unknown }).deployments)
  ) {
    return (result as { deployments: unknown[] }).deployments;
  }
  return [];
}

export async function fetchServer(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/servers/${uuid}`, { method: 'GET' });
}

export async function fetchServerResources(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(`/servers/${uuid}/resources`, { method: 'GET' });
  return Array.isArray(result) ? result : [];
}

export async function fetchServerDomains(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(`/servers/${uuid}/domains`, { method: 'GET' });
  return Array.isArray(result) ? result : [];
}

export async function triggerServerValidate(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<void> {
  const client = createCoolifyClient(url, token, verifySsl);
  await client(`/servers/${uuid}/validate`, { method: 'GET' });
}

export async function fetchPrivateKeys(
  url: string,
  token: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client('/security/keys', { method: 'GET' });
  return Array.isArray(result) ? result : [];
}

export async function fetchPrivateKey(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/security/keys/${uuid}`, { method: 'GET' });
}

export async function createPrivateKey(
  url: string,
  token: string,
  payload: { name: string; private_key: string; description?: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/security/keys', { method: 'POST', body: payload });
}

export async function updatePrivateKey(
  url: string,
  token: string,
  uuid: string,
  payload: { name?: string; description?: string; private_key?: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/security/keys/${uuid}`, { method: 'PATCH', body: payload });
}

export async function deletePrivateKey(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/security/keys/${uuid}`, { method: 'DELETE' });
}

export interface CreateServerPayload {
  name: string;
  ip: string;
  port: number;
  user: string;
  private_key_uuid: string;
  is_build_server?: boolean;
  instant_validate?: boolean;
  proxy_type?: string;
  description?: string;
  concurrent_builds?: number;
  dynamic_timeout?: number;
}

export async function createServer(
  url: string,
  token: string,
  payload: CreateServerPayload,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/servers', { method: 'POST', body: payload });
}

export async function updateServer(
  url: string,
  token: string,
  uuid: string,
  payload: Partial<CreateServerPayload>,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/servers/${uuid}`, { method: 'PATCH', body: payload });
}

export async function deleteServer(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
  delete_volumes = false,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/servers/${uuid}`, {
    method: 'DELETE',
    query: { delete_volumes },
  });
}

export async function validateServer(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/servers/${uuid}/validate`, { method: 'GET' });
}

/**
 * Polls a server fetcher until settings.is_reachable is true or timeout elapses.
 * Default timeout is 30s per Phase 8 research (Open Question 1).
 * Returns the last-seen server on timeout — caller decides soft-success vs pending.
 */
export async function pollServerUntilReachable(
  fetcher: () => Promise<Record<string, unknown>>,
  timeoutMs = 30000,
  intervalMs = 2000,
): Promise<Record<string, unknown>> {
  const start = Date.now();
  let lastServer: Record<string, unknown> = {};

  while (Date.now() - start < timeoutMs) {
    lastServer = await fetcher();
    const reachable = (
      lastServer.settings as { is_reachable?: boolean } | undefined
    )?.is_reachable;
    if (reachable === true) {
      return lastServer;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return lastServer;
}

export async function triggerAppStart(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}/start`, { method: 'POST' });
}

export async function triggerAppStop(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}/stop`, { method: 'POST' });
}

export async function triggerAppRestart(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}/restart`, { method: 'POST' });
}

export async function triggerServiceStart(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/services/${uuid}/start`, { method: 'POST' });
}

export async function triggerServiceStop(
  url: string,
  token: string,
  uuid: string,
  dockerCleanup = false,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/services/${uuid}/stop`, {
    method: 'POST',
    query: dockerCleanup ? { docker_cleanup: true } : { docker_cleanup: false },
  });
}

export async function triggerServiceRestart(
  url: string,
  token: string,
  uuid: string,
  latest = false,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/services/${uuid}/restart`, {
    method: 'POST',
    query: latest ? { latest: true } : undefined,
  });
}

export async function triggerDatabaseStart(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${uuid}/start`, { method: 'POST' });
}

export async function triggerDatabaseStop(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${uuid}/stop`, { method: 'POST' });
}

export async function triggerDatabaseRestart(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${uuid}/restart`, { method: 'POST' });
}

export async function triggerDeploy(
  url: string,
  token: string,
  uuid: string,
  force = false,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/deploy', { method: 'POST', query: { uuid, force } });
}

export async function fetchDeployment(
  url: string,
  token: string,
  deploymentUuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/deployments/${deploymentUuid}`, { method: 'GET' });
}

export async function cancelDeployment(
  url: string,
  token: string,
  deploymentUuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/deployments/${deploymentUuid}/cancel`, { method: 'POST' });
}

export { createRetryOptions, createFetchOptions };
