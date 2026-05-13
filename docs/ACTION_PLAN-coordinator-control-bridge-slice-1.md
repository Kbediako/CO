# ACTION_PLAN - Coordinator Control Bridge Slice 1

## Summary
- Goal: lock implementation-ready contracts for Coordinator control forwarding (`pause`, `resume`, `cancel`, `status`) into CO with explicit auth/idempotency/traceability rules.
- Scope: docs-first artifacts, task/spec registration, and checklist mirror sync only.
- Assumptions: CO control surfaces remain authoritative and unchanged during this docs-only slice.

## Milestones & Sequencing
1) Docs-first scaffolding and registration
- Create PRD + TECH_SPEC + ACTION_PLAN + canonical spec + checklist mirrors.
- Register run/spec entries in `tasks/index.json`.
- Prepend 0993 snapshot line in `docs/TASKS.md`.

2) Contract freeze before coding
- Freeze control action request/response contract for pause/resume/cancel/status.
- Freeze auth/token boundary contract and fail-closed rejection semantics.
- Freeze idempotency key/dedupe/no-op semantics.
- Freeze audit and traceability field contract across manifest/events/status outputs.
- Run docs-review and record manifest evidence before implementation starts:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 0993-coordinator-control-bridge-slice-1`

3) Implementation phase (next stream, not this one)
- Implement Coordinator bridge calls and CO control-side audit capture per frozen contracts.
- Add idempotency/auth/traceability tests and error-path coverage.

4) Validation and review phase (next stream, not this one)
- Run ordered quality gates 1-10.
- Run targeted control-bridge contract tests.
- Capture manifest-backed review evidence and finalize closeout decision.

## Dependencies
- Existing CO control/status surfaces and manifest/event outputs.
- Current AGENTS policy defaults for runtime modes and delegation/evidence handling.
- Coordinator planning docs under `/Users/kbediako/Documents/Plans/CO/coordinator`.

## Validation
- Ordered gates (required):
  - `node scripts/delegation-guard.mjs --task 0993-coordinator-control-bridge-slice-1`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Evidence path target: `out/0993-coordinator-control-bridge-slice-1/manual/`.

## Risks & Mitigations
- Risk: auth boundary drift between Coordinator planning docs and current CO policy defaults.
- Mitigation: explicit realignment section in PRD/spec and pre-coding contract freeze.
- Risk: duplicate control requests causing unintended repeated side effects.
- Mitigation: mandatory idempotency keys, deterministic dedupe behavior, and no-op response semantics.
- Risk: missing cross-artifact traceability for incident/replay workflows.
- Mitigation: required trace fields in status + manifest + event outputs.
