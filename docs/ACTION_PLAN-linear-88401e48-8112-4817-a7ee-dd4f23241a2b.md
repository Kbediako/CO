# ACTION_PLAN - CO-382 fallback-expiry and large-refactor policy

## Summary
- Goal: create the CO-382 docs-first scaffold and then, in the parent lane, implement a concrete repo policy for `fallback expiry` and `large refactor` decisions.
- Scope: this child lane owns packet files, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows for the new CO-382 surfaces only.
- Assumptions:
  - the parent prompt carries the authoritative issue shape for this child lane
  - source payload content is unavailable in this child checkout, so no extra issue scope is inferred
  - parent owns policy implementation, follow-up issue creation/attachment, Linear state, workpad, PR lifecycle, and full validation

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `provider workflow`
  - `review wrapper`
  - `runtime routing`
  - `docs freshness ownership`
  - `control-host status surfaces`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
- Not done if:
  - the policy only says "avoid overengineering" without concrete expiry mechanics
  - agents can continue adding indefinite compatibility branches without an owner and removal condition
  - fallback-heavy areas are not mapped to follow-up ownership
  - docs gates or relevant tests are weakened
- Pre-implementation issue-quality review:
  - 2026-04-26: CO-382 is broader than a tiny docs edit because correctness depends on exact fallback-expiry fields, exact high-churn surfaces, and exact prompt choices.
  - 2026-04-26: the micro-task path is ineligible because correctness depends on exact policy mechanics, exact surfaces, and follow-up issue shaping.
- Fallback / refactor decision:
  - applies: `Yes`
  - decision: create shared policy and prompts requiring `remove fallback`, `expire fallback`, or `justify retaining fallback`
  - large-refactor check: policy prefers consolidation when named high-churn surfaces carry repeated fallbacks, split source authority, or lack a clear removal condition

## Milestones & Sequencing
1. Create the CO-382 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register the canonical spec and checklist in `tasks/index.json`.
3. Add a current CO-382 snapshot to `docs/TASKS.md`.
4. Add docs freshness registry rows only for the new CO-382 packet/checklist surfaces.
5. Parent runs docs-review on the scaffold before implementation.
6. Parent records the docs-review baseline blocker if it is unrelated to CO-382.
7. Parent implements policy and checklist/template prompts for `remove fallback`, `expire fallback`, or `justify retaining fallback`.
8. Parent maps all five named fallback-heavy areas to existing issues or new follow-ups.
9. Parent validates docs gates and relevant focused tests without weakening existing safety checks.

## Parent-Owned Follow-On Plan
1. Decide the default allowed maximum lifetime for retained fallbacks.
2. Define required fallback metadata: owner, trigger, introduced date, review date, removal condition, allowed maximum lifetime, and validation evidence.
3. Define large-refactor decision criteria for high-churn surfaces.
4. Add docs-first or issue-template prompts requiring the fallback decision.
5. Attach or create follow-ups for all five named fallback-heavy areas:
   - `provider workflow`: `CO-394`
   - `review wrapper`: `CO-395`
   - `runtime routing`: `CO-396`
   - `docs freshness ownership`: `CO-397`
   - `control-host status surfaces`: `CO-398`
6. Run docs gates and relevant focused tests, then update checklists with evidence.

## Dependencies
- Linear issue `CO-382`
- Source anchor `ctx:sha256:f626c0060a758f54ce277c8a7d0cf2f3e1e1acea5ea6e244c8b83f55e3bcca44#chunk:c000001`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`
- docs-first templates and task checklist conventions

## Validation
- Checks / tests:
  - JSON parse check for `tasks/index.json`
  - JSON parse check for `docs/docs-freshness-registry.json`
  - scoped diff/file-list review against declared file scope
  - parent-owned docs-review, docs gates, and relevant focused tests after implementation
- Known baseline blocker:
  - 2026-04-26 docs-review stream failed in `npm run docs:check` because current `HEAD` references missing CO-276 packet files for `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`. CO-382 must label that separately from CO-382 validation.
- Rollback plan:
  - revert only the CO-382 packet and registry mirror edits if parent source reconciliation changes the issue shape before implementation

## Risks & Mitigations
- Risk: policy becomes generic advice instead of an expiry mechanism.
  - Mitigation: require owner, trigger, introduced date, review date, removal condition, allowed maximum lifetime, and validation evidence.
- Risk: agents keep adding another `minor seam` instead of planning a `large refactor`.
  - Mitigation: require a decision threshold for the named high-churn surfaces.
- Risk: follow-up ownership is left vague.
  - Mitigation: checklist must remain open until at least three fallback-heavy areas are attached to existing issues or parent-created follow-ups.

## Approvals
- Docs-first scaffold: bounded same-issue child lane, 2026-04-26
- Parent docs-review: attempted before implementation, failed on unrelated CO-276 baseline docs:check blocker; manifest `.runs/linear-88401e48-8112-4817-a7ee-dd4f23241a2b-co382-docs-review/cli/2026-04-26T13-39-08-440Z-7c300a3b/manifest.json`
- Parent issue-quality review: approved to proceed with CO-382-scoped policy implementation while preserving the baseline blocker as unrelated evidence
