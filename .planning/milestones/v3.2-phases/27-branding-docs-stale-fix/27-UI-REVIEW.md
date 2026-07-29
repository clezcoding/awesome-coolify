# Phase 27 — UI Review

**Audited:** 2026-07-29
**Baseline:** `27-UI-SPEC.md` (Markdown + MCP wire-format surfaces; no React/shadcn)
**Screenshots:** not captured (no dev server — code-only audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Core README/PROJECT copy matches contract; H3 title suffix + abbreviated verify Outcome deviate |
| 2. Visuals | 2/4 | Verify doc hierarchy solid; screenshot metadata contradicts on-disk file (stale Phase 16 JPEG-as-PNG) |
| 3. Color | 4/4 | Brand tokens documented; accent scoped to assets only; PNG-only icons[] |
| 4. Typography | 3/4 | GitHub Markdown roles satisfied; undeclared H3 parenthetical in README EN/DE |
| 5. Spacing | 4/4 | Section breaks and `---` rhythm match Markdown spacing contract |
| 6. Experience Design | 2/4 | Dual-path verify + CDN/error backstops covered; screenshot empty-state inconsistent |

**Overall: 18/24**

---

## Top 3 Priority Fixes

1. **Screenshot evidence stale/inconsistent** — Maintainer verify doc says `_(screenshot pending)_` but `docs/assets/cursor-icon-verify.png` exists (dated 2026-07-23, JPEG content with `.png` extension, predates Phase 27 verify). Readers cannot trust visual evidence. Capture fresh Phase 27 Cursor MCP list screenshot showing letter-"A" fallback on both paths, commit as real PNG, remove `_(screenshot pending)_` from L5; or delete stale file and keep pending note only.

2. **README H3 title drift from UI-SPEC** — `README.md` L599 and `README.de.md` L599 use `### 🎨 Branding (\`serverInfo.icons\`)`; UI-SPEC copy table declares `### 🎨 Branding` only. Rename both H3s to match contract (body copy already correct).

3. **Verify doc Outcome metadata abbreviated** — `cursor-icon-verify.md` L4 says `Client limitation (server correct) per D-05`; UI-SPEC requires `Client limitation (server correct) — data URI + multi-size CDN in initialize; Cursor UI may omit custom icon.` Expand Outcome line to contract wording so public docs stand alone without CONTEXT cross-ref.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**WARNING — H3 title suffix undeclared**

- `README.md:599` — `### 🎨 Branding (\`serverInfo.icons\`)` vs UI-SPEC surface inventory `### 🎨 Branding`
- `README.de.md:599` — same deviation

**WARNING — Verify Outcome text abbreviated**

- `docs/assets/cursor-icon-verify.md:4` — `per D-05` shorthand; UI-SPEC copy table L148 specifies fuller outcome string with data URI + CDN detail

**PASS — Contract copy matches**

- `README.md:136` — feature bullet matches UI-SPEC EN exactly
- `README.de.md:136` — feature bullet matches UI-SPEC DE exactly
- `README.md:601` / `README.de.md:601` — branding body paragraphs match UI-SPEC copy table
- `.planning/PROJECT.md:5` — `1.0.1 shipped`; no banned `pending Version Packages` phrasing
- `docs/en/cloud.md:103` / `docs/de/cloud.md:103` — dual-icon wording + verify link present
- Banned phrases absent from public surfaces (`src/mcp/server.ts` uses `readPackageVersion()`, not `0.1.0`)

### Pillar 2: Visuals (2/4)

**WARNING — Screenshot metadata contradicts filesystem**

- `docs/assets/cursor-icon-verify.md:5` — links to `./cursor-icon-verify.png` with `_(screenshot pending)_` qualifier
- `docs/assets/cursor-icon-verify.png` — exists (34 KB, 1024×490) but `file` reports **JPEG** data with `.png` extension; mtime **2026-07-23** (six days before Phase 27 verify on 2026-07-29)

**PASS — Verify doc visual hierarchy**

- All 9 required sections present in order (title → variant → Path A → Path B → server emits → CDN → SDK → forum evidence → conclusion table)
- Conclusion table (`cursor-icon-verify.md:216-223`) provides scannable per-path ✓/✗ grid
- UI-SPEC empty/fallback state documented: generic letter **"A"** (`cursor-icon-verify.md:35,93`)

### Pillar 3: Color (4/4)

**PASS — Brand tokens aligned**

- `docs/assets/README.md:65-70` — Primary `#6b16ed`, Canvas `#101010`, Surface `#181818`, Accent `#fcd34d` match UI-SPEC color table
- No accent color applied to verify-doc body text or JSON samples (accent reserved for mascot/README emoji per spec)
- `src/mcp/server-icons.ts` — PNG entries only; no SVG in `icons[]` (UI-SPEC security rule)

**PASS — Wire-format icon contract**

- `buildMcpServerIcons()` returns 3 entries: data URI first (D-02), then jsDelivr `favicon-32.png`, then `mcp-icon-192.png` — matches UI-SPEC MCP Icon Contract table

### Pillar 4: Typography (3/4)

**WARNING — Undeclared H3 variant**

- README EN/DE use four-role Markdown typography via GitHub renderer (body 16px, mono JSON 14px) — compliant
- H3 `(`serverInfo.icons`)` suffix adds undeclared display text not in UI-SPEC typography/copy contract

**PASS — Verify doc heading roles**

- H1 verify title (`cursor-icon-verify.md:1`), H2 section headers, H3 subsections follow Display/Heading roles
- JSON samples use 2-space indent placeholder `{…}` per overflow backstop

### Pillar 5: Spacing (4/4)

**PASS — Markdown rhythm**

- `README.md:603` — `---` horizontal rule after branding section (lg 24px token)
- Verify doc uses blank-line paragraph gaps between Path A/B sections, CDN block, and Conclusion — consistent with md 16px rhythm
- No arbitrary `[Npx]` or custom CSS introduced this phase

### Pillar 6: Experience Design (2/4)

**WARNING — Empty-screenshot backstop inconsistent (BLOCKER-class for BRND-02 evidence quality)**

- UI-SPEC UI Considerations: verify-doc screenshot missing → covered by pending note OR committed PNG
- Implementation has **both** stale on-disk PNG **and** pending metadata — contradictory; neither satisfies "fresh Phase 27 evidence"

**PASS — State coverage otherwise solid**

| State | Status | Evidence |
|-------|--------|----------|
| CDN unreachable | ✅ | `cursor-icon-verify.md:190-200` curl -I 200 |
| initialize missing data URI | ✅ | `server-icons.test.ts:10-14` asserts `data:image/png;base64,` prefix |
| Both paths verified | ✅ | Path A L13-70, Path B L72-126 |
| Partial (one path only) | ✅ | Conclusion table per-path columns |
| icons[] count | ✅ | Length 3 documented + `server-icons.test.ts:4-7` |
| Base64 overflow | ✅ | `{…}` placeholder + stdio dump procedure L163-188 |
| Client limitation (D-05) | ✅ | Documented with initialize dump both paths |

**Minor — Optional gold callout unused**

- UI-SPEC allows `#fcd34d` gold for client-limitation conclusion row; verify doc uses plain table text only (optional, not required for pass)

---

## Files Audited

- `src/mcp/server-icons.ts`
- `src/mcp/server-icons.test.ts`
- `src/mcp/server.ts` (grep: icons + version wire-up)
- `src/mcp/mcp-icon-data.ts` (header)
- `scripts/generate-mcp-icon-data.mjs`
- `package.json` (build script)
- `docs/assets/cursor-icon-verify.md`
- `docs/assets/cursor-icon-verify.png` (metadata only — stale)
- `docs/assets/README.md`
- `README.md` (L136, L599-603)
- `README.de.md` (L136, L599-603)
- `docs/en/cloud.md`
- `docs/de/cloud.md`
- `.planning/PROJECT.md` (L5)
- `tests/integration/doc-version-parity.test.ts`
