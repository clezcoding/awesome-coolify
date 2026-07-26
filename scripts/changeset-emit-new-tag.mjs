#!/usr/bin/env node
/**
 * After a Version Packages merge, create the git tag + GitHub Release.
 *
 * Why this owns tagging (not changesets/action):
 * - This repo has pnpm-workspace.yaml, so @manypkg reports tool !== "root".
 * - changesets/action then tries `git push origin <name>@<version>` without
 *   creating the tag first (it expects `changeset publish` to have done that).
 * - npm publish runs in release.yml when this script prints
 *   `New tag: name@version` (changesets/action parses that → published=true).
 * - Existing releases use `v<version>` tags — create those here.
 *
 * release.yml must keep `createGithubReleases: false` so the action does not
 * also attempt the broken name@version push.
 *
 * Idempotency: if the version is already on npm, do NOT print `New tag:` —
 * otherwise every push to main republishes and fails with
 * "cannot publish over the previously published versions".
 */
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  npmHasVersion,
  shouldAnnounceNewTag,
} from "./lib/release-publish-gate.mjs";

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

/** Published (non-draft) release only — release-drafter drafts must not block. */
function publishedReleaseExists(name) {
  try {
    const json = execFileSync(
      "gh",
      ["release", "view", name, "--json", "isDraft"],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const { isDraft } = JSON.parse(json);
    return isDraft === false;
  } catch {
    return false;
  }
}

function publishOrCreateRelease(name, notes) {
  // Promote an existing draft (release-drafter) instead of skipping.
  try {
    const json = execFileSync(
      "gh",
      ["release", "view", name, "--json", "isDraft,id"],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const { isDraft } = JSON.parse(json);
    if (isDraft) {
      const args = ["release", "edit", name, "--draft=false", "--latest"];
      if (notes) {
        const dir = mkdtempSync(join(tmpdir(), "changeset-release-"));
        const notesPath = join(dir, "notes.md");
        try {
          writeFileSync(notesPath, notes, "utf8");
          execFileSync("gh", [...args, "--notes-file", notesPath], {
            stdio: "inherit",
          });
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      } else {
        execFileSync("gh", args, { stdio: "inherit" });
      }
      return;
    }
  } catch {
    // No release yet — create below.
  }

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
          name,
          "--title",
          name,
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
        name,
        "--title",
        name,
        "--generate-notes",
        "--verify-tag",
      ],
      { stdio: "inherit" },
    );
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

try {
  execFileSync("git", ["push", "origin", `refs/tags/${tag}`], {
    stdio: "inherit",
  });
} catch {
  // Tag may already exist on origin at the same SHA — fine for re-runs.
  console.error(`Tag ${tag} push skipped or already on origin`);
}

if (publishedReleaseExists(tag)) {
  console.error(`Release ${tag} already published — skip create`);
} else {
  publishOrCreateRelease(tag, changelogNotes(pkg.version));
}

// changesets/action sets published=true only when it sees this line.
const onNpm = npmHasVersion(pkg.name, pkg.version, sh);
if (shouldAnnounceNewTag({ onNpm })) {
  console.log(`New tag: ${pkg.name}@${pkg.version}`);
} else {
  console.error(
    `npm ${pkg.name}@${pkg.version} already published — skip announce`,
  );
}
