import * as z from 'zod/v4';
import {
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import type { EnvConfig } from '../config/env.js';
import {
  createDockerfileApplication,
  createDockerimageApplication,
  createPrivateDeployKeyApplication,
  createPrivateGithubAppApplication,
  createPublicApplication,
  fetchApplication,
  fetchApplicationLogs,
  fetchDeployment,
  fetchResources,
  triggerAppRestart,
  triggerAppStart,
  triggerAppStop,
  triggerDeploy,
  updateApplication,
  deleteApplication,
  fetchEnvs,
  createEnv,
  updateEnvViaBulk,
  bulkUpdateEnvs,
  deleteEnv,
  type Env,
  type EnvBulkEntry,
} from '../../api/client.js';
import {
  buildProjectEnvironmentIndex,
  resolveProjectUuid,
} from '../../utils/project-lookup.js';
import {
  projectApplicationSummary,
  projectDeploymentSummary,
  projectResourceSummary,
  resolveProjection,
  sanitizeFullProjection,
  type ApplicationSummary,
} from '../../utils/projections.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type CoolifyErrorCode,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  capLogOutput,
  parseBuildLogEntries,
  sliceLogBlob,
} from '../../utils/log-helpers.js';
import {
  rejectTableFormatOnFullProjection,
  sharedLogParamsSchema,
  sharedReadParamsSchema,
} from './shared-read-params.js';
import { generateHints, logsAvailableHint } from '../../utils/diagnose-hints.js';
import { pollDeploymentUntilTerminal } from '../../utils/deploy-poll.js';
import {
  FIND_MATCH_CAP,
  matchesExplicitFields,
  rankFindMatches,
  type FindableResource,
} from './resource.js';
import {
  parseEnvFile,
  diffEnvs,
  detectConflicts,
  type Conflict,
  type ConflictPolicy,
  type DiffResult,
  type ParsedEnv,
} from '../../utils/env-parser.js';

const MUTATION_IDENTIFIER_FIELDS = ['uuid', 'name', 'fqdn'] as const;

const DEPLOY_IDENTIFIER_FIELDS = [
  'uuid',
  'name',
  'fqdn',
  'uuids',
  'tags',
  'tag',
] as const;

const mutationResponseParamsSchema = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .default('pretty')
    .optional()
    .describe('Output format (default pretty)'),
  max_chars: z
    .number()
    .int()
    .positive()
    .default(16000)
    .optional()
    .describe('Max formatted output characters (default 16000)'),
};

function hasAtLeastOneIdentifier(
  data: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.some((field) => {
    const value = data[field];
    if (field === 'uuids' || field === 'tags') {
      return Array.isArray(value) && value.length > 0;
    }
    return typeof value === 'string' && value.length > 0;
  });
}

function requireMutationIdentifier<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  actionName: string,
) {
  return schema.superRefine((data, ctx) => {
    if (!hasAtLeastOneIdentifier(data, MUTATION_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message: `At least one identifier (uuid|name|fqdn) required for action ${actionName}`,
        params: { code: 'COOLIFY_422' },
      });
    }
  });
}

const startActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('start'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'start',
);

const stopActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('stop'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'stop',
);

const restartActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('restart'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'restart',
);

const deployActionSchema = z
  .object({
    action: z.literal('deploy'),
    uuid: z.string().optional().describe('Application UUID'),
    name: z.string().optional().describe('Application name substring'),
    fqdn: z.string().optional().describe('Application FQDN substring'),
    uuids: z.array(z.string()).optional().describe('Batch deploy UUIDs'),
    tags: z.array(z.string()).optional().describe('Batch deploy tags'),
    tag: z.string().optional().describe('Single tag batch expand'),
    force: z.boolean().default(false).describe('Force rebuild without cache'),
    wait: z.boolean().default(false).describe('Poll until terminal or timeout'),
    timeout: z
      .number()
      .int()
      .min(10)
      .max(1800)
      .default(300)
      .describe('Wait-mode timeout in seconds (default 300, max 1800)'),
    format: z
      .enum(['pretty', 'json', 'table'])
      .default('pretty')
      .optional()
      .describe('Output format (default pretty)'),
    max_chars: z
      .number()
      .int()
      .min(1000)
      .max(100000)
      .default(16000)
      .optional()
      .describe('Max formatted output characters (default 16000)'),
  })
  .superRefine((data, ctx) => {
    if (!hasAtLeastOneIdentifier(data, DEPLOY_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'At least one identifier (uuid|name|fqdn|uuids|tags|tag) required for action deploy',
        params: { code: 'COOLIFY_422' },
      });
    }
  });

export const applicationLogsSchema = z
  .object({
    action: z.literal('logs'),
    uuid: z
      .string()
      .optional()
      .describe(
        'Application UUID — routes to runtime logs via GET /applications/{uuid}/logs',
      ),
    name: z
      .string()
      .optional()
      .describe('Application name substring for runtime log resolution'),
    fqdn: z
      .string()
      .optional()
      .describe('Application FQDN substring for runtime log resolution'),
    deployment_uuid: z
      .string()
      .optional()
      .describe(
        'Deployment UUID — routes to build logs via GET /deployments/{uuid} inline `logs` JSON-encoded array',
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe(
        'Skip first K lines of the FLATTENED log blob before applying lines (build-logs pagination applied AFTER parse+filter+flatten)',
      ),
    ...sharedLogParamsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasRuntimeId = !!(data.uuid || data.name || data.fqdn);
    if (!hasRuntimeId && !data.deployment_uuid) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Either uuid (runtime logs) or deployment_uuid (build logs) must be provided',
        params: { code: 'COOLIFY_422' },
      });
    }
    if (hasRuntimeId && data.deployment_uuid) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Cannot provide both uuid and deployment_uuid — choose runtime OR build logs',
        params: { code: 'COOLIFY_422' },
      });
    }
  });

const createSharedFields = {
  action: z.literal('create'),
  project_uuid: z.string().optional().describe('Project UUID'),
  project_name: z.string().optional().describe('Project name for lookup'),
  environment_name: z.string().optional().describe('Environment name'),
  environment_uuid: z.string().optional().describe('Environment UUID'),
  server_uuid: z.string().describe('Server UUID (required)'),
  name: z.string().optional().describe('Application name'),
  description: z.string().optional().describe('Application description'),
  domains: z.string().optional().describe('Comma-separated domain list'),
  ports_exposes: z.string().optional().describe('Ports to expose'),
  ports_mappings: z.string().optional().describe('Port mappings'),
  instant_deploy: z
    .boolean()
    .default(false)
    .describe('Queue deploy immediately after create (fire-and-forget)'),
  force_domain_override: z
    .boolean()
    .default(false)
    .describe('Override domain conflict on create'),
  ...mutationResponseParamsSchema,
};

const gitBuildPackSchema = z
  .enum(['nixpacks', 'railpack', 'static', 'dockerfile', 'dockercompose'])
  .superRefine((val, ctx) => {
    if (val === 'dockercompose') {
      ctx.addIssue({
        code: 'custom',
        message:
          "build_pack='dockercompose' is not supported on application create — use service.create (Phase 11)",
        params: { code: 'COOLIFY_VALIDATION_ERROR' },
      });
    }
  });

