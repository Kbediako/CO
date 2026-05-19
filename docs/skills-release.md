# Bundled Skills Release + Install Guide

This guide defines how downstream users consume skills shipped with `@kbediako/codex-orchestrator`.

## What ships
- Bundled skills are stored under `skills/` in this repository and included in npm package files.
- Global user skills in `$CODEX_HOME/skills` should take precedence when present; bundled skills are fallback defaults.
- CO-196 posture lineage remains unchanged: npm package delivery is the baseline, and Codex plugin marketplace registration is additive coverage for Codex CLI `0.122.0` and newer command surfaces.
- Marketplace command transition: Codex CLI `0.121.0` accepts both `codex marketplace add` and `codex plugin marketplace add`; Codex CLI `0.122.0+` requires `codex plugin marketplace add`; current local posture is Codex CLI `0.130.0` with CO-local `gpt-5.5` / `xhigh`, and that CLI still supports `codex plugin marketplace upgrade` and `remove`.

## Install / refresh downstream
1. Install or upgrade package:
   - `npm install -g @kbediako/codex-orchestrator@latest`
2. Install bundled skills into Codex home:
   - `codex-orchestrator skills install`
3. Force refresh existing skill files (when release notes call it out):
   - `codex-orchestrator skills install --force`
4. Refresh only specific skills (avoid overwriting everything):
   - `codex-orchestrator skills install --only collab-subagents-first --force`
5. Verify expected skills exist:
   - `ls "$CODEX_HOME/skills"`

## Release-note requirement
- When a release adds or updates bundled skills, include them in release notes and link this guide.
- Example wording: `Shipped/updated bundled skills: <list>. Install with codex-orchestrator skills install --force`.

## Validation
- Run `npm run pack:audit` and `npm run pack:smoke` before release tags.
- Ensure `skills/**` changes appear in the generated tarball contents.
- `npm run pack:smoke` is the standard downstream simulation gate:
  - installs the packed tarball into a temp mock repo,
  - validates `codex-orchestrator review` artifact behavior in non-interactive + forced execution modes,
  - validates `codex-orchestrator skills install --only long-poll-wait` installs expected patience-first guidance,
  - validates packaged Codex marketplace install/register coverage for `codex-orchestrator` through `codex plugin marketplace add` or the older legacy `marketplace add` fallback, plus plugin install/status checks.
- Marketplace smoke is mandatory by default. A local development run that cannot install a marketplace-capable Codex CLI may skip only with both `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1` and `PACK_SMOKE_MARKETPLACE_SKIP_REASON=<reason>`, and that result is non-coverage evidence, not marketplace proof.
- CI standard: core-lane runs `npm run pack:smoke` automatically when downstream-facing paths change (CLI/package/skills/review-wrapper/docs wiring). Core-lane, pack-smoke backstop, and release workflows install `@openai/codex@0.125.0` before `npm run pack:smoke` so current plugin-marketplace coverage is present in release-facing lanes.
- `cloud-canary` still installs the explicit posture candidate from `docs/guides/codex-version-policy.md`; it is the cloud execution/fallback evidence lane, not release-facing `pack:smoke` marketplace proof.
