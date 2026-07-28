export const COOLIFY_412_CAPABILITIES = {
  application_logs: {
    supported: true,
    coolify_min_version: '4.0.0',
    note: 'Runtime logs via application.logs + uuid (GET /applications/{uuid}/logs)',
  },
  deployment_logs: {
    supported: true,
    coolify_min_version: '4.1.0',
    note: 'Build logs via deployment.logs or GET /deployments/{uuid} logs field',
  },
  deployment_watch: {
    supported: true,
    coolify_min_version: '4.1.0',
    note: 'Bounded deploy polling via deployment.watch (MCP)',
  },
  deploy_watch: {
    supported: true,
    coolify_min_version: '4.1.0',
    note: 'Legacy sync polling via application.deploy wait:true (prefer deployment.watch)',
  },
  application_logs_follow: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'Bounded runtime log follow via application.logs follow:true (MCP polling on GET /applications/{uuid}/logs)',
  },
} as const satisfies Record<
  string,
  { supported: boolean; coolify_min_version: string; note?: string }
>;
