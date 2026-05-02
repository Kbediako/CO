# ACTION PLAN - CO-479 active task specs April 1 Linear classification

## Summary
- Goal: repair the CO-479 baseline debt for stale `active task specs` with `last_review=2026-04-01` for `CO-46`, `CO-62`, `CO-63`, and `CO-57` without weakening `spec-guard` or changing source specs before live evidence exists.
- Scope: docs packet, source task specs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - the parent-provided source anchor and protected terms are authoritative
  - the source payload path is unavailable in this child checkout
  - parent owns live Linear verification, source-spec classification, source-spec edits, validation, Linear/GitHub lifecycle, workpad, PR, and patch integration

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `spec-guard`
  - `active task specs`
  - `last_review=2026-04-01`
  - `CO-46`
  - `CO-62`
  - `CO-63`
  - `CO-57`
  - `clean origin/main`
  - `live-verify Linear state`
  - `active refresh vs inactive/terminal reclassification`
- Not done if:
  - any CO-479 packet/mirror file is missing
  - any source spec for `CO-46`, `CO-62`, `CO-63`, or `CO-57` changes before live verification
  - the plan allows blind `last_review` bumps
  - the plan weakens `spec-guard`
  - historical packet evidence is deleted
  - CO-479 is hidden under `CO-474`
  - docs:freshness ownership is treated as equivalent to active-spec ownership
- Pre-implementation issue-quality review:
  - 2026-05-02: approved for docs packet bootstrap. The lane is not suitable for the micro-task path because correctness depends on exact protected terms, source issue identity, and issue-by-issue Linear-state classification.
- Fallback / refactor decision: no fallback, compatibility, legacy, cached, break-glass, or minor-seam behavior is added or retained. This lane touches stale spec/docs metadata only to make an explicit evidence-backed active refresh vs inactive/terminal reclassification decision per source issue.

## Milestones & Sequencing
1. Create the CO-479 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register task id `20260502-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312` in `tasks/index.json`.
3. Add docs freshness rows for the six new packet/mirror files.
4. Add a current CO-479 snapshot to `docs/TASKS.md`.
5. Reproduce or classify the `clean origin/main` `spec-guard` failure for stale `active task specs` with `last_review=2026-04-01`.
6. `live-verify Linear state` for `CO-46`, `CO-62`, `CO-63`, and `CO-57`.
7. For each source issue, choose `active refresh vs inactive/terminal reclassification` based on live state and local packet evidence.
8. If inactive or terminal, reclassify the source spec and registry truthfully while preserving historical packet evidence.
9. Do not weaken `spec-guard`, delete historical evidence, hide under `CO-474`, or substitute docs:freshness ownership for active-spec ownership.
10. Run final validation and review gates.
11. Record classification evidence in the workpad, task mirrors, PR, and handoff notes.

## Dependencies
- Source anchor `ctx:sha256:ad8143d1da80d2c59b489656a2cfc36568c3cbb1256bddf3689f84cd477329bc#chunk:c000001`.
- Parent manifest `.runs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312-docs-packet/cli/2026-05-02T01-53-30-289Z-5901dd5b/manifest.json`.
- `spec-guard` and the source specs for `CO-46`, `CO-62`, `CO-63`, and `CO-57`.
- Parent-owned Linear issue-context reads.
- `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

## Validation
- Checks / tests:
  - protected-term scan across packet files
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - scoped `git diff --check --` over declared files
  - scoped changed-file review to confirm no out-of-scope edits
- Full validation:
  - clean-origin-main `spec-guard` reproduction/classification
  - live Linear evidence for all four source issues
  - final `spec-guard` after source-spec updates
  - docs-review and normal provider-worker handoff gates after implementation
- Rollback plan: revert only the CO-479 packet plus the four source-spec/index/registry metadata edits; no product code or guard policy changes are involved.

## Risks & Mitigations
- Risk: stale rows get blind `last_review` bumps.
  - Mitigation: plan requires live Linear evidence and issue-quality review before active refresh.
- Risk: `spec-guard` is weakened to clear the gate.
  - Mitigation: guard policy change is explicitly rejected and out of scope.
- Risk: historical evidence is deleted during inactive reclassification.
  - Mitigation: reclassification must preserve historical packet evidence.
- Risk: CO-479 is conflated with `CO-474` or docs:freshness ownership.
  - Mitigation: packet names those as rejected interpretations and keeps active-spec ownership explicit.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent live verification and source-spec classification: completed on 2026-05-02; all four source issues are terminal Done/completed and reclassified as inactive `done` specs with historical packet evidence preserved.
- Implementation validation and lifecycle handoff: validation complete; PR handoff remains parent-owned until checks and ready-review drain are clean.
- Date: 2026-05-02
