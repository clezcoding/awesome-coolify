import { describe, expect, it, beforeAll } from "vitest";
import { execFileSync, execSync } from "node:child_process";

/** Forbidden tarball prefixes per D-13 / RESEARCH Pattern 5 — Plan 23-03 may extract to lib. */
export const FORBIDDEN_PREFIXES = [
  /^scripts\//,
  /^tests\//,
  /^\.planning\//,
  /^\.github\//,
  /^skills\//,
  /^docs\/coolify_openapi/,
] as const;

/** Parse npm pack --dry-run --json file list (local read-only; no publish). */
export function getPackPaths(): string[] {
  const json = JSON.parse(
    execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" }),
  ) as Array<{ files: Array<{ path: string }> }>;
  return json[0]!.files.map((f) => f.path);
}

describe("npm pack allowlist (PUB-02, D-13)", () => {
  beforeAll(() => {
    execSync("pnpm run build", { stdio: "pipe" });
  });

  it.fails(
    "forbidden prefixes absent from tarball (scripts/, tests/, .planning/, …)",
    async () => {
      const { assertForbiddenAbsent } = await import(
        "../scripts/lib/npm-pack-allowlist.mjs"
      );
      const paths = getPackPaths();
      assertForbiddenAbsent(paths, FORBIDDEN_PREFIXES);
    },
  );

  it.fails(
    "allowed dist/, package.json, LICENSE, README paths present",
    async () => {
      const { assertAllowedPresent } = await import(
        "../scripts/lib/npm-pack-allowlist.mjs"
      );
      const paths = getPackPaths();
      assertAllowedPresent(paths);
    },
  );
});
