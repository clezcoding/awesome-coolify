import { describe, expect, it, beforeAll } from "vitest";
import { execFileSync, execSync } from "node:child_process";

/** Forbidden tarball prefixes per D-13 / RESEARCH Pattern 5 */
export const FORBIDDEN_PREFIXES = [
  /^scripts\//,
  /^tests\//,
  /^\.planning\//,
  /^\.github\//,
  /^skills\//,
  /^\.cursor\//,
  /^docs\/coolify_openapi/,
  /^docs\/COVERAGE/,
] as const;

/** Parse npm pack --dry-run --json file list (local read-only; no publish). */
export function getPackPaths(): string[] {
  const json = JSON.parse(
    execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" }),
  ) as Array<{ files: Array<{ path: string }> }>;
  return json[0]!.files.map((f) => f.path);
}

function assertForbiddenAbsent(paths: string[]): void {
  for (const p of paths) {
    for (const re of FORBIDDEN_PREFIXES) {
      expect(p, `forbidden in tarball: ${p}`).not.toMatch(re);
    }
    expect(p, "secrets file .env must not ship").not.toBe(".env");
    expect(p, "secrets file .env must not ship").not.toMatch(/^\.env$/);
  }
}

function assertAllowedPresent(paths: string[]): void {
  expect(paths.length, "tarball must include files").toBeGreaterThan(0);
  expect(paths, "package.json required").toContain("package.json");
  expect(paths, "LICENSE required").toContain("LICENSE");
  expect(
    paths.some((p) => p.startsWith("dist/")),
    "dist/ artifacts required",
  ).toBe(true);
  expect(
    paths.some((p) => p === ".env.example"),
    ".env.example required",
  ).toBe(true);
  const hasReadme = paths.some(
    (p) => p === "README.md" || p === "README.de.md",
  );
  expect(hasReadme, "README.md or README.de.md (npm default)").toBe(true);
}

describe("npm pack allowlist (PUB-02, D-13)", () => {
  beforeAll(() => {
    execSync("pnpm run build", { stdio: "pipe" });
  });

  it("forbidden prefixes absent from tarball (scripts/, tests/, .planning/, …)", () => {
    const paths = getPackPaths();
    assertForbiddenAbsent(paths);
  });

  it("allowed dist/, package.json, LICENSE, README paths present", () => {
    const paths = getPackPaths();
    assertAllowedPresent(paths);
  });
});
