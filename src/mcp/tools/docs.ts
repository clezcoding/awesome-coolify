import * as z from 'zod/v4';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import { sharedReadParamsSchema } from './shared-read-params.js';

export const docsActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('search'),
    query: z.string().describe('Documentation search query'),
    ...sharedReadParamsSchema,
    // D-21 N/A: projection/include_full — docs are static text, not API resource projections
    // D-21 N/A: page/per_page — results capped by query relevance; pagination not applicable
  }),
]);

export type DocsAction = z.infer<typeof docsActionSchema>;

export interface DocEntry {
  title: string;
  keywords: string[];
  content: string;
}

export const DOCS_INDEX: DocEntry[] = [
  {
    title: 'How to configure custom domain (FQDN)',
    keywords: ['fqdn', 'domain', 'ssl', 'custom domain', 'dns'],
    content:
      'To configure a custom domain in Coolify:\n1. Open your application settings.\n2. Locate the FQDN field.\n3. Input your domain (e.g., https://example.com).\n4. Ensure your DNS A/CNAME records point to your Coolify server IP.\n5. Coolify will automatically provision a Let\'s Encrypt SSL certificate.',
  },
  {
    title: 'Troubleshooting application deployment failures',
    keywords: ['failure', 'deploy', 'error', 'logs', 'rebuild'],
    content:
      'Common deployment troubleshooting steps:\n1. Check application build logs via the deployment details.\n2. Verify the Dockerfile or Build Pack settings.\n3. Ensure the server has enough free memory and disk space.\n4. Check if environment variables are correctly set.\n5. Try restarting the Docker daemon on the host if builds hang.',
  },
  {
    title: 'Database backups and restoration',
    keywords: ['database', 'backup', 'restore', 'postgres', 'mysql', 's3'],
    content:
      'Coolify database backup configuration:\n1. Go to your Database resource page.\n2. Click on the Backups tab.\n3. Configure backup frequency (cron expression) and storage location (e.g., local or S3).\n4. Click "Backup Now" to trigger an instant backup.\n5. Restoration can be performed from the backup history list.',
  },
  {
    title: 'Environment variables configuration',
    keywords: ['env', 'environment', 'variables', 'secrets', 'config'],
    content:
      'Managing environment variables in Coolify:\n1. Open the resource (application, service, or database).\n2. Navigate to the Environment Variables section.\n3. Add key-value pairs; mark sensitive values as secrets.\n4. Redeploy or restart the resource for changes to take effect.\n5. Use preview deployments to test env changes before production.',
  },
  {
    title: 'Server setup and validation',
    keywords: ['server', 'setup', 'install', 'validate', 'ssh', 'reachable'],
    content:
      'Setting up a Coolify server:\n1. Add a new server in Coolify with SSH credentials or use localhost.\n2. Run the validation script to confirm Docker and dependencies.\n3. Ensure ports 80, 443, and 8000 are accessible.\n4. Check server reachability in the Servers dashboard.\n5. Assign projects and resources to the validated server.',
  },
  {
    title: 'Docker disk cleanup and maintenance',
    keywords: ['docker', 'cleanup', 'disk', 'prune', 'storage', 'space'],
    content:
      'Freeing disk space on Coolify hosts:\n1. SSH into the server and run `docker system prune -a` cautiously.\n2. Remove unused images and stopped containers via Coolify maintenance tools.\n3. Monitor disk usage in the server metrics panel.\n4. Schedule periodic cleanup for build cache accumulation.\n5. Move large volumes to external storage if needed.',
  },
  {
    title: 'Health checks and monitoring',
    keywords: ['health', 'monitoring', 'status', 'unhealthy', 'uptime'],
    content:
      'Understanding Coolify health status:\n1. Resources show running/stopped and healthy/unhealthy states.\n2. Check application health endpoints if configured.\n3. Review container logs for crash loops.\n4. Verify database and service dependencies are reachable.\n5. Use infrastructure overview for fleet-wide health rollup.',
  },
  {
    title: 'Git integration and webhooks',
    keywords: ['git', 'github', 'gitlab', 'webhook', 'deploy', 'branch'],
    content:
      'Connecting Git repositories to Coolify:\n1. Install the Coolify GitHub App or add deploy keys.\n2. Select repository and branch for automatic deployments.\n3. Configure webhook URL in your Git provider if manual.\n4. Enable auto-deploy on push for continuous delivery.\n5. Use manual deploy for controlled release windows.',
  },
  {
    title: 'Resource limits and scaling',
    keywords: ['limits', 'memory', 'cpu', 'scaling', 'resources', 'containers'],
    content:
      'Configuring resource limits:\n1. Set memory and CPU limits per container in resource settings.\n2. Monitor usage to avoid OOM kills during builds.\n3. Scale horizontally by adding replicas where supported.\n4. Adjust server capacity before increasing limits.\n5. Review deployment logs when limits cause restarts.',
  },
  {
    title: 'Multi-server deployments',
    keywords: ['multi-server', 'cluster', 'destination', 'remote', 'distributed'],
    content:
      'Deploying across multiple servers:\n1. Register each server in Coolify and validate connectivity.\n2. Assign destinations per project or resource.\n3. Use server-specific environment overrides when needed.\n4. Monitor each server\'s resource utilization independently.\n5. Failover requires manual redeploy to alternate server.',
  },
  {
    title: 'SSL certificate troubleshooting',
    keywords: ['ssl', 'tls', 'certificate', 'letsencrypt', 'https', 'fqdn'],
    content:
      'Fixing SSL certificate issues:\n1. Confirm FQDN DNS points to the correct server IP.\n2. Ensure ports 80 and 443 are open for ACME challenges.\n3. Check Coolify proxy logs for certificate renewal errors.\n4. Remove stale certificates and trigger regeneration.\n5. Use custom certificates if Let\'s Encrypt is blocked.',
  },
];

export type DocsSearchResult = ReadResponse<DocEntry[]>;

function searchDocsIndex(query: string): DocEntry[] {
  const q = query.toLowerCase();
  return DOCS_INDEX.filter(
    (doc) =>
      doc.title.toLowerCase().includes(q) ||
      doc.keywords.some((keyword) => keyword.toLowerCase().includes(q)) ||
      doc.content.toLowerCase().includes(q),
  );
}

export async function handleDocsAction(
  args: DocsAction,
): Promise<DocsSearchResult> {
  const parsed = docsActionSchema.parse(args);
  const matches = searchDocsIndex(parsed.query);

  if (matches.length === 0) {
    const notice = `No documentation matches found for "${parsed.query}".`;
    const response = buildReadResponse({ message: notice }, {
      format: parsed.format,
      max_chars: parsed.max_chars,
      total: 0,
    });
    return { ...response, data: [] };
  }

  return buildReadResponse(matches, {
    format: parsed.format,
    max_chars: parsed.max_chars,
    total: matches.length,
  });
}
