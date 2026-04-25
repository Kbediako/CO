# PRD - CO-369: CO-360 task registry docs pointer TECH_SPEC mirror alignment

## Summary
- Problem Statement: `CO-360` may have a task registry docs pointer that does not align with its docs-side `TECH_SPEC` mirror. That makes the indexed task surface ambiguous: reviewers and automation may follow `tasks/index.json` `paths.docs` to a canonical task spec, a missing docs mirror, or a legacy fallback without knowing which behavior is intentional.
- Desired Outcome: preserve the `CO-360` docs-first contract by making the registry/docs relationship explicit. After the parent lane verifies current state, the implementation should either add the missing `CO-360` docs `TECH_SPEC` mirror and repoint `paths.docs`, or record a specific legacy fallback rationale with evidence.

## Source Traceability
- Linear issue: `CO-369` / `6b3b8bf4-63fa-44e8-a182-e2e20209aca7`
- Linear title: `CO-360: align task registry docs pointer with TECH_SPEC mirror`
- Task id: `linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7`
- Source payload anchor: `ctx:sha256:17c72b629ea51d97e5065c3e76d6f4316f93091ecea9e4b15ea7310a08b13aab#chunk:c000001`
- Source object id: `sha256:17c72b629ea51d97e5065c3e76d6f4316f93091ecea9e4b15ea7310a08b13aab`
- Source payload path supplied by parent: `../../.runs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7/cli/2026-04-25T09-36-04-589Z-45349664/memory/source-0/source.txt`
- Source payload note: the child workspace did not have the parent source payload path while drafting, so the parent reconciled this packet to the provider-run source anchor before implementation.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the `CO-369` docs packet for the `CO-360` registry/docs alignment issue while the parent lane verifies and implements the actual registry change. The packet must not pre-decide whether the right outcome is a new docs mirror plus `paths.docs` repoint, or a documented legacy fallback.
- Success criteria / acceptance:
  - This child lane creates only the six scoped packet files.
  - The packet preserves protected terms, explicit non-goals, a parity/alignment matrix, `Not Done If`, and acceptance criteria.
  - Parent verifies the current `CO-360` task registration, canonical task spec, docs-side `TECH_SPEC` mirror state, and `tasks/index.json` `paths.docs` value before implementation.
  - Parent implements one verified outcome: add the missing `CO-360` docs `TECH_SPEC` mirror and repoint `paths.docs`, or record a specific legacy fallback rationale with evidence.
  - Parent keeps registry/docs alignment scoped to `CO-360`; unrelated registry rows, docs freshness rows, provider runtime files, and Linear state remain out of this child lane.
- Constraints / non-goals:
  - Child lane must not edit `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, the `CO-360` TECH_SPEC mirror, provider runtime files, or Linear state.
  - Child lane must not run full repo validation suites.
  - Parent owns registry mutation, implementation validation, workpad, PR, and Linear lifecycle.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO-369`
  - `CO-360: align task registry docs pointer with TECH_SPEC mirror`
  - `Create the CO-369 docs packet files only`
  - `add the missing CO-360 docs TECH_SPEC mirror and repoint paths.docs`
  - `record a specific legacy fallback rationale`
  - `do not pre-decide beyond what the parent has verified`
- Protected terms / exact artifact and surface names:
  - `CO-360`
  - `CO-369`
  - `tasks/index.json`
  - `items[]`
  - `paths.docs`
  - `TECH_SPEC`
  - `TECH_SPEC mirror`
  - `CO-360 docs TECH_SPEC mirror`
  - `tasks/specs`
  - `docs/TECH_SPEC-*`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
  - provider runtime files
  - `source-0`
- Nearby wrong interpretations to reject:
  - treating this as permission for the child lane to edit `tasks/index.json`
  - blindly repointing `paths.docs` without verifying the `CO-360` mirror state
  - creating or changing unrelated docs packets to normalize the registry
  - treating any legacy `paths.docs` value as acceptable without a concrete rationale
  - changing docs freshness policy or `docs/docs-freshness-registry.json`
  - touching provider runtime files while fixing a docs registry pointer
  - mutating Linear from the child lane

