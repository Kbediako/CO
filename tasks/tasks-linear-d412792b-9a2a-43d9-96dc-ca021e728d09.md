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
- [x] Current-facing docs no longer say `js_repl` is default-on or toggleable. Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `docs/README.md`, `docs/guides/cloud-mode-preflight.md`, `docs/guides/rlm-recursion-v2.md`, and `docs/guides/upstream-codex-cli-sync.md`.
- [x] Generic cloud feature env vars remain documented for non-removed features. Evidence: `docs/README.md`, `docs/guides/cloud-mode-preflight.md`, and unchanged cloud executor request shaping.
- [x] Cloud feature pass-through tests use non-removed feature names instead of `js_repl`. Evidence: `orchestrator/tests/CodexCloudTaskExecutor.test.ts`, `orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts`.
- [x] Active `js_repl` canary script/package affordance is removed or clearly retired. Evidence: `package.json` removes `canary:js-repl-usage`; scripts/js-repl-usage-matrix.mjs is deleted.
- [x] Historical evidence-gate packet is labeled history-only by the accepted child lane patch. Evidence: child patch from `.runs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09-archive-js-repl-packet/cli/2026-04-30T23-39-24-326Z-1a3ae7d1/provider-linear-child-lane.patch` was manually imported after helper accept failed on Linear `updated_at` drift.

## Validation
- [x] Focused `CodexCloudTaskExecutor` / `OrchestratorCloudTargetExecutor` tests. Evidence: `npm run test:core -- orchestrator/tests/CodexCloudTaskExecutor.test.ts orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts` passed.
- [x] `node scripts/delegation-guard.mjs`. Evidence: command passed with existing same-issue child evidence.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: command passed.
- [x] `npm run build`. Evidence: command passed.
- [x] `npm run lint`. Evidence: command passed with existing `DelegationMcpHealth.test.ts` warnings only.
- [x] `npm run test`. Evidence: rerun passed 357 files / 5,180 tests after a first full-suite timing timeout was classified by an isolated `tests/spec-guard.spec.ts` pass.
- [x] `npm run docs:check`. Evidence: command passed after tightening `0.128.0` wording so it does not conflict with the separate CO version policy and removing deleted-script backtick path references.
- [ ] `npm run docs:freshness`. Evidence: blocked by unrelated docs freshness owner debt; current branch reports 30 stale docs plus 33 rolling rows under `CO-444`, and `docs:freshness:maintain -- --format json` returns `block_diff_local` for March 31 candidate cohorts. Clean `origin/main` worktree `/Users/kbediako/Code/CO/.workspaces/co452-main-baseline` at `2fa556a95` reproduces the same blocker. Related canonical-owner follow-up: `CO-454`.
- [ ] `npm run repo:stewardship`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] Manifest-backed standalone review and explicit elegance review. Evidence: pending.
- [ ] PR checks, actionable feedback sweep, and ready-review drain. Evidence: pending.

## Progress Log
- 2026-05-01: Live issue context showed `Ready`, no workpad, and no attached PR. Parent moved the issue to `In Progress`, created the single workpad, normalized the detached workspace onto branch `linear/co-452-retire-js-repl-posture` from `origin/main`, recorded `parallelize_now`, and launched child lane `archive-js-repl-packet` for historical packet labeling.
- 2026-05-01: Parent verified active `/opt/homebrew/bin/codex` is `codex-cli 0.128.0`; `codex features list` reports `js_repl` and `js_repl_tools_only` as `removed false`.
- 2026-05-01: Docs-review child stream succeeded before implementation. Evidence: `.runs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09-docs-review/cli/2026-04-30T23-45-07-409Z-1e813802/manifest.json`.
- 2026-05-01: Child lane `archive-js-repl-packet` succeeded and produced a clean three-file patch; helper accept failed after Linear `updated_at` drift, so parent imported the already checked patch manually.
- 2026-05-01: Parent validation reached `docs:freshness` / `docs:freshness:maintain` and found an unrelated canonical docs freshness blocker: `block_diff_local` on March 31 candidate cohorts owned by live same-project `CO-444`. A clean `origin/main` worktree reproduced the same result, so parent created related follow-up `CO-454` with canonical owner key `docs:freshness:maintain` and should block CO-452 rather than widen into stale packet/mirror debt.

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
