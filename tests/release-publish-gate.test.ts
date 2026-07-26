import { describe, expect, it } from "vitest";
import {
  npmHasVersion,
  shouldAnnounceNewTag,
} from "../scripts/lib/release-publish-gate.mjs";

describe("shouldAnnounceNewTag", () => {
  it("announces when version is not on npm", () => {
    expect(shouldAnnounceNewTag({ onNpm: false })).toBe(true);
  });

  it("suppresses New tag when version already on npm", () => {
    expect(shouldAnnounceNewTag({ onNpm: true })).toBe(false);
  });
});

describe("npmHasVersion", () => {
  it("returns true when npm view prints the version", () => {
    const run = () => "0.5.0\n";
    expect(npmHasVersion("awesome-coolify-mcp", "0.5.0", run)).toBe(true);
  });

  it("returns false on npm view failure (unpublished)", () => {
    const run = () => {
      throw new Error("404");
    };
    expect(npmHasVersion("awesome-coolify-mcp", "0.5.0", run)).toBe(false);
  });

  it("returns false when view returns a different version string", () => {
    const run = () => "0.4.0\n";
    expect(npmHasVersion("awesome-coolify-mcp", "0.5.0", run)).toBe(false);
  });
});
