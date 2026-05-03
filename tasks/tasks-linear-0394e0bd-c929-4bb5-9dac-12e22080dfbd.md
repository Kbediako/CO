# Task Checklist - linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd

- Linear Issue: `CO-424` / `0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- MCP Task ID: `linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- Primary PRD: `docs/PRD-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- TECH_SPEC: `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Agent mirror: `.agent/task/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Worktree: `.workspaces/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- Branch: `kb/co-424-traceability-packet`

## Docs-First
- [x] PRD drafted with user-request translation, protected terms, wrong interpretations, non-goals, Not Done If, and acceptance criteria. Evidence: `docs/PRD-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
- [x] Canonical TECH_SPEC and TECH_SPEC mirror drafted. Evidence: `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`, `docs/TECH_SPEC-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
- [x] ACTION_PLAN drafted for packet setup and future implementation boundaries. Evidence: `docs/ACTION_PLAN-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
- [x] Registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Protected Issue Terms
- [x] `parallelization_serial_conflict`
- [x] `parallelization_decision_missing`
- [x] `stay_serial`
- [x] `forbid_parallel`
- [x] `same-issue child lanes`
- [x] `review handoff`
- [x] `merge handoff`
- [x] `post-merge/Done closeout`
- [x] `provider-linear-worker`
- [x] `proof lock`
- [x] `CO-423`
- [x] `PR #721`

## Setup Scope
- [x] Packet states this is setup/traceability only. Evidence: PRD, TECH_SPEC, and ACTION_PLAN.
- [x] Packet states the source fix is future work. Evidence: canonical TECH_SPEC future implementation requirements.
- [x] Packet rejects active-turn invariant weakening. Evidence: PRD Not Done If and TECH_SPEC Readiness Gate.
- [x] Packet rejects fake same-issue child lanes for `review handoff`, `merge handoff`, or `post-merge/Done closeout`. Evidence: PRD wrong interpretations and ACTION_PLAN risks.
- [x] Packet keeps `proof lock` safety protected. Evidence: PRD and canonical TECH_SPEC.

## Future Implementation
- [ ] Future lane inspects `orchestrator/src/cli/providerLinearWorkerRunner.ts` closeout/lifecycle sequencing.
- [ ] Future lane adds focused regression for post-handoff false `parallelization_decision_missing`.
- [ ] Future lane adds focused regression for post-handoff false `parallelization_serial_conflict`.
- [ ] Future lane proves true active-turn invariant failures still fail closed.
- [ ] Future lane validates the CO-423 / PR #721 style closeout no longer false-fails.

## Validation
- [x] `git status --short --branch`. Evidence: branch `kb/co-424-traceability-packet` refreshed onto `origin/main`; packet diff remains local pending commit/PR.
- [x] Protected-term and packet-path `rg` checks. Evidence: protected terms and six packet paths found across packet files, `docs/TASKS.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.
- [x] JSON parse for `tasks/index.json`. Evidence: `json ok`.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `json ok`.
- [x] `git diff --check`. Evidence: clean.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 5183 docs, 5186 registry entries`.
- [ ] `codex-orchestrator start docs-review --task linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`. Evidence: attempted with explicit delegation override in `.runs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd/cli/2026-05-03T15-14-06-188Z-beb6de00/manifest.json`; review launched as `gpt-5.5` / `xhigh` and failed on account usage limit with retry text `May 5th, 2026 5:52 PM`. Re-run before ready review or record an explicit quota waiver.

## Notes
- This setup lane must not edit implementation source or tests.
- This setup lane must not perform source-fix Linear/GitHub lifecycle work beyond packet PR/workpad attachment.
- This setup lane must not push or create a source-fix implementation PR.
- This setup lane is already a bounded worker lane, so no nested implementation delegation was launched.
