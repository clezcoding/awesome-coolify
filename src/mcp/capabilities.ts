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
  diagnose_logs: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'One-shot app diagnose + bounded log tail via diagnose.logs (MCP composite; not a Coolify REST endpoint)',
  },
  intelligence_scorecard: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'MCP composite instance health scorecard on Coolify 4.1.x reads (not a Coolify REST endpoint)',
  },
  intelligence_graph: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'MCP composite live dependency graph on Coolify 4.1.x reads (not a Coolify REST endpoint)',
  },
  intelligence_impact: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'MCP composite advisory impact analysis on Coolify 4.1.x reads (not a Coolify REST endpoint)',
  },
  intelligence_janitor: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'MCP composite read-only orphan/stopped cleanup candidates (not a Coolify REST endpoint)',
  },
  intelligence_cleanup: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'MCP composite confirm-gated cleanup reusing domain delete handlers (not a Coolify REST endpoint)',
  },
  manifest_audit: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'MCP composite manifest drift audit on Coolify 4.1.x reads (not a Coolify REST endpoint)',
  },
  envs_promote: {
    supported: true,
    coolify_min_version: '4.1.2',
    note: 'MCP cross-environment env promotion preview/apply via existing env CRUD (not a Coolify REST endpoint)',
  },
} as const satisfies Record<
  string,
  { supported: boolean; coolify_min_version: string; note?: string }
>;
