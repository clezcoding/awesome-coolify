#!/usr/bin/env node
/**
 * After a Version Packages merge, create the git tag + GitHub Release.
 *
 * Why this owns tagging (not changesets/action):
 * - This repo has pnpm-workspace.yaml, so @manypkg reports tool !== "root".
 * - changesets/action then tries `git push origin <name>@<version>` without
 *   creating the tag first (it expects `changeset publish` to have done that).
 * - Our npm publish path is OIDC via publish.yml on `release: published`, and
 *   existing releases use `v<version>` tags — so we create those here.
 *
 * release.yml must keep `createGithubReleases: false` so the action does not
 * also attempt the broken name@version push.
 */
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const tag = `v${pkg.version}`;

if (!process.env.GH_TOKEN && process.env.GITHUB_TOKEN) {
  process.env.GH_TOKEN = process.env.GITHUB_TOKEN;
}

function sh(cmd) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function tagExistsLocal(name) {
  try {
    sh(`git rev-parse -q --verify refs/tags/${name}`);
    return true;
  } catch {
    return false;
  }
}

function releaseExists(name) {
  try {
    execFileSync("gh", ["release", "view", name], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function changelogNotes(version) {
  const changelog = readFileSync(
    new URL("../CHANGELOG.md", import.meta.url),
    "utf8",
  );
  const header = `## ${version}`;
  const start = changelog.indexOf(header);
  if (start === -1) return null;
  const after = start + header.length;
  const next = changelog.indexOf("\n## ", after);
  const body = changelog.slice(after, next === -1 ? undefined : next).trim();
  return body || null;
}

if (!tagExistsLocal(tag)) {
  execFileSync("git", ["tag", "-a", tag, "-m", tag], { stdio: "inherit" });
}

execFileSync("git", ["push", "origin", `refs/tags/${tag}`], {
  stdio: "inherit",
});

if (!releaseExists(tag)) {
  const notes = changelogNotes(pkg.version);
  if (notes) {
    const dir = mkdtempSync(join(tmpdir(), "changeset-release-"));
    const notesPath = join(dir, "notes.md");
    try {
      writeFileSync(notesPath, notes, "utf8");
      execFileSync(
        "gh",
        [
          "release",
          "create",
          tag,
          "--title",
          tag,
          "--notes-file",
          notesPath,
          "--verify-tag",
        ],
        { stdio: "inherit" },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } else {
    execFileSync(
      "gh",
      [
        "release",
        "create",
        tag,
        "--title",
        tag,
        "--generate-notes",
        "--verify-tag",
      ],
      { stdio: "inherit" },
    );
  }
} else {
  console.error(`Release ${tag} already exists — skip create`);
}

// Keep action logs/outputs useful; createGithubReleases must stay false.
console.log(`New tag: ${pkg.name}@${pkg.version}`);
