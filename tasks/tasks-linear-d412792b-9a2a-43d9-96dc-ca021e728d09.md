# Task Checklist - linear-d412792b-9a2a-43d9-96dc-ca021e728d09

- Linear Issue: `CO-452` / `d412792b-9a2a-43d9-96dc-ca021e728d09`
- MCP Task ID: `linear-d412792b-9a2a-43d9-96dc-ca021e728d09`
- Canonical task id: `20260501-linear-d412792b-9a2a-43d9-96dc-ca021e728d09`
- Primary PRD: `docs/PRD-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- TECH_SPEC: `tasks/specs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- Source anchor: `ctx:sha256:16dbde8f2aa6d7d4bb0341d4618425add924fcec775778f2e35ba95b7c181b26#chunk:c000001`

## Docs-First
- [x] PRD drafted with the CO-452 posture contract and live `codex-cli 0.128.0` feature evidence. Evidence: `docs/PRD-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`.
- [x] TECH_SPEC drafted with protected surfaces, non-goals, and validation plan. Evidence: `tasks/specs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`, `docs/TECH_SPEC-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`.
- [x] Task checklist and `.agent` mirror drafted. Evidence: `tasks/tasks-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`, `.agent/task/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`.
- [x] Registry mirrors updated. Evidence: `tasks/index.json`, `docs/docs-freshness-registry.json`, `docs/TASKS.md`.
- [x] Pre-implementation issue-quality review recorded in the spec packet. Evidence: `tasks/specs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`.
- [x] Docs-review evidence captured before implementation. Evidence: `.runs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09-docs-review/cli/2026-04-30T23-45-07-409Z-1e813802/manifest.json` succeeded with `delegation-guard`, `spec-guard`, `docs:check`, `docs:freshness:maintain`, and review outcome `clean success`.

## Parent Implementation Acceptance
- [x] Current-facing docs and bundled skill guidance no longer say `js_repl` is default-on or toggleable. Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `docs/README.md`, `docs/guides/cloud-mode-preflight.md`, `docs/guides/rlm-recursion-v2.md`, `docs/guides/upstream-codex-cli-sync.md`, and `skills/codex-orchestrator/SKILL.md`.
- [x] Generic cloud feature env vars remain documented for non-removed features. Evidence: `docs/README.md`, `docs/guides/cloud-mode-preflight.md`, and unchanged cloud executor request shaping.
- [x] Cloud feature pass-through tests use non-removed feature names instead of `js_repl`. Evidence: `orchestrator/tests/CodexCloudTaskExecutor.test.ts`, `orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts`.
- [x] Active `js_repl` canary script/package affordance is removed or clearly retired. Evidence: `package.json` removes `canary:js-repl-usage`; scripts/js-repl-usage-matrix.mjs is deleted.
- [x] Historical evidence-gate packet is labeled history-only and registry rows are archived. Evidence: child patch from `.runs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09-archive-js-repl-packet/cli/2026-04-30T23-39-24-326Z-1a3ae7d1/provider-linear-child-lane.patch` was manually imported after helper accept failed on Linear `updated_at` drift; `docs/docs-freshness-registry.json` archives the PRD/TECH_SPEC/ACTION_PLAN rows.

## CO-382 Fallback Metadata
- Large-refactor check: no large refactor is required because CO-452 removes the stale `js_repl` active posture instead of adding another compatibility layer.
- Minor-seam check: the bounded minor-seam removal is acceptable because generic cloud feature pass-through remains intact while only removed-feature guidance and canary affordances are retired.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `js_repl` active posture guidance | default-on, break-glass, and cloud feature-contract guidance for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-03 | 2026-05-01 | immediate removal | current-facing docs no longer recommend `js_repl` enable/disable or cloud feature toggles | `rg`, docs checks, focused cloud feature tests |
| scripts/js-repl-usage-matrix.mjs | active canary matrix for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-02 | 2026-05-01 | immediate removal | package script and source checkout no longer expose the `js_repl` canary as current guidance | package script audit and focused cloud feature tests |

