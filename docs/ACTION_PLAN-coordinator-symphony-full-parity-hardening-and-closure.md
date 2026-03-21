# ACTION_PLAN - Coordinator Symphony Full-Parity Hardening and Closure

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: keep the `1311` mirrors aligned to branch truth as an umbrella/historical lane after the integrated `1312`-`1316` implementation work progressed, and prevent optimistic parity-closeout wording.
- Scope: document the umbrella context, the active implemented unit, the now-landed final blocker, and the exact remaining publication posture.
- Assumptions:
  - `Symphony SPEC.md` remains the parity authority when upstream spec and Elixir behavior differ
  - the active implemented unit on the current branch is the integrated `1312`-`1316` stack
  - implementation of the last known blocker is now landed, but publication closure is still not complete
  - `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/` is the active current-head closeout pack

## Milestones & Sequencing
1. Preserve the umbrella context
   - keep `1311` framed as historical/umbrella rather than the active publication unit
   - point current-head implementation evidence at the integrated `1312`-`1316` stack and the `1316` closeout root
2. Keep the former blocker and remaining publication gates explicit
   - record `1315` as landed
   - record the earlier `1316` poll/recovery and `/api/v1` normalization work as landed
   - record the final `1316` ordering/capacity slice as landed
3. Keep validation posture truthful
   - preserve the historical bounded `1311` closeout artifacts
   - preserve the current-head integrated `1316` closeout pack for the active implementation unit
4. Closeout rule
   - do not claim full hardened parity closed until the `1316` rerun findings are resolved and the pending `pack:smoke`, live proof, PR, CI, and merge are resolved

## Dependencies
- `Symphony SPEC.md`
- `elixir/lib/symphony_elixir/orchestrator.ex`
- `elixir/lib/symphony_elixir/agent_runner.ex`
- `docs/TASKS.md`
- `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`

## Validation
- Verified checks to keep quoted consistently:
  - historical bounded `1311` validation: `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260321T070133Z-closeout/14-review-stall-override.md`
  - current-head integrated validation for the active implementation unit: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/` (`01`-`09` passed, `10-review-pre-fix.log` captured the earlier `3` P2 findings, `11-review-rerun.log` is terminal and not clean)

## Risks & Mitigations
- Risk: stale docs reintroduce an optimistic parity-closeout claim.
  - Mitigation: keep the umbrella status, the active implemented unit, the remaining blockers, and the current validation/review status identical across all `1311` mirrors.
- Risk: the integrated `1312`-`1316` work gets misread as already published/closed just because the last blocker is now landed.
  - Mitigation: keep the remaining publication gates explicit and distinguish historical umbrella evidence from the active publication unit.

## Approvals
- Reviewer status: `1311` now remains an umbrella/historical packet only; active review and PR loop closeout belong to the later implementation publication units.
- Date: 2026-03-22