function requireProjectAndEnvironment(
  data: {
    project_uuid?: string;
    project_name?: string;
    environment_name?: string;
    environment_uuid?: string;
  },
  ctx: z.RefinementCtx,
): void {
  if (!data.project_uuid && !data.project_name) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Either project_uuid or project_name is required for application create',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
  if (!data.environment_name && !data.environment_uuid) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Either environment_name or environment_uuid is required for application create',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

function rejectDockercomposeBuildPack(
  data: { build_pack?: string },
  ctx: z.RefinementCtx,
): void {
  if (data.build_pack === 'dockercompose') {
    ctx.addIssue({
      code: 'custom',
      message:
        "build_pack='dockercompose' is not supported on application create — use service.create (Phase 11)",
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

const publicGitCreateSchema = z
  .object({
    ...createSharedFields,
    source_type: z.literal('public_git'),
    git_repository: z.string().describe('Public git repository URL'),
    git_branch: z.string().describe('Git branch to deploy'),
    build_pack: gitBuildPackSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    requireProjectAndEnvironment(data, ctx);
    rejectDockercomposeBuildPack(data, ctx);
  });

const privateDeployKeyCreateSchema = z
  .object({
    ...createSharedFields,
    source_type: z.literal('private_deploy_key'),
    private_key_uuid: z.string().describe('Private deploy key UUID'),
    git_repository: z.string().describe('Private git repository URL'),
    git_branch: z.string().describe('Git branch to deploy'),
    build_pack: gitBuildPackSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    requireProjectAndEnvironment(data, ctx);
    rejectDockercomposeBuildPack(data, ctx);
  });

const privateGithubAppCreateSchema = z
  .object({
    ...createSharedFields,
    source_type: z.literal('private_github_app'),
    github_app_uuid: z.string().describe('GitHub app UUID'),
    git_repository: z.string().describe('Private git repository URL'),
    git_branch: z.string().describe('Git branch to deploy'),
    build_pack: gitBuildPackSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    requireProjectAndEnvironment(data, ctx);
    rejectDockercomposeBuildPack(data, ctx);
  });

const dockerfileCreateSchema = z
  .object({
    ...createSharedFields,
    source_type: z.literal('dockerfile'),
    dockerfile: z.string().describe('Dockerfile content'),
    build_pack: z.literal('dockerfile').optional(),
  })
  .strict()
  .superRefine(requireProjectAndEnvironment);

const dockerimageCreateSchema = z
  .object({
    ...createSharedFields,
    source_type: z.literal('dockerimage'),
    docker_registry_image_name: z
      .string()
      .describe('Docker registry image name'),
    docker_registry_image_tag: z
      .string()
      .optional()
      .describe('Docker registry image tag'),
  })
  .strict()
  .superRefine(requireProjectAndEnvironment);

const createActionSchema = z.discriminatedUnion('source_type', [
  publicGitCreateSchema,
  privateDeployKeyCreateSchema,
  privateGithubAppCreateSchema,
  dockerfileCreateSchema,
  dockerimageCreateSchema,
]);

const updateBuildPackSchema = z
  .enum(['nixpacks', 'railpack', 'static', 'dockerfile', 'dockercompose'])
  .optional()
  .superRefine((val, ctx) => {
    if (val === 'dockercompose') {
      ctx.addIssue({
        code: 'custom',
        message:
          "build_pack='dockercompose' is not supported on application update — use service.update (Phase 11)",
        params: { code: 'COOLIFY_VALIDATION_ERROR' },
      });
    }
  });

const updateActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('update'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring or new name'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      description: z.string().optional().describe('Application description'),
      domains: z.string().optional().describe('Comma-separated domain list'),
      git_repository: z.string().optional().describe('Git repository URL'),
      git_branch: z.string().optional().describe('Git branch'),
      git_commit_sha: z.string().optional().describe('Git commit SHA'),
      build_pack: updateBuildPackSchema.describe('Build pack'),
      docker_registry_image_name: z
        .string()
        .optional()
        .describe('Docker registry image name'),
      docker_registry_image_tag: z
        .string()
        .optional()
        .describe('Docker registry image tag'),
      is_static: z.boolean().optional().describe('Static site flag'),
      is_spa: z.boolean().optional().describe('Single-page application flag'),
      is_auto_deploy_enabled: z.boolean().optional().describe('Auto-deploy on push'),
      is_force_https_enabled: z
        .boolean()
        .optional()
        .describe('Force HTTPS redirect'),
      install_command: z.string().optional().describe('Install command'),
      build_command: z.string().optional().describe('Build command'),
      start_command: z.string().optional().describe('Start command'),
      ports_exposes: z.string().optional().describe('Ports to expose'),
      ports_mappings: z.string().optional().describe('Port mappings'),
      base_directory: z.string().optional().describe('Base directory'),
      publish_directory: z.string().optional().describe('Publish directory'),
      health_check_enabled: z.boolean().optional().describe('Health check enabled'),
      health_check_path: z.string().optional().describe('Health check path'),
      health_check_port: z.string().optional().describe('Health check port'),
      health_check_host: z.string().optional().describe('Health check host'),
      health_check_method: z.string().optional().describe('Health check HTTP method'),
      health_check_return_code: z
        .number()
        .int()
        .optional()
        .describe('Expected health check status code'),
      health_check_scheme: z.string().optional().describe('Health check scheme'),
      health_check_response_text: z
        .string()
        .optional()
        .describe('Expected health check response text'),
      health_check_interval: z
        .number()
        .int()
        .optional()
        .describe('Health check interval seconds'),
      health_check_timeout: z
        .number()
        .int()
        .optional()
        .describe('Health check timeout seconds'),
      health_check_retries: z
        .number()
        .int()
        .optional()
        .describe('Health check retries'),
      health_check_start_period: z
        .number()
        .int()
        .optional()
        .describe('Health check start period seconds'),
      custom_labels: z.string().optional().describe('Custom Docker labels'),
      custom_docker_run_options: z
        .string()
        .optional()
        .describe('Custom docker run options'),
      redirect: z
        .enum(['www', 'non-www', 'both'])
        .optional()
        .describe('WWW redirect mode'),
      watch_paths: z.string().optional().describe('Git watch paths'),
      use_build_server: z.boolean().optional().describe('Use build server'),
      is_preserve_repository_enabled: z
        .boolean()
        .optional()
        .describe('Preserve repository on deploy'),
      connect_to_docker_network: z
        .boolean()
        .optional()
        .describe('Connect to Docker network'),
      is_container_label_escape_enabled: z
        .boolean()
        .optional()
        .describe('Container label escape enabled'),
      is_http_basic_auth_enabled: z
        .boolean()
        .optional()
        .describe('Enable HTTP basic authentication'),
      http_basic_auth_username: z
        .string()
        .optional()
        .describe('HTTP basic auth username'),
      http_basic_auth_password: z
        .string()
        .optional()
        .describe('HTTP basic auth password (caller-supplied only)'),
      force_domain_override: z
        .boolean()
        .default(false)
        .describe('Override domain conflict on update'),
      reveal: z
        .boolean()
        .default(false)
        .describe('Reveal masked secrets in full projection response'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'update',
);

const deleteActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('delete'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      confirm: z
        .boolean()
        .default(false)
        .describe('Explicit confirmation required for destructive delete'),
      delete_volumes: z
        .boolean()
        .default(false)
        .describe('Also delete attached volumes (default false)'),
      delete_configurations: z
        .boolean()
        .default(false)
        .describe('Also delete configurations (default false)'),
      docker_cleanup: z
        .boolean()
        .default(false)
        .describe('Run docker cleanup after delete (default false)'),
      delete_connected_networks: z
        .boolean()
        .default(false)
        .describe('Delete connected networks (default false)'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'delete',
);

const deletePreviewActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('delete_preview'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'delete_preview',
);

const envParentFields = {
  uuid: z.string().optional().describe('Application UUID'),
  name: z.string().optional().describe('Application name substring'),
  fqdn: z.string().optional().describe('Application FQDN substring'),
  reveal: z
    .boolean()
    .default(false)
    .describe('Reveal masked env values for this call only'),
  ...mutationResponseParamsSchema,
};

const envFlagFields = {
  is_preview: z
    .boolean()
    .default(false)
    .describe('Preview variable (build-time only)'),
  is_literal: z
    .boolean()
    .default(false)
    .describe('Treat value as literal (no variable interpolation)'),
  is_multiline: z
    .boolean()
    .default(false)
    .describe('Multiline env value'),
  is_shown_once: z
    .boolean()
    .default(false)
    .describe('Show value once in Coolify UI'),
};

function requireEnvUuidOrKey(
  data: { env_uuid?: string; key?: string },
  ctx: z.RefinementCtx,
  actionName: string,
): void {
  const hasUuid =
    typeof data.env_uuid === 'string' && data.env_uuid.length > 0;
  const hasKey = typeof data.key === 'string' && data.key.length > 0;

  if (!hasUuid && !hasKey) {
    ctx.addIssue({
      code: 'custom',
      message: `At least one of env_uuid or key is required for action ${actionName}`,
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

const envsListActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('envs:list'),
      ...envParentFields,
    })
    .strict(),
  'envs:list',
);

const envsGetActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('envs:get'),
      env_uuid: z.string().optional().describe('Environment variable UUID'),
      key: z.string().optional().describe('Environment variable key'),
      ...envParentFields,
    })
    .strict()
    .superRefine((data, ctx) => {
      requireEnvUuidOrKey(data, ctx, 'envs:get');
    }),
  'envs:get',
);

const envsCreateActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('envs:create'),
      key: z.string().describe('Environment variable key'),
      value: z.string().describe('Environment variable value'),
      ...envFlagFields,
      ...envParentFields,
    })
    .strict(),
  'envs:create',
);

const envsUpdateActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('envs:update'),
      env_uuid: z.string().optional().describe('Environment variable UUID'),
      key: z.string().optional().describe('Environment variable key'),
      value: z.string().describe('New environment variable value'),
      is_preview: z.boolean().optional().describe('Preview variable override'),
      is_literal: z.boolean().optional().describe('Literal flag override'),
      is_multiline: z.boolean().optional().describe('Multiline flag override'),
      is_shown_once: z
        .boolean()
        .optional()
        .describe('Show-once flag override'),
      ...envParentFields,
    })
    .strict()
    .superRefine((data, ctx) => {
      requireEnvUuidOrKey(data, ctx, 'envs:update');
    }),
  'envs:update',
);

const envsDeleteActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('envs:delete'),
      env_uuid: z.string().describe('Environment variable UUID to delete'),
      confirm: z
        .boolean()
        .default(false)
        .describe('Explicit confirmation required for env delete'),
      ...envParentFields,
    })
    .strict(),
  'envs:delete',
);

const envBulkEntrySchema = z
  .object({
    key: z.string().describe('Environment variable key'),
    value: z.string().describe('Environment variable value'),
    is_preview: z.boolean().optional().describe('Preview variable'),
    is_literal: z.boolean().optional().describe('Literal flag'),
    is_multiline: z.boolean().optional().describe('Multiline flag'),
    is_shown_once: z.boolean().optional().describe('Show-once flag'),
  })
  .strict();

const envsBulkUpdateActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('envs:bulk-update'),
      entries: z
        .array(envBulkEntrySchema)
        .min(1)
        .describe('Bulk env entries (min 1, soft limit ~100)'),
      confirm: z
        .boolean()
        .default(false)
        .describe('Explicit confirmation required for bulk env update'),
      ...envParentFields,
    })
    .strict(),
  'envs:bulk-update',
);

const envsSyncActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('envs:sync'),
      env_file: z
        .string()
        .optional()
        .describe('Local filesystem path to a .env file'),
      env_content: z
        .string()
        .optional()
        .describe('Inline .env file content'),
      dry_run: z
        .boolean()
        .default(false)
        .describe(
          'Preview diff only — no API writes when true (default false = apply path)',
        ),
      prune: z
        .boolean()
        .default(false)
        .describe(
          'Delete remote env keys absent from local (requires confirm:true)',
        ),
      confirm: z
        .boolean()
        .default(false)
        .describe(
          'Explicit confirmation required when applying (dry_run:false) or pruning',
        ),
      conflict_policy: z
        .union([
          z.literal('overwrite'),
          z.literal('keep_remote'),
          z.literal('abort'),
        ])
        .optional()
        .describe(
          'How to resolve value conflicts on apply — ask human if unset (D-08)',
        ),
      ...envParentFields,
    })
    .strict()
    .superRefine((data, ctx) => {
      const hasFile =
        typeof data.env_file === 'string' && data.env_file.length > 0;
      const hasContent =
        typeof data.env_content === 'string' && data.env_content.length > 0;

      if (hasFile === hasContent) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Exactly one of env_file (local path) or env_content (inline .env text) is required for envs:sync',
          params: { code: 'COOLIFY_VALIDATION_ERROR' },
        });
      }
    })
    .superRefine((data, ctx) => {
      const needsConfirm = data.dry_run === false;
      if (needsConfirm && data.confirm !== true) {
        ctx.addIssue({
          code: 'custom',
          message:
            "Action 'envs:sync' requires confirm:true when applying (dry_run:false)",
          params: { code: 'COOLIFY_CONFIRM_REQUIRED' },
        });
      }
    }),
  'envs:sync',
);

const envsActionSchema = z.discriminatedUnion('action', [
  envsListActionSchema,
  envsGetActionSchema,
  envsCreateActionSchema,
  envsUpdateActionSchema,
  envsDeleteActionSchema,
  envsBulkUpdateActionSchema,
  envsSyncActionSchema,
]);

const UPDATE_CURATED_FIELD_KEYS = [
  'name',
  'description',
  'domains',
  'git_repository',
  'git_branch',
  'git_commit_sha',
  'build_pack',
  'docker_registry_image_name',
  'docker_registry_image_tag',
  'is_static',
  'is_spa',
  'is_auto_deploy_enabled',
  'is_force_https_enabled',
  'install_command',
  'build_command',
  'start_command',
  'ports_exposes',
  'ports_mappings',
  'base_directory',
  'publish_directory',
  'health_check_enabled',
  'health_check_path',
  'health_check_port',
  'health_check_host',
  'health_check_method',
  'health_check_return_code',
  'health_check_scheme',
  'health_check_response_text',
  'health_check_interval',
  'health_check_timeout',
  'health_check_retries',
  'health_check_start_period',
  'custom_labels',
  'custom_docker_run_options',
  'redirect',
  'watch_paths',
  'use_build_server',
  'is_preserve_repository_enabled',
  'connect_to_docker_network',
  'is_container_label_escape_enabled',
  'is_http_basic_auth_enabled',
  'http_basic_auth_username',
  'http_basic_auth_password',
] as const;

const lifecycleActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get'),
    uuid: z.string().describe('Application UUID'),
    ...sharedReadParamsSchema,
  }),
  startActionSchema,
  stopActionSchema,
  restartActionSchema,
  deployActionSchema,
  applicationLogsSchema,
  updateActionSchema,
  deleteActionSchema,
  deletePreviewActionSchema,
]);

export const applicationActionSchema = z.union([
  lifecycleActionSchema,
  createActionSchema,
  envsActionSchema,
]);

export type ApplicationAction = z.infer<typeof applicationActionSchema>;

export type ApplicationGetResult = ReadResponse<
  ApplicationSummary | ReturnType<typeof sanitizeFullProjection>
>;

export type ApplicationMutationResult = ReadResponse<{
  uuid: string;
  action: 'start' | 'stop' | 'restart';
  status: 'requested';
}>;

export type ApplicationDeployResult = ReadResponse<
  | {
      uuid?: string;
      deployment_uuid: string;
      status: string;
      force?: boolean;
      commit?: string;
      created_at?: string;
      finished_at?: string;
      logs_available: ReturnType<typeof logsAvailableHint>;
      hint?: string;
    }
  | {
      results: Array<
        | {
            uuid: string;
            deployment_uuid?: string;
            status: string;
            force?: boolean;
            commit?: string;
            created_at?: string;
            finished_at?: string;
            logs_available?: ReturnType<typeof logsAvailableHint>;
            hint?: string;
            error?: string;
          }
        | {
            tag: string;
            status: 'failed';
            error: string;
          }
      >;
    }
>;

export type ApplicationLogsResult = ReadResponse<{
  uuid?: string;
  deployment_uuid?: string;
  status?: string;
  logs_lines: string[];
  logs_truncated: boolean;
  total_lines: number;
  entries_total?: number;
  entries_hidden?: number;
  entries_shown?: number;
}>;

export type ApplicationCreateResult = ReadResponse<{
  uuid: string;
  ok?: boolean;
  deploy?: {
    status: 'queued' | 'not_triggered' | 'failed_to_queue';
    deployment_uuid?: string;
    error?: string;
  };
  logs_available?: ReturnType<typeof logsAvailableHint>;
  hints?: string[];
  recoveryHints?: string[];
}>;

export type ApplicationUpdateResult = ReadResponse<
  ReturnType<typeof sanitizeFullProjection>
>;

export type ApplicationDeleteResult = ReadResponse<{
  ok: true;
  uuid: string;
  deleted: true;
  delete_volumes: boolean;
  delete_configurations: boolean;
}>;

export type ApplicationDeletePreviewResult = ReadResponse<{
  uuid: string;
  child_resources: Array<{
    uuid: string;
    name?: string;
    type?: string;
  }>;
  would_delete: true;
  warning?: string;
}>;

export type ApplicationEnvsListResult = ReadResponse<
  Array<Record<string, unknown>>
> & { recoveryHints?: string[] };

export type ApplicationEnvsGetResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type ApplicationEnvsCreateResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type ApplicationEnvsUpdateResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type ApplicationEnvsDeleteResult = ReadResponse<{
  ok: true;
  env_uuid: string;
}> & { recoveryHints?: string[] };

export type ApplicationEnvsBulkUpdateResult = ReadResponse<{
  ok: true;
}> & { recoveryHints?: string[] };

export type ApplicationEnvsSyncResult = ReadResponse<{
  added: Array<Record<string, unknown>>;
  updated: Array<Record<string, unknown>>;
  unchanged: Array<Record<string, unknown>>;
  removed: Array<Record<string, unknown>>;
  conflicts: Conflict[];
  kept_remote?: Array<Record<string, unknown>>;
  aborted?: Array<Record<string, unknown>>;
  pruned?: Array<Record<string, unknown>>;
  dry_run: boolean;
}> & { recoveryHints?: string[] };

export type ApplicationActionResult =
  | ApplicationGetResult
  | ApplicationMutationResult
  | ApplicationDeployResult
  | ApplicationLogsResult
  | ApplicationCreateResult
  | ApplicationUpdateResult
  | ApplicationDeleteResult
  | ApplicationDeletePreviewResult
  | ApplicationEnvsListResult
  | ApplicationEnvsGetResult
  | ApplicationEnvsCreateResult
  | ApplicationEnvsUpdateResult
  | ApplicationEnvsDeleteResult
  | ApplicationEnvsBulkUpdateResult
  | ApplicationEnvsSyncResult
  | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type MutationAction = z.infer<typeof startActionSchema>;