## Parity / Alignment Matrix
| Dimension | Current Truth | Reference Truth | Target Truth / Intended Delta | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `CO-360` registry docs pointer | Parent is verifying whether `tasks/index.json` `paths.docs` points at the correct docs-side `TECH_SPEC` mirror, a canonical task spec, or a missing/stale path. | Docs-first packets should have a canonical task spec under `tasks/specs/` and, when registry docs linkage is expected, a docs-side `docs/TECH_SPEC-*` mirror. | Parent records the verified current state and makes `paths.docs` point to the `CO-360` docs `TECH_SPEC` mirror, or records why this row must stay on a specific legacy fallback. | Broad `tasks/index.json` cleanup or normalization of unrelated task rows. |
| `CO-360` docs `TECH_SPEC` mirror | The issue contract says a mirror may be missing or misaligned. This child lane does not inspect or edit the parent-owned `CO-360` mirror. | The docs mirror should carry enough issue-shaping context for registry readers and docs tooling to land on the docs-facing spec surface. | If missing, parent adds the mirror from the canonical task spec and repoints `paths.docs`; if intentionally absent, parent records the fallback rationale. | Editing the `CO-360` mirror from this child lane. |
| Parent/child ownership | This child lane owns only the new `CO-369` packet files. | Registry mutations and authoritative issue state live in the parent lane. | Parent consumes the packet patch, verifies state, and performs implementation or fallback documentation. | Linear mutation helpers, PR lifecycle, workpad updates, and full validation in this child lane. |
| Validation posture | Child scope allows only tight packet checks. | Pointer changes should be validated where they happen with focused docs/registry checks. | Child validates file presence and markdown whitespace only; parent runs the relevant registry/docs checks after implementation. | Full repo validation suites in this child lane. |

## Not Done If
- The packet fails to preserve `paths.docs`, `CO-360 docs TECH_SPEC mirror`, and legacy fallback rationale as protected decision terms.
- Parent implementation changes `tasks/index.json` without first verifying whether the `CO-360` docs-side `TECH_SPEC` mirror exists and what `paths.docs` currently targets.
- The result leaves `paths.docs` pointing to a missing, stale, or ambiguous docs surface with no specific fallback rationale.
- The result broadens into unrelated task registry normalization, docs freshness policy changes, provider runtime changes, or Linear mutation from the child lane.
- The parent cannot tell from the packet which files are child-owned versus parent-owned.

## Goals
- Create a complete docs-first packet for `CO-369`.
- Preserve the `CO-360` registry/docs pointer issue contract without pre-deciding the implementation.
- Make the parent-owned decision fork explicit and testable.
- Keep the child patch limited to the six declared docs/task files.

## Non-Goals
- Do not edit `tasks/index.json`.
- Do not edit `docs/TASKS.md`.
- Do not edit `docs/docs-freshness-registry.json`.
- Do not edit the `CO-360` docs `TECH_SPEC` mirror or canonical task spec.
- Do not update provider runtime files.
- Do not mutate Linear issue state, workpads, labels, or comments.
- Do not run full repo validation suites from this child lane.

## Stakeholders
- Product: CO operators who need task registry docs pointers to lead to the intended issue docs.
- Engineering: docs-first packet maintainers, task registry maintainers, and parent-lane implementers for `CO-360`.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: six child-owned packet files exist; packet preserves protected terms and acceptance criteria; parent can implement a single verified alignment outcome; `paths.docs` ends in an explicit, documented state.
- Guardrails / Error Budgets: zero child edits outside owned files; no child Linear mutations; no full-suite validation; no broad registry cleanup.

## User Experience
- Personas:
  - Parent implementer verifying the `CO-360` registry row.
  - Reviewer following `tasks/index.json` `paths.docs` to understand the issue.
  - Future docs steward deciding whether a legacy docs pointer is intentional.
- User Journeys:
  - Parent applies this packet, inspects `CO-360`, and chooses the mirror/repoint path or fallback-rationale path from current evidence.
  - Reviewer opens the task registry pointer and lands on a docs-facing spec or an explicit fallback explanation.
  - Future maintainer sees that this was a narrow `CO-360` docs alignment lane, not a repo-wide registry migration.

## Technical Considerations
- Architectural Notes: prefer existing docs-first packet conventions: canonical implementation spec in `tasks/specs/`, docs mirror in `docs/TECH_SPEC-*`, task checklist in `tasks/tasks-*`, and `.agent/task` mirror for continuity.
- Dependencies / Integrations: `tasks/index.json`, the `CO-360` canonical task spec, the `CO-360` docs-side `TECH_SPEC` mirror, focused docs/registry validation, and parent-owned Linear/PR workflow.

## Open Questions
- What exact `CO-360` task UUID and current `paths.docs` value does the parent verify?
- Does a `CO-360` docs-side `TECH_SPEC` mirror already exist but lack registry linkage, or is the mirror missing entirely?
- If parent chooses the legacy fallback path, what specific historical or tooling constraint justifies it?

## Approvals
- Product: issue accepted via `CO-369`.
- Engineering: pending parent verification and implementation.
- Design: Not applicable.
