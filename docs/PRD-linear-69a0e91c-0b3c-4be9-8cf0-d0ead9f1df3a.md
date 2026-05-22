# PRD - CO-422 refresh Mar 29 active spec-guard cohort

## Traceability
- Linear issue: `CO-422` / `69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a`
- Linear URL: https://linear.app/asabeko/issue/CO-422/co-refresh-mar-29-active-spec-guard-cohort
- Task id: `linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a`
- Canonical spec: `tasks/specs/linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md`
- Source blocker: CO-409 / PR #719 Core Lane `node scripts/spec-guard.mjs`
- Canonical owner key: `spec-guard:active-spec-last-review:2026-03-29`

## Summary
- Problem Statement: PR #719 for CO-409 was blocked by `spec-guard` because three task specs still presented completed Linear lanes as active specs with `last_review: 2026-03-29`; after CO-409 refreshed freshness metadata, the remaining CO-422 value is the terminal-lane reclassification that keeps those specs out of active-spec freshness.
- Desired Outcome: reproduce the current-main failure, verify CO-14, CO-30, and CO-34 live Linear truth, then reclassify the completed-lane specs and Mar 29 registry rows without weakening `scripts/spec-guard.mjs` or touching CO-409's Mar 28 docs-freshness cohort.

## User Request Translation
- User intent / needs: clear the Mar 29 active-spec freshness blocker as its own canonical owner so CO-409 / PR #719 can advance without widening into unrelated docs-freshness or implementation work.
- Success criteria / acceptance:
  - `node scripts/spec-guard.mjs` reproduces the current-main failure before edits.
  - Live Linear reads confirm CO-14, CO-30, and CO-34 are already `Done`.
  - The three task specs stop presenting completed lanes as active specs.
  - `tasks/index.json` and `docs/docs-freshness-registry.json` agree with the completed-lane classification.
  - `node scripts/spec-guard.mjs` passes after the repair.
  - CO-409 / PR #719 blocker notes are updated only after this gate is clear.
- Constraints / non-goals:
  - do not weaken `scripts/spec-guard.mjs`
  - do not bump `last_review` dates without review evidence
  - do not reopen completed CO-14, CO-30, or CO-34 implementation scope
  - do not delete historical specs to hide the failure
  - do not widen into CO-409's Mar 28 docs-freshness cohort or PR #719 implementation content

## Intent Checksum
- Protected terms:
  - `spec-guard`
  - `active spec`
  - `last_review`
  - `2026-03-29`
  - `CO-14`
  - `CO-30`
  - `CO-34`
  - `PR #719`
  - `Core Lane`
  - `tasks/specs`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `spec-guard:active-spec-last-review:2026-03-29`
- Nearby wrong interpretations to reject:
  - widening CO-409's Mar 28 docs-freshness cohort
  - weakening active-spec freshness enforcement
  - bumping dates without evidence
  - reopening completed CO-14, CO-30, or CO-34 implementation scope
  - deleting historical specs
  - treating `--dry-run` success as a green required gate

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `spec-guard` active-spec freshness | Initial CO-422 baseline failed on three specs with `status: in_progress` and `last_review: 2026-03-29`; merged CO-409 later refreshed the dates but still left the completed-lane classification question. | `spec-guard` skips inactive spec statuses such as `done` and `completed`; active specs must stay fresh. | Completed Linear lanes are reclassified inactive so `spec-guard` no longer treats them as active. | Enforcement weakening, dry-run waivers, or date-only refresh. |
| Live Linear truth | CO-14, CO-30, and CO-34 are live `Done`. | Linear terminal state is the authoritative issue lifecycle signal for completed provider lanes. | Repo metadata mirrors live completed-lane truth. | Reopening terminal issue scope. |
| Registry mirrors | Mar 29 packet and mirror rows are still `active`, causing freshness debt for completed lanes. | Registry status must distinguish active docs from historical or archive-eligible implementation docs. | Only the Mar 29 completed-lane rows are marked inactive/archive-status. | CO-420 / Mar 28 rolling cohort rows. |
| CO-409 / PR #719 | CO-409 is blocked by this separate Core Lane failure. | Blocker notes should describe external-owner gate truthfully. | Notes are updated after local validation proves this owner clears the gate. | CO-409 implementation or CodeRabbit response changes. |

## Not Done If
- `node scripts/spec-guard.mjs` still fails on the Mar 29 active spec cohort.
- The fix only changes dates without explaining the completed-lane truth.
- `tasks/index.json`, `docs/docs-freshness-registry.json`, and task spec status disagree.
- CO-409 remains blocked by the same Core Lane failure after this lands.
- The patch weakens `spec-guard`, deletes historical specs, or broadens into the Mar 28 docs-freshness owner.

## Goals
- Register the CO-422 docs-first packet and task mirrors.
- Reproduce the current-main `spec-guard` failure.
- Reclassify CO-14, CO-30, and CO-34 completed-lane specs and Mar 29 freshness rows truthfully.
- Run focused validation and review gates before PR handoff.

## Non-Goals
- No CO-409 docs-freshness implementation changes.
- No PR #719 content changes except a blocker-clear note after validation.
- No script or policy weakening.
- No broad archive automation or docs-freshness sweep.

## Stakeholders
- Product: CO operators waiting on CO-409 / PR #719 review.
- Engineering: Codex provider-worker and docs-freshness maintainers.
- Review: GitHub Core Lane and Linear issue reviewers.

## Metrics & Guardrails
- Primary Success Metrics:
  - `node scripts/spec-guard.mjs` passes after the repair.
  - Mar 29 stale rows for CO-14, CO-30, and CO-34 no longer appear as active docs freshness blockers.
- Guardrails / Error Budgets:
  - preserve all historical docs and evidence
  - keep the change metadata-only outside CO-422 packet registration
  - keep CO-420 Mar 28 rolling cohort ownership untouched

## Technical Considerations
- Architectural Notes: no runtime architecture changes; this is metadata lifecycle reconciliation.
- Dependencies / Integrations: Linear issue reads, `scripts/spec-guard.mjs`, `scripts/docs-freshness.mjs`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? No.
- Large-refactor check: not applicable; the issue is a narrow metadata repair using existing inactive-status semantics.

## Open Questions
- None. Live Linear reads during implementation confirmed all three source issues are terminal `Done`.

## Approvals
- Product: Linear CO-422 acceptance criteria.
- Engineering: provider-worker implementation and validation evidence.
- Design: not applicable.