type DeployAction = z.infer<typeof deployActionSchema>;
type LogsAction = z.infer<typeof applicationLogsSchema>;
type CreateAction = z.infer<typeof createActionSchema>;
type UpdateAction = z.infer<typeof updateActionSchema>;
type DeleteAction = z.infer<typeof deleteActionSchema>;
type DeletePreviewAction = z.infer<typeof deletePreviewActionSchema>;
type EnvsListAction = z.infer<typeof envsListActionSchema>;
type EnvsGetAction = z.infer<typeof envsGetActionSchema>;
type EnvsCreateAction = z.infer<typeof envsCreateActionSchema>;
type EnvsUpdateAction = z.infer<typeof envsUpdateActionSchema>;
type EnvsDeleteAction = z.infer<typeof envsDeleteActionSchema>;
type EnvsBulkUpdateAction = z.infer<typeof envsBulkUpdateActionSchema>;
type EnvsSyncAction = z.infer<typeof envsSyncActionSchema>;

const ASK_HUMAN_REVEAL_HINT =
  'ask_human_reveal: confirm with the human that they want revealed values before retrying with reveal: true';

function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on application '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}

function validateEnvMutationConfirm(
  confirm: boolean,
  action: string,
  uuid: string,
): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action '${action}' on application '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action,
      uuid,
    },
  });
}

function maskEnvRecord(
  env: Env,
  reveal: boolean,
): Record<string, unknown> {
  const projected = sanitizeFullProjection(env, reveal) as Record<
    string,
    unknown
  >;

  if (!reveal && typeof projected.value === 'string') {
    projected.value = '***';
  }

  return projected;
}

function maskEnvRecords(
  envs: Env[],
  reveal: boolean,
): Array<Record<string, unknown>> {
  return envs.map((env) => maskEnvRecord(env, reveal));
}

function withRevealRecoveryHints<T extends ReadResponse<unknown>>(
  response: T,
  reveal: boolean,
): T & { recoveryHints?: string[] } {
  if (!reveal) {
    return response;
  }

  return {
    ...response,
    recoveryHints: [ASK_HUMAN_REVEAL_HINT],
  };
}

function resolveEnvIdentity(
  envs: Env[],
  input: { env_uuid?: string; key?: string },
): Env {
  if (input.env_uuid) {
    const matches = envs.filter((env) => env.uuid === input.env_uuid);
    if (matches.length === 0) {
      throw new CoolifyApiError({
        code: 'COOLIFY_404',
        message: `No environment variable matched env_uuid '${input.env_uuid}'.`,
        recoveryHints: [
          'Check that the env UUID exists on this application.',
          'Use envs:list to enumerate environment variables.',
        ],
      });
    }
    if (matches.length > 1) {
      throw new CoolifyApiError({
        code: 'COOLIFY_AMBIGUOUS_MATCH',
        message:
          'Multiple environment variables matched env_uuid — refusing to mutate.',
        recoveryHints: [
          'Re-run with an explicit env_uuid from envs:list.',
        ],
      });
    }
    return matches[0];
  }

  if (input.key) {
    const matches = envs.filter((env) => env.key === input.key);
    if (matches.length === 0) {
      throw new CoolifyApiError({
        code: 'COOLIFY_404',
        message: `No environment variable matched key '${input.key}'.`,
        recoveryHints: [
          'Check that the env key exists on this application.',
          'Use envs:list to enumerate environment variables.',
        ],
      });
    }
    if (matches.length > 1) {
      throw new CoolifyApiError({
        code: 'COOLIFY_AMBIGUOUS_MATCH',
        message:
          'Multiple environment variables matched key — refusing to mutate. Re-run with env_uuid.',
        recoveryHints: [
          'Re-run with an explicit env_uuid from envs:list.',
          'Multiple env vars share this key — pass env_uuid directly.',
        ],
      });
    }
    return matches[0];
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_VALIDATION_ERROR',
    message: 'At least one of env_uuid or key is required.',
    recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
  });
}

function buildEnvBulkEntry(
  input: {
    key: string;
    value: string;
    is_preview?: boolean;
    is_literal?: boolean;
    is_multiline?: boolean;
    is_shown_once?: boolean;
  },
): EnvBulkEntry {
  const entry: EnvBulkEntry = {
    key: input.key,
    value: input.value,
  };

  if (input.is_preview !== undefined) {
    entry.is_preview = input.is_preview;
  }
  if (input.is_literal !== undefined) {
    entry.is_literal = input.is_literal;
  }
  if (input.is_multiline !== undefined) {
    entry.is_multiline = input.is_multiline;
  }
  if (input.is_shown_once !== undefined) {
    entry.is_shown_once = input.is_shown_once;
  }

  return entry;
}

function throwValidationError(error: z.ZodError, args: unknown): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code === 'string',
  );
  let code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)?.params
      ?.code as CoolifyErrorCode | undefined) ?? undefined;

  if (
    !code &&
    isRecord(args) &&
    (args.action === 'create' || args.action === 'update')
  ) {
    code = 'COOLIFY_VALIDATION_ERROR';
  }

  const resolvedCode = code ?? 'COOLIFY_422';

  throw new CoolifyApiError({
    code: resolvedCode,
    message: error.issues.map((issue) => issue.message).join('; '),
    recoveryHints:
      RECOVERY_HINTS[resolvedCode] ?? RECOVERY_HINTS.COOLIFY_422,
  });
}

function parseApplicationAction(args: unknown): ApplicationAction {
  const parsed = applicationActionSchema.safeParse(args);
  if (!parsed.success) {
    throwValidationError(parsed.error, args);
  }
  return parsed.data;
}

function omitUndefined(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

type AppIdentifierInput = {
  uuid?: string;
  name?: string;
  fqdn?: string;
};

async function resolveAppMutationUuid(
  parsed: AppIdentifierInput,
  env: EnvConfig,
): Promise<string> {
  if (parsed.uuid) {
    return parsed.uuid;
  }

  const rawResources = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const applications = rawResources
    .filter(isRecord)
    .filter((raw) => raw.type === 'application')
    .map(projectResourceSummary) as FindableResource[];

  const searchTerms = {
    name: parsed.name,
    domain: parsed.fqdn,
  };

  const matches = applications.filter((item) =>
    matchesExplicitFields(item, {
      name: parsed.name,
      domain: parsed.fqdn,
    }),
  );

  const ranked = rankFindMatches(matches, searchTerms).slice(0, FIND_MATCH_CAP);

  if (ranked.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_404',
      message: 'No application matched the mutation input.',
      recoveryHints: [
        'Check that the resource UUID or path exists on this Coolify instance.',
        'Confirm COOLIFY_URL points to the correct instance.',
      ],
    });
  }

  if (ranked.length > 1) {
    throw new CoolifyApiError({
      code: 'COOLIFY_AMBIGUOUS_MATCH',
      message:
        'Multiple applications matched the mutation input — refusing to mutate. Re-run with an explicit UUID.',
      recoveryHints: [
        'Re-run the mutation with an explicit UUID.',
        'Multiple applications matched — narrow the name/fqdn substring or pass the UUID directly.',
        ...ranked.map((r) => `- ${r.name} (${r.uuid})`),
      ],
    });
  }

  return ranked[0].uuid;
}

