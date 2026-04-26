# ACTION PLAN - CO Cloud Env Missing Vs Not-Found Classification

## Summary
- Goal: prepare CO-358 for parent implementation by preserving the cloud preflight and cloud canary classification contract.
- Scope: docs-first packet, parent-owned implementation planning, focused cloud preflight/canary validation, docs checks, standalone review, and elegance pass.
- Assumptions: the source payload available to this child lane carried run/issue identity only; acceptance language is carried from the parent prompt and must be reconciled by the parent against authoritative Linear/workpad state.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `codex-orchestrator doctor --cloud-preflight`, `CODEX_CLOUD_ENV_ID`, `codex cloud exec`, `environment ... not found`, `required cloud canary`, `missing_environment`, and promotion gates.
- Not done if: missing env and not-found/inaccessible env ids stay indistinguishable; required cloud canary is bypassed or satisfied by fallback evidence; cloud/mcp modes or model defaults change; or promotion gates clear without required cloud and fallback evidence or an explicit owner-approved waiver.
- Pre-implementation issue-quality review: approved for parent implementation. The issue preserves protected terms and rejects nearby wrong interpretations that would weaken cloud evidence.

## Milestones & Sequencing
1. Child lane drafts the six docs-first packet files and leaves changes uncommitted for parent patch export.
2. Parent reconciles the packet with the authoritative CO-358 Linear issue/workpad and updates registries/mirrors it owns.
3. Parent implements the smallest cloud preflight/canary classification change that separates absent env configuration from `environment ... not found` using `codex cloud list --env <id> --limit 1 --json` before `codex cloud exec`.
4. Parent adds focused fake-Codex regressions for doctor JSON/text, pre-exec environment probing, and required/fallback cloud canary behavior.
5. Parent updates any operator docs or version-policy notes only where the new classification affects promotion-gate interpretation.
6. Parent runs focused validation, `npm run docs:check`, standalone review, and an elegance pass before PR handoff.

## Dependencies
- `orchestrator/src/cli/utils/cloudPreflight.ts`; doctor JSON/text output; `orchestrator/src/cloud/CodexCloudTaskExecutor.ts`; `scripts/cloud-canary-ci.mjs`; `tests/cli-command-surface.spec.ts`; `tests/cloud-canary-ci.spec.ts`; `tests/cloud-canary-ci-classification.spec.ts`; `docs/guides/cloud-mode-preflight.md`; `docs/guides/codex-version-policy.md`.

## Validation
- Checks / tests: focused cloud preflight regressions for absent `CODEX_CLOUD_ENV_ID` and configured env ids rejected by `codex cloud list`; required/fallback cloud canary distinction regressions; `npm run docs:check`; standalone review covering required cloud canary and promotion gates; explicit elegance pass.
- Rollback plan: if the not-found/inaccessible env classification cannot be made bounded, parent should stop and relaunch with widened ownership rather than weakening `missing_environment` or required cloud canary behavior.

## Risks & Mitigations
- Probe cost/mutation risk: use bounded non-mutating `codex cloud list --env <id> --limit 1 --json` and keep fallback classification separate from `codex cloud exec` submission.
- Gate-loosening risk: fallback pass remains limited to assertion-proven absent-env `missing_environment`; required and fallback cloud canaries stay separate with exact blocker evidence.
- Naming risk: use explicit `environment_not_found` and `environment_unavailable` codes distinct from `missing_environment`.

## Approvals
- Docs packet child lane: completed on 2026-04-25.
- Parent docs-review / implementation / validation / PR lifecycle: current-main replay superseded the stale docs-gate blockers; PR lifecycle remains pending parent lane.
