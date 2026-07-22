import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { EOL } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { CoolifyApiError } from './errors.js';
import { resolveProjectRoot } from './project-root.js';

export const manifestResourceSchema = z
  .object({
    uuid: z.string().uuid(),
    type: z.enum(['application', 'service', 'database']),
    name: z.string(),
    domains: z.array(z.string()).default([]),
  })
  .strict();

export const manifestEnvironmentSchema = z
  .object({
    uuid: z.string().uuid(),
    name: z.string(),
    resources: z.array(manifestResourceSchema).default([]),
  })
  .strict();

export const manifestProjectSchema = z
  .object({
    uuid: z.string().uuid(),
    name: z.string(),
    environments: z.array(manifestEnvironmentSchema).default([]),
  })
  .strict();

export const manifestServerSchema = z
  .object({
    uuid: z.string().uuid(),
    name: z.string(),
  })
  .strict();

export const manifestSchema = z
  .object({
    version: z.string().default('1.0.0'),
    updatedAt: z.string().optional(),
    instance: z.string().optional(),
    projects: z.array(manifestProjectSchema).default([]),
    servers: z.array(manifestServerSchema).default([]),
  })
  .strict();

export type Manifest = z.infer<typeof manifestSchema>;
export type ManifestResource = z.infer<typeof manifestResourceSchema>;

function manifestFilePath(): string {
  return join(resolveProjectRoot(), '.coolify', 'manifest.json');
}

function emptyManifest(): Manifest {
  return {
    version: '1.0.0',
    projects: [],
    servers: [],
  };
}

export function ensureGitignore(projectRoot: string): void {
  const gitignorePath = join(projectRoot, '.gitignore');
  let content = '';
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, 'utf-8');
  }

  const lines = content.split(/\r?\n/);
  const target = '.coolify/';

  if (!lines.includes(target) && !lines.includes('.coolify')) {
    const prefix = content.length > 0 && !content.endsWith('\n') ? EOL : '';
    writeFileSync(gitignorePath, `${content}${prefix}${target}${EOL}`, 'utf-8');
  }
}

export class ManifestManager {
  private static writeLock: Promise<void> = Promise.resolve();

  private static withWriteLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = ManifestManager.writeLock.then(() => fn());
    ManifestManager.writeLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  static load(): Manifest {
    const filePath = manifestFilePath();
    if (!existsSync(filePath)) {
      return emptyManifest();
    }

    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      const result = manifestSchema.safeParse(parsed);
      if (!result.success) {
        throw new CoolifyApiError({
          code: 'COOLIFY_VALIDATION_ERROR',
          message: `Manifest file failed schema validation: ${filePath}`,
          recoveryHints: [
            'Inspect .coolify/manifest.json and fix invalid fields.',
            'Compare against .coolify-manifest.example.json for the expected shape.',
          ],
        });
      }
      return result.data;
    } catch (error) {
      if (error instanceof CoolifyApiError) throw error;
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: `Failed to parse manifest file: ${filePath}`,
        recoveryHints: [
          'Inspect .coolify/manifest.json for JSON syntax errors.',
          'Delete the file to start with an empty manifest cache.',
        ],
      });
    }
  }

  private static executeSave(manifest: Manifest, filePath: string): void {
    const projectRoot = resolveProjectRoot();
    ensureGitignore(projectRoot);

    mkdirSync(join(projectRoot, '.coolify'), { recursive: true });

    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    const payload: Manifest = {
      ...manifest,
      version: manifest.version ?? '1.0.0',
      updatedAt: new Date().toISOString(),
    };

    try {
      writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
      renameSync(tmpPath, filePath);
    } catch (error) {
      try {
        if (existsSync(tmpPath)) {
          unlinkSync(tmpPath);
        }
      } catch {
        /* ignore cleanup failure */
      }
      throw error;
    }
  }

  static async save(manifest: Manifest): Promise<void> {
    return ManifestManager.withWriteLock(() => {
      ManifestManager.executeSave(manifest, manifestFilePath());
    });
  }

  static async upsert(input: {
    resource: ManifestResource;
    project_uuid?: string;
    project_name?: string;
    environment_uuid?: string;
    environment_name?: string;
  }): Promise<void> {
    return ManifestManager.withWriteLock(async () => {
      const resource = manifestResourceSchema.parse(input.resource);
      const manifest = ManifestManager.load();

      const projectUuid = input.project_uuid;
      const environmentUuid = input.environment_uuid;

      if (!projectUuid || !environmentUuid) {
        throw new CoolifyApiError({
          code: 'COOLIFY_VALIDATION_ERROR',
          message: 'upsert requires project_uuid and environment_uuid',
          recoveryHints: [
            'Provide project_uuid and environment_uuid when upserting a resource.',
          ],
        });
      }

      let project = manifest.projects.find((entry) => entry.uuid === projectUuid);
      if (!project) {
        project = {
          uuid: projectUuid,
          name: input.project_name ?? projectUuid,
          environments: [],
        };
        manifest.projects.push(project);
      } else if (input.project_name) {
        project.name = input.project_name;
      }

      let environment = project.environments.find((entry) => entry.uuid === environmentUuid);
      if (!environment) {
        environment = {
          uuid: environmentUuid,
          name: input.environment_name ?? environmentUuid,
          resources: [],
        };
        project.environments.push(environment);
      } else if (input.environment_name) {
        environment.name = input.environment_name;
      }

      const existingIndex = environment.resources.findIndex((entry) => entry.uuid === resource.uuid);
      if (existingIndex === -1) {
        environment.resources.push(resource);
      } else {
        environment.resources[existingIndex] = resource;
      }

      ManifestManager.executeSave(manifest, manifestFilePath());
    });
  }

  static async remove(uuid: string): Promise<void> {
    return ManifestManager.withWriteLock(async () => {
      const manifest = ManifestManager.load();

      for (const project of manifest.projects) {
        for (const environment of project.environments) {
          environment.resources = environment.resources.filter((entry) => entry.uuid !== uuid);
        }
      }

      manifest.servers = manifest.servers.filter((entry) => entry.uuid !== uuid);

      ManifestManager.executeSave(manifest, manifestFilePath());
    });
  }

  static hasUuid(uuid: string): boolean {
    const manifest = ManifestManager.load();

    for (const project of manifest.projects) {
      if (project.uuid === uuid) return true;
      for (const environment of project.environments) {
        if (environment.uuid === uuid) return true;
        for (const resource of environment.resources) {
          if (resource.uuid === uuid) return true;
        }
      }
    }

    return manifest.servers.some((entry) => entry.uuid === uuid);
  }

  static async clear(): Promise<void> {
    return ManifestManager.save(emptyManifest());
  }

  static async autoUpsert(entry: {
    uuid: string;
    type: ManifestResource['type'];
    name: string;
    domains?: string[];
    projectUuid?: string;
    projectName?: string;
    environmentUuid?: string;
    environmentName?: string;
  }): Promise<void> {
    await ManifestManager.upsert({
      resource: {
        uuid: entry.uuid,
        type: entry.type,
        name: entry.name,
        domains: entry.domains ?? [],
      },
      project_uuid: entry.projectUuid,
      project_name: entry.projectName,
      environment_uuid: entry.environmentUuid,
      environment_name: entry.environmentName,
    });
  }

  static async autoRemove(uuid: string): Promise<void> {
    await ManifestManager.remove(uuid);
  }
}
