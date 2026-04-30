# PRD - CO-428 own March 30 active-spec spec-guard baseline cohort

## Traceability
- Linear issue: `CO-428` / `dc2bb702-db1d-450c-be19-a98571289a21`
- Linear URL: https://linear.app/asabeko/issue/CO-428/own-march-30-active-spec-spec-guard-baseline-cohort
- Task id: `linear-dc2bb702-db1d-450c-be19-a98571289a21`
- Canonical spec: `tasks/specs/linear-dc2bb702-db1d-450c-be19-a98571289a21.md`
- Source blocker: CO-427 / PR #727 Core Lane `node scripts/spec-guard.mjs`
- Canonical owner key: `spec-guard:active-specs:last_review=2026-03-30`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=spec-guard:active-specs:last_review=2026-03-30`

## Summary
- Problem Statement: current `origin/main` at `aad50900d` fails `node scripts/spec-guard.mjs` because twelve March 30 task specs still present completed Linear lanes as active specs with `last_review: 2026-03-30`.
- Desired Outcome: establish CO-428 as the live same-project owner, verify every source issue, refresh/archive/reclassify the cohort with evidence, and carry the dependent CO-429 / CO-430 metadata repairs in the CO-428-led branch so active lanes can pass `spec-guard` and docs freshness without weakening either policy.

## User Request Translation
- User intent / needs: own the March 30 active-spec freshness cohort separately from CO-427 docs-freshness owner re-home work and clear the baseline `Core Lane` blocker.
- Success criteria / acceptance:
  - CO-428 is registered as the canonical owner for `spec-guard:active-specs:last_review=2026-03-30`.
  - The twelve reported `tasks/specs/*` files have review disposition evidence.
  - Completed source lanes are reclassified inactive rather than date-bumped as still-active work.
  - `node scripts/spec-guard.mjs` passes on current branch state.
  - GitHub `Core Lane` is no longer blocked only by this March 30 cohort.
- Constraints / non-goals:
  - do not weaken `spec-guard`
  - do not change the active-spec cadence
  - do not broaden CO-427 or CO-330 work
  - do not bypass GitHub `Core Lane`
  - do not touch specs outside the reported March 30 cohort unless fresh validation proves the same blocker expanded

## Intent Checksum
- Protected terms:
  - `spec-guard`
  - `node scripts/spec-guard.mjs`
  - `tasks/specs/*`
  - `last_review: 2026-03-30`
  - current-main baseline debt
  - GitHub `Core Lane`
  - PR #727
  - clean `origin/main` reproduction
  - `spec-guard:active-specs:last_review=2026-03-30`
- Nearby wrong interpretations to reject:
  - marking CO-427 review-ready by ignoring the failed `Core Lane`
  - weakening or skipping `spec-guard`
  - blindly bumping `last_review`
  - widening CO-427 docs-freshness owner work into this cohort
  - treating the blocker as caused by CO-427 after clean `origin/main` reproduces it

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `spec-guard` current-main gate | Clean `origin/main` fails on twelve March 30 task specs with active status and stale `last_review`. | Active task specs must be reviewed inside the 30-day cadence, or be intentionally inactive/historical. | `node scripts/spec-guard.mjs` passes with the cohort reviewed and completed-lane specs inactive. | Guard weakening, waiver-only closeout, or date-only bumps. |
| Linear lifecycle | Live reads on 2026-04-30 show all twelve source issues are `Done`. | Linear terminal state is the lifecycle authority for completed provider lanes. | Repo task specs and task registry mirror the completed-lane classification. | Reopening terminal issue work. |
| Docs freshness registry | The March 30 packet rows are still `active` with 30-day cadence. | Historical completed-lane packet docs can be kept available with archive-status freshness metadata. | Exact March 30 cohort rows move to archived freshness metadata with evidence. | Unrelated rolling cohorts and non-cohort specs. |
| CO-427 / PR #727 | CO-427 is blocked by this external baseline `spec-guard` debt. | Active implementation lanes should not absorb unrelated baseline freshness cohorts. | CO-427 can proceed after CO-428 clears or owns the baseline gate. | Editing CO-427 owner metadata or CO-330 provider/control-host behavior. |

## Not Done If
- `node scripts/spec-guard.mjs` still reports any listed March 30 task spec as stale active work.
- PR #727 or another active lane still fails `Core Lane` only because of this same cohort.
- The fix weakens `spec-guard`, changes the max-age policy, or uses a waiver instead of metadata review.
- The fix changes CO-427 docs-freshness owner metadata or CO-330 provider/control-host behavior.
- No evidence records the disposition for each listed spec.

## Goals
- Register the CO-428 docs-first packet and task mirrors.
- Reproduce the current-main failure.
- Verify live Linear lifecycle truth for every source issue.
- Reclassify completed-lane specs and registry rows without deleting historical evidence.
- Integrate the dependent CO-429 registry-residue repair and CO-430 live owner re-home after CO-428 is promoted as the upstream integration owner.
- Run focused validation and review gates before PR handoff.

## Non-Goals
- No CO-427 implementation or docs-freshness owner changes.
- No provider/control-host behavior changes.
- No script or freshness policy weakening.
- No broad archive automation sweep.

## Stakeholders
- Product: CO operators waiting on CO-427 / PR #727.
- Engineering: Codex provider-worker and spec/docs freshness maintainers.
- Review: GitHub Core Lane and Linear issue reviewers.

## Metrics & Guardrails
- Primary Success Metrics:
  - `node scripts/spec-guard.mjs` passes after the repair.
  - All twelve March 30 source specs have recorded review disposition.
  - The exact March 30 registry rows no longer present as active 30-day freshness blockers.
- Guardrails / Error Budgets:
  - preserve all historical docs
  - keep the change metadata-only outside packet registration
  - keep CO-427 and CO-330 out of scope

## Technical Considerations
- Architectural Notes: no runtime architecture changes; this is metadata lifecycle reconciliation.
- Dependencies / Integrations: Linear issue reads, CO-429 / CO-430 metadata repair packets, `scripts/spec-guard.mjs`, `scripts/docs-freshness.mjs`, `docs:freshness:maintain`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.

## Open Questions
- None. Live Linear reads during implementation confirmed all twelve source issues are terminal `Done`.

## Approvals
- Product: Linear CO-428 acceptance criteria.
- Engineering: provider-worker implementation and validation evidence.
- Design: not applicable.
