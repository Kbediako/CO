# Task Checklist - CO: re-audit Codex CLI 0.123.0 posture and next-release adoption target

- [x] PRD drafted for CO-322. Evidence: `docs/PRD-linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f.md`.
- [x] TECH_SPEC drafted and registered. Evidence: `docs/TECH_SPEC-linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f.md`, `tasks/specs/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f.md`, `tasks/index.json`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f.md`.
- [x] Linear workpad created and parallelization decision recorded. Evidence: Linear workpad comment `41d2b00d-b2f0-4c21-be33-ce1835f0eb63`; child lane `help-surface-evidence` succeeded at `.runs/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f-help-surface-evidence/cli/2026-04-23T02-59-27-752Z-95058cdd/manifest.json`, then accept was invalidated by Linear `updated_at` drift.
- [x] Official upstream and npm evidence captured. Evidence: `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/manual/codex-0123-release-audit/github-release-rust-v0.123.0.json`, `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/manual/codex-0123-release-audit/npm-openai-codex.json`.
- [x] Command/help surface compared and drift classified. Evidence: `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/manual/command-surface-0123/help-surface.log` and `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/manual/command-surface-0123/plugin-marketplace-0123.log`; classification: no P0/P1 drift for `exec`, `review`, `login`, `mcp`, or `app-server`; no marketplace-smoke regression versus current main because `codex plugin marketplace add/remove` is present even though top-level `codex marketplace` remains absent.
- [x] Runtime-mode canary rerun for `0.123.0`. Evidence: `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/manual/runtime-mode-canary-0123/runtime-canary-summary.json` reports 20/20 pass and `ready_for_default_flip=true`.
- [x] Required cloud canary rerun for `0.123.0`. Evidence: `.runs/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f-cloud-required-0123-current/cli/2026-04-23T04-56-19-486Z-012f562d/manifest.json`; result: failed before task submission because environment `6999395fcc448191b865917084f21c6f` was not found.
- [x] Fallback cloud canary rerun for `0.123.0`. Evidence: `.runs/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f-cloud-fallback-0123-current/cli/2026-04-23T04-56-47-062Z-7a811dfb/manifest.json`; result: passed the expected fallback contract with `cloud_fallback.mode_requested=cloud`, `cloud_fallback.mode_used=mcp`, and issue `missing_environment`.
- [x] Adoption decision recorded. Evidence: `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/manual/codex-version-canary/compare/decision-go-no-go.md`; decision: hold `0.123.0`, keep `0.122.0` as the held release-planning candidate.
- [x] Current-main docs gates rechecked after CO-324 baseline repair. Evidence: `npm run docs:check` returned `docs:check: OK`; `npm run docs:freshness` returned `docs:freshness OK - 4482 docs, 4485 registry entries`.
- [x] `node scripts/delegation-guard.mjs` passed. Evidence: command output `Delegation guard: OK (5 subagent manifest(s) found)`.
- [x] `node scripts/spec-guard.mjs --dry-run` passed. Evidence: command output `Spec guard: OK`.
- [x] `git diff --check` passed after final docs-packet patch.
- [x] `npm run build` passed after final docs-packet patch.
- [x] `npm run lint` passed with 3 existing `DelegationMcpHealth.test.ts` warnings.
- [x] `npm run test` passed. Evidence: `348` test files and `4639` tests passed.
- [x] `npm run docs:check` passed on current main after replay.
- [x] `npm run docs:freshness` passed on current main after replay.
- [x] `npm run repo:stewardship` passed. Evidence: 5592 tracked files, 0 action-required.
- [x] `node scripts/diff-budget.mjs` passed. Evidence: working-tree scope remained within budget.
- [x] Manifest-backed standalone review and elegance pass completed. Evidence: `../../.runs/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/cli/2026-04-23T04-43-28-829Z-33dc3a7f/review/telemetry.json` reports `status=succeeded` / `review_outcome=bounded-success` via `command-intent` boundary with no actionable findings; elegance artifact `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/manual/elegance-review.md`.
- [ ] PR attached and `pr ready-review` drain clean before In Review.

## Notes
- Final source policy must keep `0.123.0` unpromoted unless new required/fallback cloud evidence lands.
- Required cloud canary remains the promotion blocker; fallback success proves only the expected missing-environment MCP fallback path.
