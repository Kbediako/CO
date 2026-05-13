---
id: 20260513-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8
title: CO-532 hard-stale current book and skill docs
relates_to: docs/PRD-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md
risk: medium
owners:
  - Codex
last_review: 2026-05-13
---

## Summary
- Objective: clear the five current book/skill hard-stale docs by reviewing truthfulness and updating content plus metadata.
- Scope: `docs/book/operations.md`, `docs/book/public-posture.md`, `docs/book/README.md`, `docs/book/skills.md`, `skills/README.md`, docs freshness guard evidence, and CO-532 packet mirrors.
- Constraints: do not widen CO-530, weaken freshness policy, or blindly bump `last_review`.

## Issue-Shaping Contract
- User-request translation carried forward: direct current-doc truth review, not legacy packet cleanup.
- Protected terms / exact artifact and surface names: `docs/book/operations.md`, `docs/book/public-posture.md`, `docs/book/README.md`, `docs/book/skills.md`, `skills/README.md`, `docs:freshness`, `hard-stale`, current docs, public guide, shipped companion, CO-522, CO-530, `blocking_changed_paths=[]`.
- Nearby wrong interpretations to reject: date-only registry churn, deletion-only cleanup, archived classification without archive semantics, and CO-530 scope expansion.
- Explicit non-goals carried forward: no CO-530 implementation, no docs freshness cap/window changes, no spec-guard weakening.

## Parity / Alignment Matrix
- Current truth: `docs:freshness` reports five current docs stale with `age_days=19`, `overdue_days=5`, and no missing registry rows.
- Reference truth: `docs/docs-catalog.json` marks them active `public_guide` / `shipped_companion` docs with current source-of-truth inputs.
- Target truth / intended delta: refreshed active docs and registry reviews show current behavior; CO-530 remains the legacy Apr 9-12 owner.
- Explicitly out-of-scope differences: inherited stale task packets, task mirrors, report-only docs, and unrelated pre-expiry current guides.

## Readiness Gate
- Not done if: any named file remains hard-stale, or freshness passes by policy weakening/date-only changes.
- Pre-implementation issue-quality review evidence: baseline `docs:freshness` reproduced the five hard-stale paths, and `docs:freshness:maintain` kept them in `sample_paths.hard_stale_paths` while legacy cohorts stayed separate.
- Safeguard ownership split: parent owns packet, registry, public book docs, and guard evidence; same-issue child lane owns only `docs/book/skills.md` and `skills/README.md`.

## Technical Requirements
- Functional requirements:
  - Keep the book and skill docs active unless a truthful reclassification is made.
  - Align content with current Codex CLI `0.128.0` local posture, release-facing `0.125.0` hold, cloud `0.124.0` hold, appserver default runtime, review handoff behavior, and shipped skill roster.
  - Record fresh registry metadata only after review.
  - Preserve hard-stale current-doc visibility in maintenance guard evidence.
- Non-functional requirements: deterministic docs validation, no network dependency for content checks beyond already captured Linear owner truth, and reviewable diff size.
- Interfaces / contracts: `docs:freshness` and `docs:freshness:maintain` reports remain machine-readable.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current book/skill docs | Active public docs stale beyond 14-day cadence | remove fallback | CO-532 | `docs:freshness` hard-stale current-doc paths | 2026-04-24 | 2026-05-13 | removed in this lane | Five paths no longer hard-stale | `npm run docs:freshness` |
| Maintenance evidence | Hard-stale current docs could be mentally grouped with legacy cohorts | remove fallback | CO-532 | `docs:freshness:maintain` sample paths include current docs | 2026-05-13 | 2026-05-13 | removed in this lane | Guard evidence keeps direct current-doc action explicit | focused docs-freshness maintain test |

- Large-refactor check: no broad freshness-policy refactor is needed; the lane repairs the current-doc review debt and focused guard evidence only.

## Architecture & Data
- Architecture / design adjustments: update docs and focused freshness-maintenance guard behavior without changing rolling cohort caps.
- Data model changes / migrations: registry `last_review` for the five current docs and packet docs after review.
- External dependencies / integrations: Linear issue context for CO-522/CO-530 routing evidence.

## Validation Plan
- Tests / checks: focused freshness-maintain test, delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff-budget, standalone review, elegance pass.
- Rollout verification: confirm the five paths are absent from `stale_entries` and `sample_paths.hard_stale_paths`.
- Monitoring / alerts: existing docs freshness gates.

## Open Questions
- None blocking.

## Approvals
- Reviewer: pending.
- Date: 2026-05-13.
