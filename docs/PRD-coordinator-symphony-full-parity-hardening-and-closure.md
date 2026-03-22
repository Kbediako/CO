# PRD - Coordinator Symphony Full-Parity Hardening and Closure

## Added by Bootstrap 2026-03-20

## Summary
- Problem Statement: `1311` is now an umbrella/historical parity lane, not the active publication unit. The current branch’s implemented packet is now the integrated `1312`-`1316` stack. The remaining work is no longer implementation of the blocker itself; it is truthful publication closure of that integrated unit.
- Desired Outcome: keep the umbrella packet aligned to verified branch truth so the landed `1312`-`1316` work stays identified correctly and the final publication gates stay visible instead of collapsing back into optimistic closure wording.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): continue the docs-first parity program truthfully while the implementation slices advance, and keep the umbrella lane from overstating what is already closed.
- Success criteria / acceptance:
  - the implemented branch packet is recorded as the integrated `1312`-`1316` work
  - `1315` remains explicit as the landed retry-owner slice
  - the docs record that the former final `1316` blocker is now implemented on the current branch
  - tracker-write primitives and rich dashboard/TUI parity remain non-blockers unless a later slice changes that conclusion
  - validation wording distinguishes historical `1311` evidence from the current-head evidence pack for the active implementation unit
- Constraints / non-goals:
  - do not claim full hardened parity published/merged until refreshed validation, review, live proof, PR, CI, and merge are complete
  - do not treat green local tests alone as proof that publication closure is complete
  - do not reframe tracker-write ownership as a parity blocker

## Goals
- Keep `1311` framed as umbrella/historical context rather than the current publication unit.
- Keep the landed `1315` slice, the now-landed `1316` closeout slice, and the remaining publication gates explicit enough to prevent optimistic parity-closeout wording.
- Keep the validation and PR-status narrative truthful while later slices own current-head publication.

## Non-Goals
- Re-litigating `1310`; it remains the truthful audit/rebaseline lane.
- Claiming full Symphony parity from the integrated `1312`/`1313`/`1314` unit or from `1315` alone.
- Treating green local tests as proof that the remaining architectural parity gaps are gone.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the docs state the current publication posture exactly and do not regress to a "full parity closed" claim
  - the former final blocker is recorded as implemented under `1316`
  - validation sections distinguish historical `1311` evidence from the still-pending current-head `1312`-`1316` publication evidence
- Guardrails / Error Budgets:
  - parity claims stay governed by `/Users/kbediako/Code/symphony/SPEC.md` when the Elixir tree is richer or drifted
  - continuation/retry wording stays narrow and does not imply `1315` or the umbrella lane closes full parity by itself
  - no review or closeout statement may assume publication closure just because the local suite is green

## Technical Considerations
- Current branch truth:
  - the active implemented publication packet now includes the integrated `1312`-`1316` stack
  - `1312` lands same-session continuation inside a single provider worker run
  - `1313` lands authoritative runtime snapshot fields for visible running rows plus live-surfaced `codex_totals` and latest `rate_limits`
  - `1314` lands authoritative retry rows plus issue-level `retry` and `attempts` payloads
  - the current head also fixes selected-run provider-child projection under repo-local and external overridden runs roots
- Remaining blockers:
  - `1315` retry-owner scheduling is now landed on the current branch
  - the earlier `1316` poll/recovery and `/api/v1` normalization work are also landed on this branch
  - the former final `1316` fresh-dispatch pagination/ordering/capacity blocker is now implemented; the remaining work is publication validation, review, live proof, PR, CI, and merge
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
  - `docs/TASKS.md`
  - `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`

## Validation Status
- Historical bounded `1311` validation remains recorded in `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260321T070133Z-closeout/14-review-stall-override.md`.
- Current-head integrated validation and publication posture for the active implementation unit now live under `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`: `01`-`09` passed, `10-review-pre-fix.log` captured the earlier `3` P2 findings, `11-review-rerun.log` is terminal and not clean with one P1 plus one P2 still being resolved, and `12-pack-smoke.log`, `14-live-proof.md`, PR, and merge remain pending.

## Approvals
- Product: Self-approved to keep the `1311` umbrella truthful to the current branch state.
- Engineering: Internal docs/state review refreshed on 2026-03-22 against the verified branch facts; `1311` now remains an umbrella/historical packet only, while current-head publication and merge-readiness belong to the later implementation slices.
- Design: N/A
