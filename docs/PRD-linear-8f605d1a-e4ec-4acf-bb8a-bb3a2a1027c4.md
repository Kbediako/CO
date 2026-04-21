# PRD - Maintain docs freshness rolling baseline

## Traceability
- Linear issue: `CO-267` / `8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4`
- Linear URL: https://linear.app/asabeko/issue/CO-267/maintain-docs-freshness-rolling-baseline
- Task id: `linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4`
- Canonical spec: `tasks/specs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- Parent manifest: `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/cli/2026-04-20T00-16-23-383Z-f8073975/manifest.json`
- Source anchor: `ctx:sha256:267aaaf4e2b8fb6c09bc9d87945bbaff87a9974fdda4630798f371e3ff88a0a0#chunk:c000001`

## Summary
- Problem Statement: `docs:freshness` is red again on 2026-04-20 with current baseline evidence showing `66` blocking stale docs, `221` visible CO-175 rolling freshness cohort entries at the last day of the rolling window, and stale active spec frontmatter rows surfaced by `spec-guard --dry-run`. CO-266 refreshed only its specific terminal-blocker advisory spec blockers; this repo-wide baseline must stay owned by the canonical docs freshness maintenance lane.
- Desired Outcome: restore a truthful green `docs:freshness` and `docs:freshness:maintain` posture by reviewing and refreshing or otherwise explicitly disposing of the stale docs, active spec rows, and CO-175 rolling freshness cohort, without weakening freshness checks, hiding stale docs, deleting registry entries to reduce counts, or expanding CO-266.
- Rework Update 2026-04-21: PR #566 already merged, but current `origin/main` at `98991b622b99b4d0f31fa39cf98425cbfdd1a1b6` still reproduced `37` blocking stale Task Packet / Task Mirror rows and `docs:freshness:maintain=block_policy_over_budget`. CO-267 remains the canonical owner and now records the Apr 21 reviewed refresh for the exact `0954` and `1311`-`1316` historical packet rows.

## User Request Translation (Context Anchor)
- User intent / needs: complete the canonical docs freshness maintenance lane for CO-267 so repository-wide stale docs and rolling freshness debt no longer block unrelated provider-worker review handoffs, while preserving machine-visible evidence and exact CO-175 ownership semantics.
- Success criteria / acceptance:
  - before artifacts capture the current `docs:freshness`, `docs:freshness:maintain`, and `spec-guard --dry-run` failure shape under `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/`
  - path-level classification covers stale Agent Policy, Active Guide, Shipped Skill, Task Packet, Task Mirror, Report Only, and active spec rows
  - the CO-175 rolling freshness cohort is reviewed or otherwise legitimately brought current before the rolling window expires
  - the canonical owner marker `codex-orchestrator:canonical-owner-key=docs:freshness:maintain` is present in the packet so duplicate follow-ups reuse this lane
  - after artifacts show `docs:freshness` green from the issue workspace with no hidden missing/invalid/uncatalogued drift
- Constraints / non-goals:
  - do not change CO-266 terminal-blocker advisory behavior
  - do not weaken `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`
  - do not remove docs or registry entries solely to reduce counts
  - do not update `last_review` without a review rationale and evidence

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness`
  - `rolling freshness cohort`
  - `CO-175`
  - `stale docs`
  - `canonical owner`
  - `docs:freshness:maintain`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Protected terms / exact artifact and surface names:
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`
  - `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness.json`
  - `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness-maintenance.json`
