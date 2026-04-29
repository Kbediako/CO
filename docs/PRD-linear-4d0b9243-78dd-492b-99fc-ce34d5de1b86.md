# PRD: CO-407 co-status healthy control-host UI timeout classification

## Added by Docs Packet 2026-04-28

## Summary
- Problem Statement: `co-status --format json` can report a misleading degraded/unavailable path when a `healthy control host` has `provider intake fresh` evidence but the direct dashboard read hits a `slow /ui/data.json` response and records `control-host ui request timeout after 15000ms`.
- Desired Outcome: Parent implementation keeps the timeout classified as a slow UI data read on a healthy host, preserves `stale endpoint/dead-port recovery` as a separate recovery path, and does not regress the related `CO-246`, `CO-404`, or `CO-406` contracts.

## User Request Translation (Context Anchor)
- User intent / needs: Shape CO-407 before implementation so the parent can repair `co-status --format json` timeout classification when host health and provider-intake freshness already prove the control host is alive.
- Success criteria / acceptance: A timed-out `/ui/data.json` read after 15000ms is visible and truthful, but it does not override `healthy control host` and `provider intake fresh` evidence; dead or stale endpoints still use `stale endpoint/dead-port recovery`; related `CO-246`, `CO-404`, and `CO-406` behavior remains intact.
- Constraints / non-goals: This child lane creates docs and registry/checklist mirrors only. It does not edit control-host code, tests, Linear state, workpads, PRs, or lifecycle surfaces.

## Intent Checksum
- Exact user wording / phrases to preserve: `co-status --format json`, `healthy control host`, `provider intake fresh`, `slow /ui/data.json`, `control-host ui request timeout after 15000ms`, `stale endpoint/dead-port recovery`, `CO-246`, `CO-404`, `CO-406`.
- Protected terms / exact artifact and surface names: `co-status --format json`, `/ui/data.json`, `healthy control host`, `provider intake fresh`, `slow /ui/data.json`, `control-host ui request timeout after 15000ms`, `stale endpoint/dead-port recovery`, `CO-246`, `CO-404`, `CO-406`.
- Nearby wrong interpretations to reject: Treating a slow `/ui/data.json` response as a dead host, reusing `stale endpoint/dead-port recovery` for same-endpoint slowness, hiding the timeout, weakening healthy-host/provider-intake evidence, or folding related `CO-246`, `CO-404`, or `CO-406` work into this issue.

## Parity / Alignment Matrix
- Current truth: Direct `co-status --format json` reads can time out against `/ui/data.json` even while other local evidence indicates a healthy control host and fresh provider intake.
- Reference truth: `CO-246` covers stale/dead endpoint recovery, while CO-407 is about a current healthy endpoint whose UI data response is slow. `CO-404` and `CO-406` must remain related boundaries for the parent to verify before implementation.
- Target truth / intended delta: `co-status --format json` distinguishes a slow UI data read from stale endpoint/dead-port recovery, preserves healthy-host and provider-intake freshness evidence, and emits an auditable timeout reason.
- Explicitly out-of-scope differences: Dead endpoint recovery redesign, provider-intake truth redesign, control-host lifecycle restart policy, Linear/GitHub lifecycle work, source/test edits in this child lane, and broad CO-404/CO-406 scope expansion.

## Not Done If
- `control-host ui request timeout after 15000ms` causes a healthy host with fresh provider intake to look dead or unavailable.
- `stale endpoint/dead-port recovery` is used for same-endpoint slowness instead of stale or dead endpoints.
- The timeout is silently suppressed and no operator-visible reason remains.
- The implementation regresses `CO-246`, `CO-404`, or `CO-406` behavior.

## Goals
- Preserve truthful `co-status --format json` output for a `healthy control host` with `provider intake fresh` evidence when `/ui/data.json` is slow.
- Keep `control-host ui request timeout after 15000ms` operator-visible and machine-readable.
- Keep `stale endpoint/dead-port recovery` separate from slow current-endpoint reads.
- Require parent-owned focused regression coverage around healthy-host timeout classification and related issue boundaries.

## Non-Goals
- Do not change implementation, tests, Linear state, workpads, PRs, or review lifecycle in this child lane.
- Do not broaden into `CO-246` stale/dead endpoint recovery beyond preserving its boundary.
- Do not make broad claims about `CO-404` or `CO-406`; parent must verify those related contracts live before coding.
- Do not hide slow UI reads by treating timeout evidence as success.

## Technical Considerations
- Architectural Notes: Parent implementation should inspect the direct `co-status --format json` read path and the `/ui/data.json` timeout/degraded-read classification path, then keep healthy-host/provider-intake evidence separate from endpoint reachability failures.
- Dependencies / Integrations: Control-host status read model, `/ui/data.json`, provider-intake freshness projection, stale/dead endpoint handling from `CO-246`, and parent-verified related behavior from `CO-404` and `CO-406`.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decisions:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `co-status --format json` / `/ui/data.json` | Slow current endpoint is classified like unavailable/dead endpoint recovery. | `remove fallback` | CO-407 parent lane | `/ui/data.json` does not respond before 15000ms while host health and provider intake remain fresh. | 2026-04-28 | 2026-04-28 | Immediate removal in CO-407 | Slow UI read produces a timeout/degraded-read reason without replacing healthy-host/fresh-intake truth. | Focused healthy-host slow `/ui/data.json` regression. |
| `stale endpoint/dead-port recovery` | Dead-port recovery path could be reused for same-endpoint slowness. | `justify retaining fallback` | CO-246 with CO-407 boundary check | Resolved endpoint is stale, dead, or refused rather than merely slow. | CO-246 era; boundary reviewed 2026-04-28 | 2026-04-28 | Durable recovery contract | Not removed; remains limited to stale/dead endpoint cases and explicitly excluded from slow current endpoint timeout classification. | Existing CO-246 stale/dead endpoint regression plus CO-407 negative boundary case. |
| Related issue boundaries | CO-407 fix could accidentally absorb or weaken `CO-404` / `CO-406`. | `justify retaining fallback` | Parent lane verifies CO-404 / CO-406 | Parent implementation touches shared co-status/control-host timeout surfaces. | 2026-04-28 | 2026-04-28 | Durable issue-boundary guard | Not removed; parent must preserve or explicitly reconcile related behavior before PR handoff. | Parent-owned related regression or explicit no-touch evidence. |

- Durable retention evidence: `stale endpoint/dead-port recovery` remains a supported recovery contract only for stale or dead endpoint cases, not for slow current-endpoint UI reads.
- Large-refactor check: A large control-host status refactor is not required for this packet. Parent should escalate if distinguishing health, freshness, timeout, and dead-endpoint authority cannot be done locally in the existing `co-status` read path.

## Open Questions
- Parent must verify the exact live `CO-404` and `CO-406` relationship before implementation because this child lane only received protected issue references, not their full issue text.

## Approvals
- Product: Pending parent lane review.
- Engineering: Pending parent lane review.
- Design: Not applicable.