async function handleApplicationMutation(
  parsed: MutationAction,
  env: EnvConfig,
): Promise<ApplicationMutationResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);

  switch (parsed.action) {
    case 'start':
      await triggerAppStart(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
    case 'stop':
      await triggerAppStop(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
    case 'restart':
      await triggerAppRestart(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
  }

  return buildReadResponse(
    { uuid, action: parsed.action, status: 'requested' as const },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

export function extractDeploymentUuid(raw: unknown): string {
  const deployResp = isRecord(raw) ? raw : {};
  const deployments = Array.isArray(deployResp.deployments)
    ? deployResp.deployments
    : [];
  const first = deployments[0];
  if (isRecord(first)) {
    return String(first.deployment_uuid ?? '');
  }
  return '';
}

// Tag resolution uses /resources raw records. If items lack a `tags` field
// (some Coolify 4.1.x instances), every tag returns empty uuids — caller
// surfaces per-tag error entries. No fallback to GET /applications?tag=.
async function resolveTagUuids(
  tags: string[],
  env: EnvConfig,
): Promise<Array<{ tag: string; uuids: string[] }>> {
  const raw = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const apps = raw
    .filter(isRecord)
    .filter((record) => record.type === 'application');

  return tags.map((tag) => {
    const matched = apps.filter((record) => {
      const recordTags = record.tags;
      return (
        Array.isArray(recordTags) &&
        recordTags.some(
          (entry) =>
            typeof entry === 'string' &&
            entry.toLowerCase() === tag.toLowerCase(),
        )
      );
    });

    return {
      tag,
      uuids: matched.map((record) => String(record.uuid ?? record.id ?? '')),
    };
  });
}

async function handleBatchApplicationDeploy(
  parsed: DeployAction,
  env: EnvConfig,
): Promise<ApplicationDeployResult> {
  const explicitUuids = parsed.uuids ?? [];
  const tags = parsed.tags ?? (parsed.tag ? [parsed.tag] : []);
  const tagResults =
    tags.length > 0 ? await resolveTagUuids(tags, env) : [];
  const tagUuids = tagResults.flatMap((result) => result.uuids);
  const unmatchedTags = tagResults
    .filter((result) => result.uuids.length === 0)
    .map((result) => result.tag);
  const allUuids = [...new Set([...explicitUuids, ...tagUuids])];

  if (allUuids.length === 0 && unmatchedTags.length > 0) {
    return buildReadResponse(
      {
        results: unmatchedTags.map((tag) => ({
          tag,
          status: 'failed' as const,
          error: `No applications matched tag '${tag}'`,
        })),
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  if (allUuids.length === 0 && unmatchedTags.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_422',
      message:
        'Batch deploy requires at least one uuid, tag, or matched application.',
      recoveryHints: [
        'Review the request payload for missing or invalid fields.',
        'Check Coolify API docs for required parameters.',
      ],
    });
  }

  const results: Array<
    | {
        uuid: string;
        deployment_uuid?: string;
        status: string;
        force?: boolean;
        commit?: string;
        created_at?: string;
        finished_at?: string;
        logs_available?: ReturnType<typeof logsAvailableHint>;
        hint?: string;
        error?: string;
      }
    | {
        tag: string;
        status: 'failed';
        error: string;
      }
  > = [];

  for (const uuid of allUuids) {
    try {
      const raw = await triggerDeploy(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        parsed.force,
        env.COOLIFY_VERIFY_SSL,
      );
      const deploymentUuid = extractDeploymentUuid(raw);

      let entry: {
        uuid: string;
        deployment_uuid?: string;
        status: string;
        force?: boolean;
        commit?: string;
        created_at?: string;
        finished_at?: string;
        logs_available?: ReturnType<typeof logsAvailableHint>;
        hint?: string;
      } = {
        uuid,
        deployment_uuid: deploymentUuid,
        status: 'queued',
        force: parsed.force,
        logs_available: logsAvailableHint(deploymentUuid),
      };

      if (parsed.wait) {
        const fetcher = async () => {
          const dep = await fetchDeployment(
            env.COOLIFY_URL,
            env.COOLIFY_TOKEN,
            deploymentUuid,
            env.COOLIFY_VERIFY_SSL,
          );
          return (isRecord(dep) ? dep : {}) as Record<string, unknown>;
        };
        const terminal = await pollDeploymentUntilTerminal(
          fetcher,
          parsed.timeout * 1000,
        );
        const summary = projectDeploymentSummary(terminal);
        entry = {
          uuid,
          ...summary,
          logs_available: logsAvailableHint(deploymentUuid),
          ...(summary.status === 'timeout'
            ? {
                hint: `Re-call deployment.get with deployment_uuid=${deploymentUuid} to continue polling`,
              }
            : {}),
        };
      }

      results.push(entry);
    } catch (error) {
      results.push({
        uuid,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const finalResults = [
    ...unmatchedTags.map((tag) => ({
      tag,
      status: 'failed' as const,
      error: `No applications matched tag '${tag}'`,
    })),
    ...results,
  ];

  return buildReadResponse(
    { results: finalResults },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

async function handleApplicationDeploy(
  parsed: DeployAction,
  env: EnvConfig,
): Promise<ApplicationDeployResult> {
  if (parsed.uuids || parsed.tags || parsed.tag) {
    return handleBatchApplicationDeploy(parsed, env);
  }

  const uuid = await resolveAppMutationUuid(parsed, env);

  const raw = await triggerDeploy(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    parsed.force,
    env.COOLIFY_VERIFY_SSL,
  );

  const deploymentUuid = extractDeploymentUuid(raw);

  if (!parsed.wait) {
    return buildReadResponse(
      {
        uuid,
        deployment_uuid: deploymentUuid,
        status: 'queued',
        force: parsed.force,
        logs_available: logsAvailableHint(deploymentUuid),
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  const timeoutMs = parsed.timeout * 1000;
  const fetcher = async () => {
    const dep = await fetchDeployment(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      deploymentUuid,
      env.COOLIFY_VERIFY_SSL,
    );
    return (isRecord(dep) ? dep : {}) as Record<string, unknown>;
  };

  const terminal = await pollDeploymentUntilTerminal(fetcher, timeoutMs);
  const summary = projectDeploymentSummary(terminal);

  return buildReadResponse(
    {
      ...summary,
      logs_available: logsAvailableHint(deploymentUuid),
      ...(summary.status === 'timeout'
        ? {
            hint: `Re-call deployment.get with deployment_uuid=${deploymentUuid} to continue polling`,
          }
        : {}),
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

async function handleApplicationLogs(
  parsed: LogsAction,
  env: EnvConfig,
): Promise<ApplicationLogsResult> {
  if (parsed.deployment_uuid) {
    const raw = await fetchDeployment(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      parsed.deployment_uuid,
      env.COOLIFY_VERIFY_SSL,
    );
    const rec = isRecord(raw) ? raw : {};

    if (typeof rec.logs !== 'string') {
      throw new CoolifyApiError({
        code: 'COOLIFY_403_SENSITIVE_REQUIRED',
        message:
          'Deployment build logs are not available — the API token lacks the api.sensitive ability required to read deployment logs.',
        recoveryHints: RECOVERY_HINTS.COOLIFY_403_SENSITIVE_REQUIRED,
      });
    }

    const { parsed: parsedOk, entries } = parseBuildLogEntries(rec.logs);

    if (!parsedOk) {
      const allLines = sliceLogBlob(rec.logs, parsed.lines, parsed.offset);
      const capped = capLogOutput(allLines.join('\n'), parsed.max_chars);
      const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);

      return buildReadResponse(
        {
          deployment_uuid: parsed.deployment_uuid,
          status: String(rec.status ?? 'unknown'),
          logs_lines: cappedLines,
          logs_truncated: capped.truncated,
          total_lines: allLines.length,
          entries_total: allLines.length,
          entries_hidden: 0,
          entries_shown: allLines.length,
        },
        {
          format: parsed.format,
          max_chars: parsed.max_chars,
        },
      );
    }

    const visibleEntries = entries.filter(
      (e) =>
        (parsed.include_hidden ? true : !e.hidden) &&
        (parsed.type === 'all' ? true : e.type === parsed.type),
    );
    const entriesHidden = entries.filter((e) => e.hidden).length;
    const entriesShown = visibleEntries.length;
    const flattened = visibleEntries.map((e) => e.output).join('\n');
    const allLines = sliceLogBlob(flattened, parsed.lines, parsed.offset);
    const capped = capLogOutput(allLines.join('\n'), parsed.max_chars);
    const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);

    return buildReadResponse(
      {
        deployment_uuid: parsed.deployment_uuid,
        status: String(rec.status ?? 'unknown'),
        logs_lines: cappedLines,
        logs_truncated: capped.truncated,
        total_lines: allLines.length,
        entries_total: entries.length,
        entries_hidden: entriesHidden,
        entries_shown: entriesShown,
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  const uuid = await resolveAppMutationUuid(parsed, env);
  const raw = await fetchApplicationLogs(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    parsed.lines,
    env.COOLIFY_VERIFY_SSL,
  );
  const logsStr =
    isRecord(raw) && typeof raw.logs === 'string' ? raw.logs : '';
  const allLines = sliceLogBlob(logsStr, parsed.lines, 0);
  const capped = capLogOutput(allLines.join('\n'), parsed.max_chars);
  const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);

  return buildReadResponse(
    {
      uuid,
      logs_lines: cappedLines,
      logs_truncated: capped.truncated,
      total_lines: allLines.length,
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

async function buildCreateApiBody(
  parsed: CreateAction,
  env: EnvConfig,
): Promise<Record<string, unknown>> {
  const project_uuid = parsed.project_uuid
    ? parsed.project_uuid
    : await resolveProjectUuid(undefined, parsed.project_name, env);

  const body: Record<string, unknown> = {
    project_uuid,
    server_uuid: parsed.server_uuid,
    instant_deploy: parsed.instant_deploy,
    force_domain_override: parsed.force_domain_override,
    name: parsed.name,
    description: parsed.description,
    domains: parsed.domains,
    ports_exposes: parsed.ports_exposes,
    ports_mappings: parsed.ports_mappings,
  };

  if (parsed.environment_name) {
    body.environment_name = parsed.environment_name;
  }
  if (parsed.environment_uuid) {
    body.environment_uuid = parsed.environment_uuid;
  }

  switch (parsed.source_type) {
    case 'public_git':
      body.git_repository = parsed.git_repository;
      body.git_branch = parsed.git_branch;
      body.build_pack = parsed.build_pack;
      break;
    case 'private_deploy_key':
      body.private_key_uuid = parsed.private_key_uuid;
      body.git_repository = parsed.git_repository;
      body.git_branch = parsed.git_branch;
      body.build_pack = parsed.build_pack;
      break;
    case 'private_github_app':
      body.github_app_uuid = parsed.github_app_uuid;
      body.git_repository = parsed.git_repository;
      body.git_branch = parsed.git_branch;
      body.build_pack = parsed.build_pack;
      break;
    case 'dockerfile':
      body.dockerfile = parsed.dockerfile;
      if (parsed.build_pack) {
        body.build_pack = parsed.build_pack;
      }
      break;
    case 'dockerimage':
      body.docker_registry_image_name = parsed.docker_registry_image_name;
      body.docker_registry_image_tag = parsed.docker_registry_image_tag;
      break;
  }

  return omitUndefined(body);
}

function buildUpdatePayload(parsed: UpdateAction): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const key of UPDATE_CURATED_FIELD_KEYS) {
    const value = parsed[key];
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  if (parsed.force_domain_override === true) {
    payload.force_domain_override = true;
  }

  return payload;
}

async function handleApplicationUpdate(
  parsed: UpdateAction,
  env: EnvConfig,
): Promise<ApplicationUpdateResult> {
  const uuid = await resolveAppMutationUuid(
    { uuid: parsed.uuid, name: parsed.name, fqdn: parsed.fqdn },
    env,
  );

  const payload = buildUpdatePayload(parsed);

  await updateApplication(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    payload,
    env.COOLIFY_VERIFY_SSL,
  );

  const raw = await fetchApplication(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const data = sanitizeFullProjection(raw, parsed.reveal);

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleApplicationDelete(
  parsed: DeleteAction,
  env: EnvConfig,
): Promise<ApplicationDeleteResult> {
  const uuid = await resolveAppMutationUuid(
    { uuid: parsed.uuid, name: parsed.name, fqdn: parsed.fqdn },
    env,
  );

  validateDeleteConfirm(parsed.confirm, uuid);

  await deleteApplication(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    {
      delete_volumes: parsed.delete_volumes,
      delete_configurations: parsed.delete_configurations,
      docker_cleanup: parsed.docker_cleanup,
      delete_connected_networks: parsed.delete_connected_networks,
    },
    env.COOLIFY_VERIFY_SSL,
  );

  return buildReadResponse(
    {
      ok: true,
      uuid,
      deleted: true,
      delete_volumes: parsed.delete_volumes,
      delete_configurations: parsed.delete_configurations,
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

async function handleApplicationDeletePreview(
  parsed: DeletePreviewAction,
  env: EnvConfig,
): Promise<ApplicationDeletePreviewResult> {
  const uuid = await resolveAppMutationUuid(
    { uuid: parsed.uuid, name: parsed.name, fqdn: parsed.fqdn },
    env,
  );

  const rawResources = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const childResources = rawResources
    .filter(isRecord)
    .filter((resource) => String(resource.application_uuid ?? '') === uuid)
    .map((resource) => ({
      uuid: String(resource.uuid ?? ''),
      name: resource.name != null ? String(resource.name) : undefined,
      type: resource.type != null ? String(resource.type) : undefined,
    }));

  const response: {
    uuid: string;
    child_resources: typeof childResources;
    would_delete: true;
    warning?: string;
  } = {
    uuid,
    child_resources: childResources,
    would_delete: true,
  };

  if (childResources.length > 0) {
    response.warning =
      'Application has child resources that will also be removed or orphaned — review child_resources before confirming delete.';
  }

  return buildReadResponse(response, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleApplicationCreate(
  parsed: CreateAction,
  env: EnvConfig,
): Promise<ApplicationCreateResult> {
  const body = await buildCreateApiBody(parsed, env);

  const callCreate = async (): Promise<unknown> => {
    switch (parsed.source_type) {
      case 'public_git':
        return createPublicApplication(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          body,
          env.COOLIFY_VERIFY_SSL,
        );
      case 'private_deploy_key':
        return createPrivateDeployKeyApplication(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          body,
          env.COOLIFY_VERIFY_SSL,
        );
      case 'private_github_app':
        return createPrivateGithubAppApplication(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          body,
          env.COOLIFY_VERIFY_SSL,
        );
      case 'dockerfile':
        return createDockerfileApplication(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          body,
          env.COOLIFY_VERIFY_SSL,
        );
      case 'dockerimage':
        return createDockerimageApplication(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          body,
          env.COOLIFY_VERIFY_SSL,
        );
    }
  };

  const raw = await callCreate();
  const created = isRecord(raw) ? raw : {};
  const appUuid = String(created.uuid ?? '');

  if (!parsed.instant_deploy) {
    return buildReadResponse(
      {
        uuid: appUuid,
        deploy: { status: 'not_triggered' as const },
        hints: ['Use application.deploy to trigger a deployment'],
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  try {
    const deployRaw = await triggerDeploy(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      appUuid,
      false,
      env.COOLIFY_VERIFY_SSL,
    );
    const deploymentUuid = extractDeploymentUuid(deployRaw);

    return buildReadResponse(
      {
        uuid: appUuid,
        deploy: {
          status: 'queued' as const,
          deployment_uuid: deploymentUuid,
        },
        logs_available: logsAvailableHint(deploymentUuid),
        hints: [
          'Use deployment.get with deployment_uuid to poll status',
          'Use application.deploy with wait:true to block until terminal',
        ],
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildReadResponse(
      {
        ok: true,
        uuid: appUuid,
        deploy: {
          status: 'failed_to_queue' as const,
          error: message,
        },
        recoveryHints: [
          'Application was created successfully — retry deployment with application.deploy.',
          'Check Coolify server logs if deploy queue failures persist.',
        ],
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }
}

async function handleApplicationEnvsList(
  parsed: EnvsListAction,
  env: EnvConfig,
): Promise<ApplicationEnvsListResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);
  const envs = await fetchEnvs(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const data = maskEnvRecords(envs, parsed.reveal);

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleApplicationEnvsGet(
  parsed: EnvsGetAction,
  env: EnvConfig,
): Promise<ApplicationEnvsGetResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);
  const envs = await fetchEnvs(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const found = resolveEnvIdentity(envs, {
    env_uuid: parsed.env_uuid,
    key: parsed.key,
  });
  const data = maskEnvRecord(found, parsed.reveal);

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleApplicationEnvsCreate(
  parsed: EnvsCreateAction,
  env: EnvConfig,
): Promise<ApplicationEnvsCreateResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);
  const created = await createEnv(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    {
      key: parsed.key,
      value: parsed.value,
      is_preview: parsed.is_preview,
      is_literal: parsed.is_literal,
      is_multiline: parsed.is_multiline,
      is_shown_once: parsed.is_shown_once,
    },
    env.COOLIFY_VERIFY_SSL,
  );

  const envs = await fetchEnvs(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const stored = resolveEnvIdentity(envs, { env_uuid: created.uuid });

  const data = maskEnvRecord(
    {
      uuid: stored.uuid,
      key: stored.key,
      value: stored.value,
      is_preview: stored.is_preview ?? parsed.is_preview,
      is_literal: stored.is_literal ?? parsed.is_literal,
      is_multiline: stored.is_multiline ?? parsed.is_multiline,
      is_shown_once: stored.is_shown_once ?? parsed.is_shown_once,
    },
    parsed.reveal,
  );

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleApplicationEnvsUpdate(
  parsed: EnvsUpdateAction,
  env: EnvConfig,
): Promise<ApplicationEnvsUpdateResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);
  let resolvedKey = parsed.key;
  let resolvedEnvUuid = parsed.env_uuid;

  const envs = await fetchEnvs(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  if (parsed.env_uuid) {
    const found = resolveEnvIdentity(envs, { env_uuid: parsed.env_uuid });
    resolvedKey = found.key;
    resolvedEnvUuid = found.uuid;
  } else if (parsed.key) {
    const found = resolveEnvIdentity(envs, { key: parsed.key });
    resolvedKey = found.key;
    resolvedEnvUuid = found.uuid;
  }

  if (!resolvedKey) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'At least one of env_uuid or key is required.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const entry = buildEnvBulkEntry({
    key: resolvedKey,
    value: parsed.value,
    is_preview: parsed.is_preview,
    is_literal: parsed.is_literal,
    is_multiline: parsed.is_multiline,
    is_shown_once: parsed.is_shown_once,
  });

  await updateEnvViaBulk(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    [entry],
    env.COOLIFY_VERIFY_SSL,
  );

  const data = maskEnvRecord(
    {
      uuid: resolvedEnvUuid,
      key: resolvedKey,
      value: parsed.value,
      is_preview: parsed.is_preview,
      is_literal: parsed.is_literal,
      is_multiline: parsed.is_multiline,
      is_shown_once: parsed.is_shown_once,
    },
    parsed.reveal,
  );

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleApplicationEnvsDelete(
  parsed: EnvsDeleteAction,
  env: EnvConfig,
): Promise<ApplicationEnvsDeleteResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);
  validateEnvMutationConfirm(parsed.confirm, 'envs:delete', uuid);

  await deleteEnv(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    parsed.env_uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  return withRevealRecoveryHints(
    buildReadResponse(
      {
        ok: true as const,
        env_uuid: parsed.env_uuid,
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    ),
    parsed.reveal,
  );
}

async function handleApplicationEnvsBulkUpdate(
  parsed: EnvsBulkUpdateAction,
  env: EnvConfig,
): Promise<ApplicationEnvsBulkUpdateResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);
  validateEnvMutationConfirm(parsed.confirm, 'envs:bulk-update', uuid);

  const entries = parsed.entries.map((entry) => buildEnvBulkEntry(entry));

  await bulkUpdateEnvs(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    entries,
    env.COOLIFY_VERIFY_SSL,
  );

  return withRevealRecoveryHints(
    buildReadResponse(
      { ok: true as const },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    ),
    parsed.reveal,
  );
}

const ASK_HUMAN_CONFLICT_POLICY_HINT =
  'ask_human_conflict_policy: ask the human whether to overwrite, keep_remote, or abort; then retry with conflict_policy set';

const ENV_FILE_SIZE_LIMIT = 1024 * 1024;

function readBoundedEnvFile(envFilePath: string): string {
  let root: string;
  try {
    root = realpathSync(process.cwd());
  } catch {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'Cannot resolve env_file allowlist root',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const resolved = path.resolve(root, envFilePath);
  let realPath: string;
  try {
    realPath = realpathSync(resolved);
  } catch {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'Cannot read env_file',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (realPath !== root && !realPath.startsWith(rootPrefix)) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: `env_file path escapes allowlisted root (${root})`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  let fd: number;
  try {
    fd = openSync(realPath, 'r');
  } catch {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'Cannot read env_file',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  try {
    if (fstatSync(fd).size > ENV_FILE_SIZE_LIMIT) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: 'env_file exceeds 1 MiB limit',
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }
    return readFileSync(fd, 'utf8');
  } catch (error) {
    if (error instanceof CoolifyApiError) {
      throw error;
    }
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'Cannot read env_file',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  } finally {
    closeSync(fd);
  }
}

function buildValueConflicts(diff: DiffResult): Conflict[] {
  return diff.updated.map((entry) => ({
    key: entry.key,
    remote_masked: '***',
    local_present: true,
  }));
}

function maskSyncEnvEntry(
  entry: ParsedEnv | { key: string; value?: string; localValue?: string; remoteValue?: string },
): Record<string, unknown> {
  const projected = sanitizeFullProjection(entry, false) as Record<
    string,
    unknown
  >;
  projected.value = '***';
  if ('localValue' in entry && entry.localValue !== undefined) {
    projected.localValue = '***';
  }
  if ('remoteValue' in entry && entry.remoteValue !== undefined) {
    projected.remoteValue = '***';
  }
  return projected;
}

function maskSyncUpdatedEntry(
  entry: DiffResult['updated'][number],
): Record<string, unknown> {
  return {
    key: entry.key,
    localValue: '***',
    remoteValue: '***',
  };
}

function buildSyncDisposition(
  diff: DiffResult,
  conflicts: Conflict[],
  options: {
    dry_run: boolean;
    kept_remote?: Array<Record<string, unknown>>;
    aborted?: Array<Record<string, unknown>>;
    pruned?: Array<Record<string, unknown>>;
  },
): ApplicationEnvsSyncResult['data'] {
  return {
    added: diff.added.map((entry) => maskSyncEnvEntry(entry)),
    updated: diff.updated.map((entry) => maskSyncUpdatedEntry(entry)),
    unchanged: diff.unchanged.map((entry) => maskSyncEnvEntry(entry)),
    removed: diff.removed.map((entry) => maskSyncEnvEntry(entry)),
    conflicts,
    ...(options.kept_remote ? { kept_remote: options.kept_remote } : {}),
    ...(options.aborted ? { aborted: options.aborted } : {}),
    ...(options.pruned ? { pruned: options.pruned } : {}),
    dry_run: options.dry_run,
  };
}

function validateSyncConflictPolicy(
  conflicts: Conflict[],
  conflictPolicy: ConflictPolicy | undefined,
  uuid: string,
): void {
  if (conflicts.length === 0 || conflictPolicy !== undefined) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'envs:sync' on application '${uuid}' has value conflicts — set conflict_policy to overwrite, keep_remote, or abort after asking the human.`,
    recoveryHints: [
      ASK_HUMAN_CONFLICT_POLICY_HINT,
      ...RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    ],
    data: {
      action: 'envs:sync',
      uuid,
      conflicts,
      conflict_policy_options: ['overwrite', 'keep_remote', 'abort'],
    },
  });
}

async function handleApplicationEnvsSync(
  parsed: EnvsSyncAction,
  env: EnvConfig,
): Promise<ApplicationEnvsSyncResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);

  const content =
    typeof parsed.env_file === 'string' && parsed.env_file.length > 0
      ? readBoundedEnvFile(parsed.env_file)
      : (() => {
          const envContent = parsed.env_content ?? '';
          if (Buffer.byteLength(envContent, 'utf8') > ENV_FILE_SIZE_LIMIT) {
            throw new CoolifyApiError({
              code: 'COOLIFY_VALIDATION_ERROR',
              message: 'env_content exceeds 1 MiB limit',
              recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
            });
          }
          return envContent;
        })();

  const local = parseEnvFile(content);
  const baseline = await fetchEnvs(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const diff = diffEnvs(local, baseline);
  const valueConflicts = buildValueConflicts(diff);

  if (parsed.dry_run) {
    if (parsed.prune && parsed.conflict_policy !== 'overwrite') {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message:
          "Action 'envs:sync' with prune:true requires conflict_policy:'overwrite'",
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }

    const remote = await fetchEnvs(
      'application',
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      uuid,
      env.COOLIFY_VERIFY_SSL,
    );
    const outOfBandResult = detectConflicts(local, remote, baseline, 'abort');
    const dryRunConflicts = [...valueConflicts, ...outOfBandResult.conflicts].filter(
      (conflict, index, all) =>
        all.findIndex((entry) => entry.key === conflict.key) === index,
    );

    return buildReadResponse(
      buildSyncDisposition(diff, dryRunConflicts, { dry_run: true }),
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  const remote = await fetchEnvs(
    'application',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const outOfBandResult = detectConflicts(
    local,
    remote,
    baseline,
    parsed.conflict_policy ?? 'abort',
  );

  const conflicts = [...valueConflicts, ...outOfBandResult.conflicts].filter(
    (conflict, index, all) =>
      all.findIndex((entry) => entry.key === conflict.key) === index,
  );

  validateSyncConflictPolicy(conflicts, parsed.conflict_policy, uuid);

  if (parsed.prune && parsed.conflict_policy !== 'overwrite') {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message:
        "Action 'envs:sync' with prune:true requires conflict_policy:'overwrite'",
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const policy = parsed.conflict_policy!;
  const conflictKeys = new Set(conflicts.map((conflict) => conflict.key));
  const baselineByKey = new Map(baseline.map((entry) => [entry.key, entry]));
  const kept_remote: Array<Record<string, unknown>> = [];
  const aborted: Array<Record<string, unknown>> = [];
  const pruned: Array<Record<string, unknown>> = [];
  const bulkUpdates: EnvBulkEntry[] = [];
  const appliedCreates: Array<{ key: string; env_uuid: string }> = [];
  const appliedUpdates: string[] = [];
  const appliedPrunes: Array<{
    key: string;
    env_uuid: string;
    restore: EnvBulkEntry;
  }> = [];
  let bulkRollbackEntries: EnvBulkEntry[] = [];
  let failedAt: string | undefined;

  try {
    for (const entry of diff.added) {
      if (policy === 'abort' && conflictKeys.has(entry.key)) {
        aborted.push({ key: entry.key, value: '***' });
        continue;
      }

      failedAt = entry.key;
      const created = await createEnv(
        'application',
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        {
          key: entry.key,
          value: entry.value,
          is_preview: false,
          is_literal: false,
          is_multiline: false,
          is_shown_once: false,
        },
        env.COOLIFY_VERIFY_SSL,
      );
      appliedCreates.push({ key: entry.key, env_uuid: created.uuid });
    }

    for (const entry of diff.updated) {
      if (policy === 'keep_remote') {
        kept_remote.push({ key: entry.key, value: '***' });
        continue;
      }
      if (policy === 'abort' && conflictKeys.has(entry.key)) {
        aborted.push({ key: entry.key, value: '***' });
        continue;
      }

      const baselineEntry = baselineByKey.get(entry.key);
      bulkUpdates.push({
        key: entry.key,
        value: entry.localValue,
        is_preview: baselineEntry?.is_preview ?? false,
        is_literal: baselineEntry?.is_literal ?? false,
        is_multiline: baselineEntry?.is_multiline ?? false,
        is_shown_once: baselineEntry?.is_shown_once ?? false,
      });
    }

    const updatedKeys = new Set(diff.updated.map((entry) => entry.key));
    const remoteByKey = new Map(remote.map((entry) => [entry.key, entry]));
    for (const entry of local) {
      if (updatedKeys.has(entry.key)) {
        continue;
      }
      const remoteEntry = remoteByKey.get(entry.key);
      if (!remoteEntry || remoteEntry.value === entry.value) {
        continue;
      }
      if (policy === 'keep_remote') {
        kept_remote.push({ key: entry.key, value: '***' });
        continue;
      }
      if (policy === 'abort' && conflictKeys.has(entry.key)) {
        aborted.push({ key: entry.key, value: '***' });
        continue;
      }

      const baselineEntry = baselineByKey.get(entry.key);
      bulkUpdates.push({
        key: entry.key,
        value: entry.value,
        is_preview: baselineEntry?.is_preview ?? false,
        is_literal: baselineEntry?.is_literal ?? false,
        is_multiline: baselineEntry?.is_multiline ?? false,
        is_shown_once: baselineEntry?.is_shown_once ?? false,
      });
    }

    if (bulkUpdates.length > 0) {
      bulkRollbackEntries = bulkUpdates.map((entry) => {
        const baselineEntry = baselineByKey.get(entry.key);
        return {
          key: entry.key,
          value: baselineEntry?.value ?? entry.value,
          is_preview: baselineEntry?.is_preview ?? false,
          is_literal: baselineEntry?.is_literal ?? false,
          is_multiline: baselineEntry?.is_multiline ?? false,
          is_shown_once: baselineEntry?.is_shown_once ?? false,
        };
      });
      failedAt = bulkUpdates[0]?.key ?? 'bulk-update';
      await updateEnvViaBulk(
        'application',
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        bulkUpdates,
        env.COOLIFY_VERIFY_SSL,
      );
      appliedUpdates.push(...bulkUpdates.map((entry) => entry.key));
    }

    if (parsed.prune) {
      for (const entry of diff.removed) {
        const remoteEntry = remote.find((item) => item.key === entry.key);
        const baselineEntry = baselineByKey.get(entry.key);
        const envUuid = remoteEntry?.uuid ?? entry.uuid;
        if (!envUuid) {
          continue;
        }

        failedAt = entry.key;
        await deleteEnv(
          'application',
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          uuid,
          envUuid,
          env.COOLIFY_VERIFY_SSL,
        );
        pruned.push({ key: entry.key, env_uuid: envUuid });
        appliedPrunes.push({
          key: entry.key,
          env_uuid: envUuid,
          restore: {
            key: entry.key,
            value: baselineEntry?.value ?? remoteEntry?.value ?? '',
            is_preview: baselineEntry?.is_preview ?? remoteEntry?.is_preview ?? false,
            is_literal: baselineEntry?.is_literal ?? remoteEntry?.is_literal ?? false,
            is_multiline:
              baselineEntry?.is_multiline ?? remoteEntry?.is_multiline ?? false,
            is_shown_once:
              baselineEntry?.is_shown_once ?? remoteEntry?.is_shown_once ?? false,
          },
        });
      }
    }
  } catch (error) {
    const rollbackErrors: string[] = [];

    for (const applied of [...appliedCreates].reverse()) {
      try {
        await deleteEnv(
          'application',
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          uuid,
          applied.env_uuid,
          env.COOLIFY_VERIFY_SSL,
        );
      } catch (err) {
        rollbackErrors.push(
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    if (bulkRollbackEntries.length > 0) {
      try {
        await updateEnvViaBulk(
          'application',
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          uuid,
          bulkRollbackEntries,
          env.COOLIFY_VERIFY_SSL,
        );
      } catch (err) {
        rollbackErrors.push(
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    for (const applied of [...appliedPrunes].reverse()) {
      try {
        await createEnv(
          'application',
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          uuid,
          applied.restore,
          env.COOLIFY_VERIFY_SSL,
        );
      } catch (err) {
        rollbackErrors.push(
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    const partialData = {
      applied: appliedCreates.map(({ key, env_uuid }) => ({ key, env_uuid })),
      applied_updates: appliedUpdates.map((key) => ({ key })),
      pruned: appliedPrunes.map(({ key, env_uuid }) => ({ key, env_uuid })),
      ...(failedAt ? { failed_at: failedAt } : {}),
      ...(rollbackErrors.length > 0
        ? { rollback_failed: true, rollback_errors: rollbackErrors }
        : {}),
    };

    if (error instanceof CoolifyApiError) {
      throw new CoolifyApiError({
        ...error.envelope,
        data: {
          ...(error.envelope.data ?? {}),
          ...partialData,
        },
      });
    }

    throw new CoolifyApiError({
      code: 'COOLIFY_500',
      message:
        error instanceof Error ? error.message : 'envs:sync apply failed',
      recoveryHints: RECOVERY_HINTS.COOLIFY_500,
      data: partialData,
    });
  }

  return buildReadResponse(
    buildSyncDisposition(diff, conflicts, {
      dry_run: false,
      ...(kept_remote.length > 0 ? { kept_remote } : {}),
      ...(aborted.length > 0 ? { aborted } : {}),
      ...(parsed.prune ? { pruned } : {}),
    }),
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

export async function handleApplicationAction(
  args: unknown,
  env: EnvConfig,
): Promise<ApplicationActionResult> {
  try {
    const parsed = parseApplicationAction(args);

    switch (parsed.action) {
      case 'create':
        return await handleApplicationCreate(parsed, env);
      case 'update':
        return await handleApplicationUpdate(parsed, env);
      case 'delete':
        return await handleApplicationDelete(parsed, env);
      case 'delete_preview':
        return await handleApplicationDeletePreview(parsed, env);
      case 'start':
      case 'stop':
      case 'restart':
        return await handleApplicationMutation(parsed, env);
      case 'deploy':
        return await handleApplicationDeploy(parsed, env);
      case 'logs':
        return await handleApplicationLogs(parsed, env);
      case 'envs:list':
        return await handleApplicationEnvsList(parsed, env);
      case 'envs:get':
        return await handleApplicationEnvsGet(parsed, env);
      case 'envs:create':
        return await handleApplicationEnvsCreate(parsed, env);
      case 'envs:update':
        return await handleApplicationEnvsUpdate(parsed, env);
      case 'envs:delete':
        return await handleApplicationEnvsDelete(parsed, env);
      case 'envs:bulk-update':
        return await handleApplicationEnvsBulkUpdate(parsed, env);
      case 'envs:sync':
        return await handleApplicationEnvsSync(parsed, env);
      case 'get': {
        const projection = resolveProjection(
          parsed.projection,
          parsed.include_full,
        );

        rejectTableFormatOnFullProjection(parsed.format, projection);

        const raw = await fetchApplication(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          parsed.uuid,
          env.COOLIFY_VERIFY_SSL,
        );

        const rawRecord = isRecord(raw) ? raw : {};
        const hints = generateHints(
          'application',
          parsed.uuid,
          String(rawRecord.status ?? 'unknown'),
          rawRecord.health_check_status !== undefined
            ? String(rawRecord.health_check_status)
            : undefined,
        );

        const lookup = await buildProjectEnvironmentIndex(env);
        const data =
          projection === 'full'
            ? {
                ...(sanitizeFullProjection(raw, parsed.reveal) as Record<
                  string,
                  unknown
                >),
                hints,
              }
            : { ...projectApplicationSummary(rawRecord, lookup), hints };

        return buildReadResponse(data, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown application action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isApplicationErrorResult(
  result: ApplicationActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
