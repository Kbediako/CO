# PRD - CO-532 hard-stale current book and skill docs

## Summary
- Problem Statement: `npm run docs:freshness` reports five current public/book docs as hard-stale outside the CO-530 Apr 9-12 legacy task-packet cohort, leaving current operator guidance blocked behind legacy-cohort cleanup.
- Desired Outcome: the five current docs are truthfully reviewed, refreshed or explicitly reclassified, and then registered with current metadata without weakening docs freshness policy or widening CO-530.

## User Request Translation (Context Anchor)
- User intent / needs: keep CO-530 focused on the Apr 9-12 legacy cohort while directly handling current book and shipped companion docs that readers still use.
- Success criteria / acceptance: reproduce the hard-stale evidence naming the five files, classify each file against current repo behavior, update content and registry/catalog metadata only after review, and make `npm run docs:freshness` stop reporting those five paths stale.
- Constraints / non-goals: no freshness cap/window changes, no blind `last_review` bumps, no deletion-only cleanup, and no archive/preserved classification unless the content truly becomes historical.

## Intent Checksum
- Protected terms / exact artifact and surface names: `docs/book/operations.md`, `docs/book/public-posture.md`, `docs/book/README.md`, `docs/book/skills.md`, `skills/README.md`, `docs:freshness`, `hard-stale`, current docs, public guide, shipped companion, CO-522, CO-530, `blocking_changed_paths=[]`.
- Nearby wrong interpretations to reject: folding the five current docs into CO-530, widening rolling freshness caps, bumping dates without review, deleting useful book docs, or treating current docs as archived without truthful semantics.

## Parity / Alignment Matrix
- Current truth: current main reports the five named book/skill docs as hard-stale with `last_review=2026-04-24`, `cadence_days=14`, and `overdue_days=5`.
- Reference truth: the docs catalog classifies these paths as active `public_guide` or `shipped_companion` surfaces with current repo sources of truth.
- Target truth / intended delta: each file remains current or is explicitly reclassified with evidence; current docs no longer hide inside legacy task-packet cleanup.
- Explicitly out-of-scope differences: CO-530 legacy packet/mirror/report cohort implementation, freshness policy caps, and CO-522 owner rehoming.

## Not Done If
- Any of the five named paths still appears as hard-stale after validation.
- The registry date changes without a content truthfulness review.
- CO-530 becomes responsible for these current docs by implication.
- The public/book navigation loses useful current setup, operations, posture, or skill guidance.

## Goals
- Refresh or preserve current book and skill docs with explicit rationale.
- Keep registry/catalog metadata aligned with truthful classifications.
- Add guard evidence that hard-stale current docs are direct-action debt, not legacy cohort debt.

## Non-Goals
- No CO-530 legacy cohort implementation.
- No docs freshness cap/window changes.
- No spec-guard or docs:freshness weakening.
- No blind date-only refresh.

## Stakeholders
- Product: CO operator and downstream users.
- Engineering: Codex orchestrator maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: `docs:freshness` no longer reports the five current docs; focused guard coverage passes.
- Guardrails / Error Budgets: current docs must stay classified as current unless content is deliberately archived with machine-readable evidence.

## User Experience
- Personas: downstream CO users reading the public book and operators using the shipped skill roster.
- User Journeys: a reader can use the book index, operations, public posture, and skill docs without stale model/runtime or workflow guidance.

## Technical Considerations
- Architectural Notes: use `docs/docs-catalog.json` and `docs/docs-freshness-registry.json` as the metadata authority; keep `docs:freshness:maintain` hard-stale current-doc evidence explicit.
- Dependencies / Integrations: docs freshness, docs catalog, bundled skill roster, Linear CO-522/CO-530 routing.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the stale current-doc condition by direct review/refresh; retain no new fallback.
- Large-refactor check: a narrow content and guard update is sufficient because rolling freshness policy already separates legacy cohort debt from current hard-stale docs.

## Open Questions
- None blocking.

## Approvals
- Product: Linear CO-532.
- Engineering: pending validation and review.
- Design: Not applicable.
