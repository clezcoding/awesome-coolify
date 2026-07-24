#!/usr/bin/env node
/**
 * Emit a "New tag:" line for changesets/action@v1 after a Version Packages
 * merge. The action parses stdout, then creates the git tag + GitHub Release
 * (createGithubReleases). npm publish stays in publish.yml (OIDC on release).
 *
 * Without a `publish` input, the action logs:
 *   "Not publishing because no publish script found"
 * and never creates releases — see PR #52 / #56 recoveries.
 */
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
console.log(`New tag: ${pkg.name}@${pkg.version}`);