- Nearby wrong interpretations to reject:
  - "CO-266 should own the repo-wide docs freshness sweep"
  - "the gate should be weakened or downgraded to warning-only"
  - "registry rows can be deleted to make counts look green"
  - "the CO-175 rolling cohort can remain visible indefinitely without owner action"
  - "review dates can be blind-bumped without path-level evidence"

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| CO-266 terminal-blocker advisory | CO-266 refreshed only the specific spec blockers needed for its Core Lane. | CO-266 is not the docs baseline owner. | CO-267 absorbs the repo-wide stale-doc and rolling freshness work. | CO-266 behavior, tests, or PR scope. |
| `docs:freshness` | Current evidence fails with `66` blocking stale docs and `221` CO-175 rolling rows. | CO-184, CO-201, CO-209, CO-239, and CO-254 used reviewed owner actions instead of policy dilution. | `docs:freshness` passes with reviewed stale rows and no hidden missing/invalid/uncatalogued drift. | Weakening freshness checks or deleting rows to reduce counts. |
| CO-175 rolling cohort | The Mar 14 `1164-1195` cohort is still visible at `overdue=7/7` and expires after 2026-04-20. | CO-175 is the explicit owner and rolling ledger, not a permanent waiver. | The cohort is reviewed or otherwise legitimately current so the rolling ledger no longer blocks at expiry. | Broadening CO-175 caps/window or hiding the cohort. |
| Active spec frontmatter | `spec-guard --dry-run` reports stale `last_review=2026-03-20` rows. | Spec freshness must stay direct and evidence-backed. | Exact active specs are reviewed and refreshed with classification evidence. | Blind spec-frontmatter edits unrelated to the classified stale set. |

## Not Done If
- `npm run docs:freshness` still fails on the rolling freshness cohort or stale-doc baseline.
- `docs:freshness:maintain` still reports a blocking maintenance decision for the current diff or repo baseline.
- CO-266 remains responsible for the repo-wide docs maintenance sweep.
- The fix suppresses reporting, deletes registry entries without review, or hides CO-175 rolling debt.
- Stale Agent Policy, Active Guide, Shipped Skill, Task Packet, Task Mirror, Report Only, or active spec rows lack evidence-backed review disposition.

## Goals
- Reproduce and preserve the Apr 20 freshness baseline failure.
- Classify all blocking stale docs and stale spec rows with path-level evidence.
- Review and refresh or explicitly dispose of the CO-175 rolling freshness cohort before expiry.
- Update canonical packet, task mirrors, registry mirrors, and cohort guidance.
- Prove the final repo state with the required validation and review gates.

## Non-Goals
- No CO-266 terminal-blocker advisory changes.
- No policy weakening, warning-only downgrade, or rolling-window/cap expansion.
- No deletion-only cleanup for registry rows.
- No unrelated implementation or feature-lane changes.
- No new docs freshness architecture unless current evidence proves the existing machinery cannot represent the reviewed disposition.

## Stakeholders
- Product: CO maintainers and provider-worker operators blocked by repo-wide docs freshness debt.
- Engineering: docs freshness, spec guard, provider-worker review handoff, and Linear canonical owner maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - before artifacts record exact stale counts, classes, path families, and CO-175 expiry posture
  - after artifacts show `docs:freshness` and `docs:freshness:maintain` passing
  - `spec-guard --dry-run` no longer reports the classified stale spec rows
  - workpad records the canonical owner marker and final validation evidence
- Guardrails / Error Budgets:
  - no hidden missing/invalid/uncatalogued docs
  - no hidden CO-175 rolling debt
  - no blind date bump; every refreshed path has classification evidence
  - no CO-266 scope expansion

## Technical Considerations
- Architectural Notes:
  - the expected repair is metadata and evidence maintenance across docs freshness registry rows, active spec frontmatter, task mirrors, and cohort guidance
  - the existing `docs:freshness` / `docs:freshness:maintain` machinery remains the source of truth
  - no runtime app proof or screenshot proof is required
- Dependencies / Integrations:
  - `scripts/docs-freshness.mjs`
  - `scripts/docs-freshness-maintain.mjs`
  - `scripts/spec-guard.mjs`
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - Linear workpad and state helpers

## Open Questions
- None for initial implementation; if a stale path cannot be truthfully reviewed or refreshed, create or reuse a same-project follow-up with the exact canonical owner key emitted by `docs:freshness:maintain`.

## Approvals
- Product: Codex provider worker, 2026-04-20
- Product rework reset: Codex provider worker, 2026-04-21
- Engineering: rework standalone review completed with `bounded-success`; evidence `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/cli/2026-04-21T05-34-25-740Z-9cf43116/review/telemetry.json`.
- Design: N/A
