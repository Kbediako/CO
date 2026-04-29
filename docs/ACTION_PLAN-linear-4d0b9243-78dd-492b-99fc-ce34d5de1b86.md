# ACTION_PLAN: CO-407 co-status healthy control-host UI timeout classification

## Added by Docs Packet 2026-04-28

## Summary
- Goal: Prepare the CO-407 parent lane to fix `co-status --format json` timeout classification for a `healthy control host` with `provider intake fresh` evidence and a `slow /ui/data.json` read.
- Scope: Docs-first packet and registry/checklist mirrors only in this child lane.
- Assumptions: The child prompt's protected terms are authoritative. The parent-provided source payload path was available from the parent workspace root but contained run metadata, not full issue body text.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `co-status --format json`, `healthy control host`, `provider intake fresh`, `slow /ui/data.json`, `control-host ui request timeout after 15000ms`, `stale endpoint/dead-port recovery`, `CO-246`, `CO-404`, `CO-406`.
- Not done if: Timeout after 15000ms makes a healthy/fresh host look dead; same-endpoint slowness uses `stale endpoint/dead-port recovery`; timeout evidence is hidden; related `CO-246`, `CO-404`, or `CO-406` behavior regresses.
- Pre-implementation issue-quality review: CO-407 is specifically a healthy-host slow UI read classification issue. It is not a dead endpoint recovery redesign, provider-intake truth redesign, or broad control-host lifecycle issue.
- Fallback / refactor decision: This task touches stale/dead endpoint and timeout classification seams. Remove the same-endpoint slow-read-as-dead-endpoint behavior, justify retaining stale/dead endpoint recovery for actual stale/dead cases, and preserve CO-404/CO-406 boundaries through parent-owned verification.
- Durable retention evidence: `stale endpoint/dead-port recovery` remains durable only for stale/dead endpoints, with CO-407 adding a negative boundary for slow current endpoints.
- Large-refactor check: Parent should implement narrowly if the existing status read path can keep health, freshness, timeout, and endpoint liveness separate; escalate if it cannot.

## Milestones & Sequencing
1. Parent verifies live CO-407 issue text plus related `CO-246`, `CO-404`, and `CO-406` boundaries.
2. Parent identifies the direct `co-status --format json` `/ui/data.json` timeout classification path.
3. Parent implements a distinct `control-host ui request timeout after 15000ms` classification that preserves `healthy control host` and `provider intake fresh` evidence.
4. Parent keeps `stale endpoint/dead-port recovery` limited to stale/dead endpoint cases.
5. Parent adds focused healthy-host timeout and stale/dead endpoint boundary regressions.
6. Parent runs its chosen validation/review gates and handles Linear/PR lifecycle.

## Dependencies
- `co-status --format json`
- `/ui/data.json`
- `healthy control host`
- `provider intake fresh`
- `slow /ui/data.json`
- `control-host ui request timeout after 15000ms`
- `stale endpoint/dead-port recovery`
- `CO-246`, `CO-404`, `CO-406`

## Validation
- Checks / tests: Child lane runs only JSON parse for `tasks/index.json`, protected-term grep over touched docs, and `git diff --check` over touched files. Parent runs focused status/timeout regressions and any broader gates needed for handoff.
- Rollback plan: Revert CO-407 implementation and packet updates if timeout classification weakens healthy-host/fresh-intake truth, hides timeout reasons, or regresses stale/dead endpoint recovery.

## Risks & Mitigations
- Risk: Slow current endpoint is treated as dead. Mitigation: Require separate timeout/degraded-read reason and preserve healthy/fresh evidence.
- Risk: CO-407 regresses CO-246 stale/dead endpoint recovery. Mitigation: Keep a negative boundary test for stale/dead endpoints.
- Risk: Related CO-404 or CO-406 behavior is unintentionally widened. Mitigation: Parent verifies related issue contracts before code changes and records no-touch or regression evidence.

## Approvals
- Reviewer: Pending parent lane review.
- Date: 2026-04-28
