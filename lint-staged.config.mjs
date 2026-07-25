/**
 * Fast pre-commit gate: build once + tests related to staged sources.
 * Docs-only commits (.planning/, *.md) match nothing → skip (exit 0).
 * Full suite stays in CI (`pnpm test`).
 */
export default {
  "**/*.{ts,js,mjs}": (filenames) => {
    const quoted = filenames
      .map((f) => `"${f.replace(/(["\\$`])/g, "\\$1")}"`)
      .join(" ");
    return [
      "pnpm run lint",
      `pnpm exec vitest related --run --passWithNoTests ${quoted}`,
    ];
  },
};
