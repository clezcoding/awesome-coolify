import https from 'node:https';
import { ofetch } from 'ofetch';

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

export function createCoolifyClient(
  url: string,
  token: string,
  verifySsl = true,
) {
  return ofetch.create({
    baseURL: `${url.replace(/\/$/, '')}/api/v1`,
    ...createFetchOptions(token, verifySsl),
  });
}

export async function fetchHealth(
  url: string,
  token: string,
  verifySsl = true,
): Promise<void> {
  const baseUrl = url.replace(/\/$/, '');
  const options = createFetchOptions(token, verifySsl);
  const rawFetch = ofetch.create(options);

  try {
    await rawFetch(`${baseUrl}/api/health`, { method: 'GET' });
  } catch {
    await rawFetch(`${baseUrl}/api/v1/version`, { method: 'GET' });
  }
}
