# ACTION_PLAN - CO-276 remaining dead-code-pruning README archive pointer replacement

## Summary
- Goal: replace the seven remaining protected README pointers to missing `.runs/0801-dead-code-pruning/archive/...` payloads with durable tracked guidance or explicit regeneration steps.
- Scope: docs-first packet, registry mirrors, seven listed README files, targeted validation, review/elegance, PR handoff.
- Assumptions: the ignored `.runs` archive payloads should remain absent from git; non-listed 0801 archive references are out of scope for this issue.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve "replace remaining dead-code-pruning `.runs` archive README pointers with durable tracked guidance" and the exact seven protected README paths from CO-276.
- Not done if: any protected README still presents `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/...` as durable checkout guidance, replacement text requires ignored local archive payloads, or implementation widens into generic archive cleanup.
- Pre-implementation issue-quality review: parent verified Linear issue-context, current README residue with targeted `rg`, and child-lane provenance failure before parent-owned docs packet and implementation.

## Milestones & Sequencing
1. Complete Linear setup: workpad, `In Progress` transition, parallelization decision, and truthful child-lane provenance failure note.
2. Create docs-first packet and registry mirrors for CO-276.
3. Update the seven protected README files with durable guidance and local-only `.runs` wording where needed.
4. Run targeted residue validation and required repo gates.
5. Run manifest-backed standalone review and explicit elegance/minimality pass before review handoff.
6. Attach PR, drain automated feedback, refresh the workpad, and move to `In Review` only when prerequisites are green.

## Dependencies
- Linear issue CO-276 and source issue CO-272 for scope.
- Existing docs-first registry files: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- Existing mirror/reference generation guidance in the repository.

## Validation
- Checks / tests:
  - targeted `rg` over the protected README files for `0801-dead-code-pruning` archive residue
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review plus explicit elegance/minimality pass
- Rollback plan: revert only the CO-276 docs packet and protected README edits; do not restore ignored `.runs` archive payloads.

## Risks & Mitigations
- Risk: widening into unrelated dead-code-pruning residue.
  - Mitigation: implementation is limited to the seven protected README files; non-listed hits remain unchanged unless a follow-up is filed.
- Risk: replacement text still implies the ignored archive exists in fresh clones.
  - Mitigation: targeted validation searches for the exact 0801 archive path and review checks wording for local-only/generated-output clarity.
- Risk: child-lane parallelization proof cannot be satisfied in this run.
  - Mitigation: workpad and audit JSONL record the `provider_worker_child_lane_provenance_invalid` failure truthfully; parent does not fabricate child evidence.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-21
