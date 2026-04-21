# ACTION_PLAN - CO-274 provider-worker stdin bootstrap failure classification

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: complete CO-274 from a fresh Rework branch by classifying provider-worker stdin/bootstrap failures distinctly from generic provider runtime failures.
- Scope: docs packet, registry mirrors, failure reproduction/fixture, classification/proof/queue implementation, focused validation, review, and PR handoff.
- Assumptions: the prior dirty CO-274 worktree is audit-only; this attempt starts from current `origin/main`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `provider-linear-worker`, `control-host`, `stderr | Reading additional input from stdin...`, `provider_runtime`, `provider-linear-worker-proof.json`, `manifest.json`, `linear_audit.attempted_count`, retry/resumable queue behavior, `CO-224`, and `CO-225`.
- Source anchor carried forward: `ctx:sha256:395893ee7f0985529df981453f3c5cc80e32afb59fe1ed6d49d83252a23013ac#chunk:c000001`.
- Source payload: `../../.runs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4/cli/2026-04-21T14-09-01-063Z-719778ff/memory/source-0/source.txt`.
- Not done if:
  - `control-host` launched `provider-linear-worker` runs still exit before meaningful work with only generic `provider_runtime` classification
  - `provider-linear-worker-proof.json` or `manifest.json` loses exact stderr or `linear_audit.attempted_count`
  - retry/resumable queue behavior implies issue-specific progress for a zero-attempt bootstrap failure
  - CO-274 is merged into `CO-224` or `CO-225`
- Pre-implementation issue-quality review: issue scope is sufficiently specific for implementation; protected wording, non-goals, and adjacent issue boundaries are explicit.

## Milestones & Sequencing
1. Rework reset and docs packet
   - Delete stale workpad, create fresh branch/worktree from `origin/main`, and recreate the docs-first packet.
   - Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Failure evidence and source inspection
   - Inspect CO-271/CO-272 proof artifacts and provider-worker classification/manifest/queue paths.
   - Reproduce or fixture the `stderr | Reading additional input from stdin...` signal with `linear_audit.attempted_count: 0`.
3. Implementation and focused tests
   - Add the smallest diagnostic category/subtype and route it through proof/read-model/queue summaries.
   - Preserve non-stdin provider runtime failures and adjacent CO-224/CO-225 behavior.
   - Status: implemented as `provider_stdin_bootstrap`, with focused runner and handoff regressions passing.
4. Validation and handoff
   - Run focused tests first, then required repo gates.
   - Complete standalone review plus explicit elegance review.
   - Open/attach PR, run ready-review drain, and move to `In Review` only after handoff prerequisites are clean.

## Dependencies
- `provider-linear-worker-proof.json`
- `manifest.json`
- control-host read models and provider issue observability
- provider-worker failure classification path
- retry/resumable queue behavior

## Validation
- Checks / tests:
  - protected-term check over owned packet files
  - focused runtime/proof/queue regressions
  - required repo validation gates from AGENTS.md, or explicit bounded blocker records
- Rollback plan: revert runtime/test changes while retaining the docs packet as issue evidence if implementation does not meet Not Done If criteria.

## Risks & Mitigations
- Risk: generic `provider_runtime` classification remains too broad. Mitigation: add explicit subtype/category or operator guidance without rewriting unrelated runtime failures.
- Risk: retry/resumable queue behavior is weakened. Mitigation: require focused regression preserving valid retry/resume behavior.
- Risk: adjacent issue scope drift. Mitigation: keep CO-224 and CO-225 distinctions in spec, checklist, and tests.
- Risk: evidence loss. Mitigation: preserve exact stderr, `provider-linear-worker-proof.json`, `manifest.json`, and `linear_audit.attempted_count`.

## Approvals
- Reviewer: manifest-backed standalone review completed with bounded-success after command-intent retry; no actionable issues. Explicit elegance review completed by consolidating duplicate stdin-bootstrap diagnostic aliases into shared classifier sets.
- Date: 2026-04-22
