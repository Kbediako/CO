# PRD - CO-529 archived registry rows require stubs or explicit retained class

## Traceability
- Linear issue: `CO-529` / `2807d702-edce-4847-84d3-ca8628ab77fc`
- Task id: `linear-2807d702-edce-4847-84d3-ca8628ab77fc`
- Registry id: `20260526-linear-2807d702-edce-4847-84d3-ca8628ab77fc`
- Canonical owner key: `implementation-docs-archive:archived-registry-stub-invariant`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=implementation-docs-archive:archived-registry-stub-invariant`
- Live issue-context evidence: `bin/codex-orchestrator.js linear issue-context --issue-id CO-529 --format json` returned `Backlog` before guarded transition to `In Progress` at `2026-05-26T08:35:25.719Z`.

## Summary
- Problem Statement: `docs/docs-freshness-registry.json` can mark on-main docs as `status=archived` even when those files are still full documents with no valid `<!-- docs-archive:stub -->` metadata and no explicit retained/historical lifecycle class. That hides active-looking docs from freshness without proving archive payloads or intentional retained semantics.
- Desired Outcome: archived registry rows must prove one of the allowed truths: a valid repo-standard archive stub, an explicit retained/historical lifecycle class such as `preserved_historical_stub` or `retained_terminal_packet`, or an intentionally catalogued historical/archive reference page. Full active documents must not be hidden by `status=archived`.

## User Request Translation
- Preserve the CO-529 contract from Linear: classify current latest-main suspect archived rows, repair invalid rows, and add a deterministic fail-closed guard.
- Keep `allow_registry_only` narrow: it can repair metadata only for already-stubbed or explicitly retained/historical files, not hide full documents.
- Treat the merged PR #800 Codex P2 as actionable context, while using current `origin/main` as live truth. The original `docs/TECH_SPEC-implementation-docs-archive-automation.md` example is now a valid stub, but the invariant gap still exists for other full docs.

## Intent Checksum
- Protected terms: implementation-docs archive automation, `docs/docs-freshness-registry.json`, `status=archived`, `<!-- docs-archive:stub -->`, `Full content`, `Archive branch`, `Archive path`, `allow_registry_only`, registry-only archival, `preserved_historical_stub`, `retained_terminal_packet`, docs:freshness, PR #800, Codex P2.
- Nearby wrong interpretations to reject: do not blindly set all suspect rows active; do not bulk-stub without proving archive payloads; do not weaken `docs:freshness`, `spec-guard`, or archive policy; do not treat historical/archive pages and implementation-doc archive stubs as the same class without machine-readable evidence.
- Explicit non-goals: no broad docs-freshness rewrite, no deletion of historical docs to clear debt, no blind `last_review` bumps, no reclassification of PR #800 as originally clean, no `allow_registry_only` bypass.

## Parity / Alignment Matrix

| Surface | Current truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- |
| Archived registry rows | `status=archived` can exist on full on-main docs without stub metadata or retained lifecycle evidence. | `docs:freshness` fails closed unless archived rows prove a valid stub or explicit retained/historical class. | Deleting historical docs merely to make checks pass. |
| Archive stubs | Real stubs use `<!-- docs-archive:stub -->`, `Full content`, `Archive branch`, and `Archive path`. | Stub validation remains the archive-doc truth contract. | Treating a requirements-text mention of the marker as a stub. |
| Retained historical docs | Some full docs are intentionally retained as history or continuity evidence. | Those rows use explicit statuses/classes such as `preserved_historical_stub` or `retained_terminal_packet`, with required evidence. | Reusing `status=archived` as an implicit catch-all. |
| Registry-only archive repair | `allow_registry_only` can change registry state without proving the on-main file is already safe to hide. | Registry-only repair is allowed only for valid stubs or explicit retained/historical files. | Broad archive workflow redesign unrelated to row truthfulness. |

## Acceptance Criteria
1. Current latest-main suspect `archived` registry rows are classified into valid archive stubs, explicit retained/historical rows, historical/archive reference pages, and invalid full-doc archived rows.
2. Invalid rows are repaired by generating real archive payloads/stubs or by reclassifying them to an explicit non-hidden retained/historical lifecycle status with current review metadata.
3. `docs:freshness` or adjacent archive automation fails closed when a full on-main document is marked `archived` without a valid stub or explicit retained/historical class.
4. `allow_registry_only` cannot convert a full document into hidden archived metadata unless the file is already stubbed or explicitly retained/historical.
5. Focused regressions cover the current PR #800 example as a valid stub, a real archive stub, a historical/archive reference page, a preserved historical stub, and an invalid full-doc archived row.

## Not Done If
- A registry row can be `archived` while the on-main file is still a full active PRD, TECH_SPEC, ACTION_PLAN, task/spec, or checklist document with no stub metadata or explicit retained/historical class.
- `allow_registry_only=true` can hide full documents as archived without proving stub or retained-history semantics.
- Current invalid rows remain hidden from `docs:freshness` as archived.
- Tests only cover changed/staged rows and miss current-main registry truth.

## Goals
- Make archived registry row truth machine-checkable.
- Preserve valid archive stubs and retained historical classes.
- Convert hidden full-doc archived rows into explicit, reviewable lifecycle truth.

## Non-Goals
- No broad archive automation redesign outside this invariant.
- No release-intake, cloud-canary, or provider-worker queue changes.
- No docs deletion or blind review-date churn.

## Metrics & Guardrails
- `docs:freshness` reports invalid archived rows before repair and passes after rows are classified.
- Focused regression fails before implementation and passes after the guard/repair.
- Current original PR #800 TECH_SPEC example remains valid because it is now a real archive stub.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- This lane touches archive/freshness lifecycle classification. The decision is to remove the implicit `status=archived` fallback that hides full docs without proof.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Docs freshness registry | `status=archived` hides full on-main docs without valid stub or retained/historical class. | remove fallback | CO-529 | Archived row points at a non-stub full document. | 2026-05-13 | 2026-05-26 | Not retained | Archived rows must prove stub or explicit retained/history semantics. | focused docs-freshness/archive tests. |

## Open Questions
- Whether all current non-stub archived rows should become `retained_terminal_packet`, `preserved_historical_stub`, or active/current rows depends on current-main classification evidence gathered during implementation.

## Approvals
- Pre-implementation issue-quality review: parent CO orchestrator self-approval after live issue-context, open PR audit, provider-intake/co-status reads, and current-main registry scan.
- Date: 2026-05-26.
