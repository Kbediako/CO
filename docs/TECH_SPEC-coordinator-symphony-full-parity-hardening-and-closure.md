---
id: 20260320-1311-coordinator-symphony-full-parity-hardening-and-closure
title: Coordinator Symphony Full-Parity Hardening and Closure
relates_to: docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md
risk: high
owners:
  - Codex
last_review: 2026-03-22
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: keep `1311` truthful as an umbrella/historical lane rather than the current publication unit.
- Scope: point at the active implemented unit, keep the remaining blockers explicit, and describe validation without overstating parity closure.
- Constraints:
  - parity claims are governed by `Symphony SPEC.md` when the Elixir tree drifts
  - tracker writes remain outside the core blocker set
  - full parity cannot be claimed while the `1316` publication closeout pack is still non-terminal

## Current Branch State
- Publication posture:
  - the implemented publication unit on the current branch is the integrated `1312`-`1316` stack, not `1311`
- Current branch truth:
  - `1312` lands same-session continuation inside a single provider worker run
  - `1313` lands authoritative runtime snapshot fields for visible running rows plus live-surfaced `codex_totals` and latest `rate_limits`
  - `1314` lands authoritative retry rows plus issue-level `retry` and `attempts` payloads
  - the current head also fixes selected-run provider-child projection under repo-local and external overridden runs roots
- Remaining blockers:
  - `1315` retry-owner scheduling is now landed on the current branch
  - the earlier `1316` poll/recovery and `/api/v1` normalization work is also landed on the current branch
  - full parity still remains open only because publication closeout is not yet terminal clean: `11-review-rerun.log` is terminal and not clean, and `12-pack-smoke.log`, `14-live-proof.md`, PR, CI, and merge remain pending

## Technical Requirements
- Remaining requirements:
  - keep `1311` framed as umbrella/historical context rather than the current publication unit
  - keep `1315` and `1316` recorded as landed on the current branch
  - point current-head closeout truth at the active `1316` closeout pack for the integrated `1312`-`1316` stack
- Interfaces / contracts:
  - the umbrella docs must clearly distinguish historical `1311` evidence from the active `1312`-`1316` publication evidence
  - tracker-write ownership must stay out of the blocker set unless a later slice proves otherwise

## Architecture & Data
- Primary upstream authorities:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
- Primary CO evidence surfaces:
  - `docs/TASKS.md`
  - `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`
  - `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260321T070133Z-closeout/14-review-stall-override.md`

## Validation Plan
- Current verified checks:
  - the pre-implementation `docs-review` gate for the umbrella lane succeeded at `.runs/1311-coordinator-symphony-full-parity-hardening-and-closure/cli/2026-03-20T10-25-11-174Z-514b632e/manifest.json`
  - historical bounded `1311` validation remains recorded in `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260321T070133Z-closeout/14-review-stall-override.md`
  - current-head integrated validation and publication posture for the active implementation unit now live in `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`, where `01`-`09` passed, `10-review-pre-fix.log` captured the earlier `3` P2 findings, and `11-review-rerun.log` is terminal and not clean with one P1 plus one P2 still being resolved
- Closure gate:
  - do not claim parity closeout until the `1316` rerun findings are resolved and the pending `pack:smoke`, live-proof, PR, and merge steps are complete

## Open Questions
- Whether provider-driven discovery should be retired in favor of poll-owned discovery/recovery, or explicitly documented as an intentional divergence.
- Whether any further split remains necessary after the now-implemented `1316` lane once publication closes.

## Approvals
- Reviewer status: `1311` now remains an umbrella/historical packet only; active review and PR loop closeout belong to the later implementation publication units.
- Date: 2026-03-22
