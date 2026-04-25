# Task Checklist - linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4

- Linear Issue: `CO-274` / `89c4cb0d-4423-4b1d-865f-25a768b9d7b4`
- MCP Task ID: `linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4`
- Primary PRD: `docs/PRD-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`
- TECH_SPEC: `tasks/specs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`
- Source anchor: `ctx:sha256:395893ee7f0985529df981453f3c5cc80e32afb59fe1ed6d49d83252a23013ac#chunk:c000001`
- Source payload: `.runs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4/cli/2026-04-21T14-09-01-063Z-719778ff/memory/source-0/source.txt`

## Evidence Gates
- [x] Issue-quality review captured. Evidence: `tasks/specs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`.
- [x] Standalone review approval captured. Evidence: `.runs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4/cli/2026-04-21T14-23-53-414Z-fd53cf4b/review/telemetry.json` reports bounded-success after command-intent retry; output log reported no actionable issues.
- [x] Docs-review manifest captured before implementation. Evidence: `.runs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4/cli/2026-04-21T14-23-53-414Z-fd53cf4b/manifest.json`.
- [x] Implementation review manifest captured. Evidence: same manifest-backed `npm run review -- --manifest ... --uncommitted` rerun under `FORCE_CODEX_REVIEW=1`; output log reported no actionable issues.

## Rework Reset
- [x] Live Linear issue context inspected before mutation. Evidence: `linear issue-context --issue-id 89c4cb0d-4423-4b1d-865f-25a768b9d7b4`.
- [x] Previous workpad deleted for Rework reset. Evidence: `linear delete-workpad` returned deleted comment `a7e154d2-8c77-419c-bc10-d30620a21069`.
- [x] No attached PR required closing at reset start. Evidence: live issue-context `pull_request_attachments.current: null`.
- [x] Fresh Rework branch/worktree created from `origin/main`. Evidence: branch `linear/co-274-provider-worker-stdin-bootstrap-rework` at `7760ff781a13c35710b20aefb2d25624a408909c`.
- [x] Required current-turn parallelization decision recorded. Evidence: `linear parallelization` recorded `stay_serial` / `single_bounded_change`.

## Docs-First Packet
- [x] PRD drafted for the provider-worker stdin bootstrap failure classification issue. Evidence: `docs/PRD-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, explicit CO-224/CO-225 separation, non-goals, Not Done If, and implementation seams. Evidence: `tasks/specs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`, `docs/TECH_SPEC-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`.
- [x] ACTION_PLAN drafted for implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`.
- [x] Task registry updated. Evidence: `tasks/index.json`.
- [x] Checklist mirrored to `.agent/task/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`. Evidence: `.agent/task/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`.

## Implementation Tasks
- [x] Inspect provider-worker bootstrap/stdin failure classification seam. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Reproduce or fixture the exact `stderr | Reading additional input from stdin...` failure. Evidence: `ProviderLinearWorkerRunner.test.ts` stdin bootstrap failed-proof regression.
- [x] Classify this seam separately from generic `provider_runtime`, with targeted guidance pointing operators to the runtime/bootstrap boundary. Evidence: `provider_stdin_bootstrap` classifier/guidance and focused runner test.
- [x] Preserve exact `stderr | Reading additional input from stdin...` evidence in proof, manifest/read-model, and operator summaries. Evidence: proof `failure_diagnosis.signal` plus handoff `retry_error` regression.
- [x] Preserve `linear_audit.attempted_count` truth, especially zero-attempt pre-work failures. Evidence: failed-proof regression expects `linear_audit.attempted_count: 0`.
- [x] Preserve retry/resumable queue behavior while avoiding false issue-progress signals. Evidence: handoff regression expects `provider_stdin_bootstrap: stderr | Reading additional input from stdin...`.
- [x] Add regression coverage or deterministic fixtures that distinguish this seam from `CO-224` and `CO-225`. Evidence: stdin bootstrap classifier/proof/queue tests keep generic `provider_runtime` and stale proof-diagnostic paths distinct.

## Validation
- [x] Protected-term check over the packet and mirrors. Evidence: `rg -n "provider-linear-worker|control-host|stderr \\| Reading additional input from stdin\\.\\.\\.|provider_runtime|provider-linear-worker-proof\\.json|manifest\\.json|linear_audit\\.attempted_count|retry/resumable queue behavior|CO-224|CO-225|ctx:sha256:395893ee7f0985529df981453f3c5cc80e32afb59fe1ed6d49d83252a23013ac#chunk:c000001" ...` over the six CO-274 packet/mirror files.
- [x] Docs-review manifest-backed evidence captured, or documented fallback if unavailable. Evidence: child-stream failed with `provider_worker_child_stream_provenance_invalid`; direct docs-review succeeded with scoped delegation override at `.runs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4/cli/2026-04-21T14-23-53-414Z-fd53cf4b/manifest.json`.
- [x] Focused provider-worker diagnostic regression for `stderr | Reading additional input from stdin...`. Evidence: `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts -t "stdin bootstrap|machine-readable provider diagnostic"`.
- [x] Proof/manifest regression preserving `linear_audit.attempted_count: 0`. Evidence: same focused runner command, `classifies a stdin bootstrap exit in the failed proof sidecar before issue execution`.
- [x] Retry/resumable queue behavior regression. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts -t "terminal failed proof evidence|stale failed proof summary or diagnostics"`.
- [x] Fixture/regression distinguishing this seam from `CO-224` and `CO-225`. Evidence: machine-readable provider_runtime case remains generic, stdin bootstrap gets `provider_stdin_bootstrap`, and stale proof diagnostics do not override manifest-backed failures.
- [x] Required repo validation gates completed or bounded blockers recorded. Evidence: after merging latest `origin/main`, `node scripts/delegation-guard.mjs` passed with scoped child-stream provenance fallback override; `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run test` (`347` files / `4461` tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` passed. `npm run lint` passed with three pre-existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] Standalone review plus elegance review completed before review handoff. Evidence: manifest-backed standalone review ended bounded-success with no actionable issues; elegance pass collapsed duplicate stdin-bootstrap structured diagnostic aliases into shared sets and reran focused regressions, build, lint, and pack-smoke.
- [x] PR attached before review handoff. Evidence: Linear attachment `3c2fd1ce-4671-408e-b1c9-123fecad3956` points to PR #584, `https://github.com/Kbediako/CO/pull/584`.
- [ ] `pr ready-review` drain clean before state transition to `In Review`.

## Notes
- 2026-04-22: Rework reset started from current `origin/main`; prior dirty CO-274 worktree is retained for audit/reference only and was not mutated.
- 2026-04-22: Implemented `provider_stdin_bootstrap` classification and authoritative proof-to-retry surfacing for the exact `stderr | Reading additional input from stdin...` control-host/provider-linear-worker bootstrap failure.
- 2026-04-22: Standalone review telemetry is successful bounded review completion, not a blocker: bounded-success after command-intent retry, output log found no actionable issues. Elegance pass kept the implementation minimal by consolidating stdin-bootstrap diagnostic aliases into shared classifier sets.
- 2026-04-22: Merged latest `origin/main`, resolved registry conflicts by retaining both CO-274 and CO-276 rows, and reran the validation floor green before PR handoff.
