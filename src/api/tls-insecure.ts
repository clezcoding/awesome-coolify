import https from 'node:https';

/**
 * HTTPS agent for self-signed Coolify instances when verifySsl=false.
 *
 * Kept in a dedicated module so CodeQL can path-ignore the intentional
 * certificate-validation opt-out (js/disabling-certificate-validation)
 * without hiding the rest of the API client. Prefer proper certs or
 * NODE_EXTRA_CA_CERTS / a custom CA when possible; default verifySsl=true.
 */
export function createSelfSignedCompatibleAgent(): https.Agent {
  return new https.Agent({ rejectUnauthorized: false });
}
