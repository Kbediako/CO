# ACTION_PLAN - Coordinator Symphony Poll-Owned Discovery Recovery and Observability API Normalization

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: publish the now-landed `1316` slice truthfully from the current closeout pack rather than reopen implementation scope.
- Scope: sync docs/checklists to the landed poll-owned discovery/recovery, `/api/v1` normalization, full active Linear pagination, Symphony-order fresh dispatch, slot budgeting, and Linear default-contract alignment.
- Assumptions:
  - `1312` covers in-worker same-session continuation
  - `1313` covers authoritative runtime snapshot fields
  - `1314` covers authoritative retry payload truth
  - `1315` is now the landed prerequisite retry-owner scheduling slice
  - the earlier `1316` poll/recovery and `/api/v1` normalization work are already landed on this branch
  - the final `1316` Linear/default dispatch alignment is also landed locally: `page size 50`, request timeout `30000 ms`
  - `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/` is the current closeout root

## Milestones & Sequencing
1. Refresh the `1316` packet to current branch truth
   - update the PRD, TECH_SPEC, ACTION_PLAN, checklist, and mirrors so they describe implemented `1316` behavior, not a still-open blocker
2. Record the current closeout pack truth
   - `01`-`09` are passed in `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`
   - `10-review-pre-fix.log` captured the earlier `3` P2 findings
   - `11-review-rerun.log` is terminal and not clean; it captured one P1 around queued null-attempt retry dispatch/recovery and one P2 around compatibility retry timing, and both are addressed on the current head while a fresh clean rerun is still pending
3. Keep only the publication work open
   - `12-pack-smoke.log` is still pending
   - `14-live-proof.md`, PR, and merge artifacts are still pending
4. Closeout rule
   - do not claim publication closed until the rerun findings are resolved and the pending pack-smoke/live-proof/PR/merge steps are complete

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex`
- `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`

## Validation
- docs-review for the `1316` packet before implementation: `.runs/1316-coordinator-symphony-poll-owned-discovery-and-recovery/cli/2026-03-21T15-25-27-365Z-543bcc14/manifest.json`
- `01-delegation-guard.log`, `02-spec-guard.log`, `03-build.log`, `04-lint.log`, `05-targeted-tests.log`, `06-full-test.log`, `07-docs-check.log`, `08-docs-freshness.log`, and `09-diff-budget.log` passed in the current closeout root
- `11-review-rerun.log` is terminal and not clean, but its queued-retry dispatch/projection findings are addressed on the current head and now require a fresh clean rerun
- `12-pack-smoke.log`, `14-live-proof.md`, PR, and merge remain pending

## Risks & Mitigations
- Risk: stale docs regress `1316` back to “one blocker left” wording even though the owned implementation is landed.
  - Mitigation: keep every mirror anchored to the current closeout root and the landed `page size 50` / `30000 ms` defaults.
- Risk: `1316` gets overstated as full hardened parity closure.
  - Mitigation: only claim closure after the rerun findings, `pack:smoke`, live proof, PR, and merge all resolve cleanly.

## Approvals
- Reviewer: Self-approved for the docs-only closeout refresh of the now-landed `1316` publication slice.
- Date: 2026-03-21
