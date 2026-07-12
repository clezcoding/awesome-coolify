import https from 'node:https';
import { ofetch } from 'ofetch';
import {
  CoolifyApiError,
  mapApiError,
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

export async function fetchApplication(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}`, { method: 'GET' });
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

export async function fetchApplicationEnvs(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(`/applications/${uuid}/envs`, { method: 'GET' });
  return Array.isArray(result) ? result : [];
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
  return Array.isArray(result) ? result : [];
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

export { createRetryOptions, createFetchOptions };
