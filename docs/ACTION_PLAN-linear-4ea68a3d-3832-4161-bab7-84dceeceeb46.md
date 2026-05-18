# ACTION_PLAN - CO: scope provider-linear parallelization proof invariants to the current turn

## Added by Docs Child Lane 2026-04-23

## Summary
- Goal: prevent successful multi-turn provider-linear runs from ending failed because earlier valid turn-level parallelization decisions are counted as current-turn duplicates.
- Scope: docs-first packet in this child lane; parent-owned implementation, focused validation, registry mirrors, review, PR lifecycle, Linear, and workpad updates.
- Issue frame: `CO-326` is a proof invariant scoping bug, not a request to weaken parent-owned same-issue child-lane parallelization rules.
- Required protected terms: `provider-linear-worker-proof`, `parallelization_decision_multiple`, `owner_status=failed`, `manifest.status`, `runs.json`, `provider-linear-worker-linear-audit.jsonl`, `current-turn same-issue parallelization decision`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider-linear-worker-proof`
  - `parallelization_decision_multiple`
  - `owner_status=failed`
  - `manifest.status`
  - `runs.json`
  - `provider-linear-worker-linear-audit.jsonl`
  - `current-turn same-issue parallelization decision`
- Not done if:
  - earlier-turn valid decisions can still force `parallelization_decision_multiple`
  - a successful lane can still close out with failed proof, failed `manifest.status`, or failed `runs.json` solely due to cumulative audit history
  - true same-turn duplicate decisions no longer fail closed
  - missing current-turn decisions no longer fail closed
  - historical audit rows are deleted or rewritten
- Pre-implementation issue-quality review:
  - 2026-04-23: docs child lane preserves `CO-326` as a current-turn invariant scope bug and explicitly rejects weakening the contract, masking real failures, deleting audit history, or broadening closeout semantics.

## Milestones & Sequencing
1. Create this docs-first packet for `CO-326`.
2. Parent accepts or refreshes registry mirrors in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Parent inspects provider-linear proof finalization and identifies the authoritative current-turn boundary.
4. Parent implements current-turn scoping for parallelization invariant evaluation without truncating `provider-linear-worker-linear-audit.jsonl`.
5. Parent adds focused regressions for multi-turn one-decision-per-turn success, same-turn duplicate failure, missing current-turn failure, and previous-turn / previous-attempt isolation.
6. Parent verifies `provider-linear-worker-proof`, `manifest.status`, `runs.json`, and operator diagnostics align on the successful multi-turn case.
7. Parent runs scoped validation, docs-review or implementation gate, and owns PR closeout.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `provider-linear-worker-proof`
- `provider-linear-worker-linear-audit.jsonl`
- `manifest.status`
- `out/.../runs.json`
- provider issue observability / operator diagnostic summaries
- Existing provider-linear worker focused tests and fixtures

## Validation
- Docs child lane:
  - protected-term check across the six owned packet files
  - trailing-whitespace scan across the six owned packet files
- Parent implementation lane:
  - multi-turn success with one valid decision per turn does not fail with `parallelization_decision_multiple`
  - two decisions in the same current turn still fail with `parallelization_decision_multiple`
  - missing current-turn decision still fails closed
  - previous-turn and previous-attempt decisions do not hydrate into a new current turn
  - proof, manifest, `runs.json`, and diagnostics align after successful closeout
  - scoped vitest command selected by parent, likely `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` plus any summary-surface tests
  - `node scripts/spec-guard.mjs --dry-run`
  - parent-selected docs-review / implementation gate

## Rollback
- Revert the parent-owned invariant change if it weakens same-turn duplicate or missing-decision failures.
- Do not roll back by deleting or rewriting `provider-linear-worker-linear-audit.jsonl` history.
- Keep the issue open until both positive multi-turn success and negative same-turn duplicate cases are proven.

## Risks & Mitigations
- Risk: timestamp-only filtering can misclassify rows around turn startup or mixed ISO formats.
  - Mitigation: use a post-bootstrap same-issue audit cursor for duplicate-decision invariant checks, and keep timestamp boundaries limited to child-lane launch classification.
- Risk: summary surfaces keep reading stale failed proof state after the invariant is repaired.
  - Mitigation: add a focused end-to-end summary assertion for `provider-linear-worker-proof`, `manifest.status`, and `runs.json`.
- Risk: true same-turn duplicates become accepted.
  - Mitigation: keep and strengthen a focused same-turn duplicate regression.
- Risk: historical auditability is lost.
  - Mitigation: retain cumulative `provider-linear-worker-linear-audit.jsonl` entries and scope only the invariant read.

## Approvals
- Docs-first packet: produced by same-issue docs child lane `.runs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46-docs-packet/cli/2026-04-23T03-59-42-098Z-c11737dd/manifest.json`.
- Parent docs-review: pending parent lane acceptance.
- Parent implementation/review/PR lifecycle: pending parent lane.
