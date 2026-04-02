# ACTION_PLAN - CO: Restore clean full-suite Vitest exit for provider-worker validation

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: classify the provider-worker full-suite Vitest clean-exit report truthfully, isolate whether the quiet tail is a real linger or a false timeout, and land the smallest truthful fix or fallback.
- Scope: docs registration, delegated docs review, reproduction and isolation, issue-local documentation updates, required validation, review/elegance gates, and Linear/PR handoff updates.
- Assumptions:
  - the current workspace reflects a live reproduction environment for CO-69
  - prior CO-57 work fixed a related but narrower heartbeat problem, not necessarily this exit hang
  - the initial 240-second reproduction ceiling may be too short for the current late-tail duration profile and must not be treated as proof of a real post-suite linger by itself

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `full Vitest suite`
  - `clean terminal success exit`
  - `node (vitest)`
  - `esbuild --service`
  - `validation fallback`
- Not done if:
  - the default full-suite validation path still hangs
  - the fallback is not full-suite or not machine-checkable
  - the lane relies on cleanup that can hide failures
- Pre-implementation issue-quality review:
  - treat CO-69 as a fresh follow-up to CO-57, not a duplicate; the issue is specifically about terminal full-suite exit truth in provider-worker validation, so the lane starts from reproduction rather than assuming the previous lifecycle fix closed it

## Milestones & Sequencing
1) Register the docs-first packet, branch, and Linear workpad; then run an audited child `docs-review`.
2) Reproduce the apparent full-suite hang with the cited command shapes and collect enough signal to classify late-tail duration versus a real lingering process.
3) Update the packet/workpad with the approved validation path, then run the required validation plus standalone/elegance review gates.

## Dependencies
- Existing workspace checkout and issue packet conventions
- `codex-orchestrator linear` helper for state and workpad updates
- Vitest full-suite command surfaces available in the workspace

## Validation
- Checks / tests:
  - child `docs-review`
  - reproduction commands from the issue body
  - focused tests for the chosen owner
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - explicit elegance review
- Rollback plan:
  - revert the narrow fix or leave the lane on the documented fallback if it preserves truthful full-suite validation and the direct fix proves unsafe

## Risks & Mitigations
- Risk: the hang is intermittent or environment-sensitive.
  - Mitigation: record exact command shapes, timings, and active-handle evidence under the issue task id.
- Risk: a too-short diagnostic timeout looks like a real post-suite hang.
  - Mitigation: require a patience-first rerun through the late-tail window before classifying the suite as non-terminal.
- Risk: a tempting timeout/kill workaround could weaken exit truth.
  - Mitigation: reject any cleanup that can hide a failing suite.
- Risk: the owner spans multiple layers.
  - Mitigation: keep changes bounded until evidence proves a deeper owner is necessary.

## Approvals
- Reviewer: pending
- Date: 2026-04-02
