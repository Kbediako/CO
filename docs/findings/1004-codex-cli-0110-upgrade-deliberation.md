# Findings - 1004 Codex CLI 0.110 Upgrade Deliberation

- Date: 2026-03-05
- Task: `1004-codex-0110-version-policy-refresh-and-adoption-sequencing`
- Scope: capture external + local audit facts for Codex CLI version-policy refresh and next-slice sequencing.

## Completed Audit Sources
- External release audit: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/02b-external-openai-codex-release-audit.json`
- External release summary: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/02c-external-openai-codex-release-summary.json`
- Local CLI audit: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/01-local-codex-cli-audit.log`
- Local fork delta audit: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/03-local-codex-fork-delta-audit.log`
- Current policy baseline (repo): `docs/guides/codex-version-policy.md`

## Fact Register

### Confirmed
- [confirmed] Local installed Codex CLI is `codex-cli 0.110.0` at `/opt/homebrew/bin/codex`.
- [confirmed] Latest stable upstream release in the audited window is `rust-v0.110.0` (`isLatest=true`, published `2026-03-05T02:22:46Z`).
- [confirmed] Latest prerelease in the audited window is `rust-v0.111.0-alpha.1` (published `2026-03-05T04:33:24Z`).
- [confirmed] The current CO policy guide still names stable `0.107.0` and prerelease lane `0.107.0-alpha.9`.
- [confirmed] Local fork delta audit shows `/Users/kbediako/Code/codex` is `0 ahead / 243 behind` vs `upstream/main` (and same for `origin/main...upstream/main`) at audit time.

### Inferred
- [inferred] CO version-policy docs are stale relative to audited upstream/local release state and require a docs refresh lane before any adoption decision artifacts stay trustworthy.
- [inferred] A default flip to any new prerelease lane must remain blocked until a fresh canary decision matrix is recorded for this cycle.
- [inferred] Parser/wrapper hardening should remain conditional and activate only if canary outputs expose parsing/schema/compat regressions in the 0.110+ upgrade path.

## 1004 Deliberation Outcome
- Proceed with docs-first refresh scaffolding and sequencing definitions in task 1004.
- Defer adoption decision to task 1005 (canary matrix + explicit go/hold decision).
- Keep break-glass/fallback posture intact in planning docs until canary-backed evidence exists.

## Risk Controls Carried Forward
- No default flip without canary evidence.
- Keep plugin governance out of this slice (deferred).
- Treat parser/wrapper hardening as conditional scope only.