## Validation
- [x] Focused `CodexCloudTaskExecutor` / `OrchestratorCloudTargetExecutor` tests. Evidence: `npm run test:core -- orchestrator/tests/CodexCloudTaskExecutor.test.ts orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts` passed.
- [x] `node scripts/delegation-guard.mjs`. Evidence: command passed with existing same-issue child evidence.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: command passed.
- [x] `npm run build`. Evidence: command passed.
- [x] `npm run lint`. Evidence: command passed with existing `DelegationMcpHealth.test.ts` warnings only.
- [x] `npm run test`. Evidence: rerun passed 357 files / 5,180 tests after first-run timing failures in `CliExecRuntime` and `ControlRuntime` were isolated as passing individually.
- [x] `npm run docs:check`. Evidence: command passed after tightening `0.128.0` wording so it does not conflict with the separate CO version policy and removing deleted-script backtick path references.
- [x] `npm run docs:freshness`. Evidence: command passed after related CO-454 resolved the earlier March 31 candidate-cohort blocker; rolling CO-444 rows remain report-only with no stale failure.
- [x] `npm run repo:stewardship`. Evidence: command passed with 6,173 tracked files and 0 action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: command passed for the working tree, 7 files / 59 lines.
- [x] `npm run pack:smoke`. Evidence: command passed; downstream review smoke completed with clean success.
- [x] Manifest-backed standalone review and explicit elegance review. Evidence: `../../.runs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09/cli/2026-05-01T06-54-26-255Z-2ca5d7e6/review/telemetry.json` reports `status=succeeded`, `review_outcome=bounded-success`, and no actionable findings; `out/linear-d412792b-9a2a-43d9-96dc-ca021e728d09/manual/elegance-review.md` records the explicit minimality pass with no simplification patch needed.
- [ ] PR checks, actionable feedback sweep, and ready-review drain. Evidence: pending.

## Progress Log
- 2026-05-01: Live issue context showed `Ready`, no workpad, and no attached PR. Parent moved the issue to `In Progress`, created the single workpad, normalized the detached workspace onto branch `linear/co-452-retire-js-repl-posture` from `origin/main`, recorded `parallelize_now`, and launched child lane `archive-js-repl-packet` for historical packet labeling.
- 2026-05-01: Parent verified active `/opt/homebrew/bin/codex` is `codex-cli 0.128.0`; `codex features list` reports `js_repl` and `js_repl_tools_only` as `removed false`.
- 2026-05-01: Docs-review child stream succeeded before implementation. Evidence: `.runs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09-docs-review/cli/2026-04-30T23-45-07-409Z-1e813802/manifest.json`.
- 2026-05-01: Child lane `archive-js-repl-packet` succeeded and produced a clean three-file patch; helper accept failed after Linear `updated_at` drift, so parent imported the already checked patch manually.
- 2026-05-01: Parent validation reached `docs:freshness` / `docs:freshness:maintain` and found an unrelated canonical docs freshness blocker: `block_diff_local` on March 31 candidate cohorts owned by live same-project `CO-444`. A clean `origin/main` worktree reproduced the same result, so parent created related follow-up `CO-454` with canonical owner key `docs:freshness:maintain` and should block CO-452 rather than widen into stale packet/mirror debt.
- 2026-05-01: After CO-454 landed upstream, parent merged `origin/main`, reran required gates, and confirmed `docs:freshness`, `repo:stewardship`, diff-budget, full tests, and pack smoke are clean. Remaining work is standalone review, elegance review, PR lifecycle, and Linear review handoff.
- 2026-05-01: Manifest-backed standalone review completed with `review_outcome=bounded-success` and no actionable findings; explicit elegance review found no smaller safe patch after the review cleanup commits. Remaining work is PR lifecycle and Linear review handoff.

## Relevant Files
- `docs/PRD-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- `docs/TECH_SPEC-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- `docs/ACTION_PLAN-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- `tasks/specs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- `tasks/tasks-linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- `.agent/task/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`
- `docs/TASKS.md`

## Notes
- CO-449 remains the canonical broader `0.128.0` release-intake and posture audit.
- CO-450 and CO-451 remain separate bounded follow-ups.
- CO-454 is the related canonical-owner follow-up for the May 1 March 31 docs freshness candidate cohorts blocking this lane's required validation.
