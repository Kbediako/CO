# ACTION_PLAN - CO-282 stale CO-242 workspace path docs:check repair

## Traceability
- Linear issue: `CO-282` / `810a1d48-4f5e-4557-ab38-8068d77f678c`
- Linear URL: https://linear.app/asabeko/issue/CO-282/fix-co-242-docscheck-stale-workspace-path-reference
- Source anchor: `ctx:sha256:4a92263db45aeb876eedb7f1409bc738795db916245fc4b30fbd9afb3dc4619a#chunk:c000001`

## Summary
- Goal: remove the CO-242 action-plan `backticked-path-missing` docs hygiene blocker without expanding CO-278.
- Scope: CO-282 docs packet, task mirrors, the single CO-242 action-plan wording change, and scoped validation.
- Assumptions:
  - the deleted workspace path is historical evidence, not a required live repo path
  - `docs:check` is correct to validate backticked repo paths
  - the smallest fix is wording-only

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `npm run docs:check`
  - `backticked-path-missing`
  - `docs/ACTION_PLAN-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`
  - .workspaces/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124
  - `CO-242`
  - `CO-278`
- Not done if:
  - `npm run docs:check` still reports the targeted missing path row
  - the deleted workspace is recreated
  - CO-278 stale spec-guard files are changed
  - the fix becomes a broad docs cleanup
- Pre-implementation issue-quality review:
  - live Linear state was `Ready` with no attached PR, then moved to `In Progress`
  - the pre-turn decomposition matrix found no safe independent child-lane slice for this single bounded docs change
  - source inspection confirmed `docs:check` treats backticked repo paths as live references

## Milestones & Sequencing
- [x] Inspect issue context, publish the initial workpad, move CO-282 into `In Progress`, and record `stay_serial` / `single_bounded_change` for the active turn. Proof: `out/linear-810a1d48-4f5e-4557-ab38-8068d77f678c/manual/workpad.md`.
- [x] Register the CO-282 docs-first packet and registry mirrors. Proof: `docs/PRD-linear-810a1d48-4f5e-4557-ab38-8068d77f678c.md`, `docs/TECH_SPEC-linear-810a1d48-4f5e-4557-ab38-8068d77f678c.md`, `docs/ACTION_PLAN-linear-810a1d48-4f5e-4557-ab38-8068d77f678c.md`, `tasks/specs/linear-810a1d48-4f5e-4557-ab38-8068d77f678c.md`, `tasks/tasks-linear-810a1d48-4f5e-4557-ab38-8068d77f678c.md`, `.agent/task/linear-810a1d48-4f5e-4557-ab38-8068d77f678c.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Patch the CO-242 action-plan milestone so the deleted workspace path is plain historical evidence, not a backticked live path. Proof: `docs/ACTION_PLAN-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`.
- [x] Run scoped validation, including `npm run docs:check`, and refresh the Linear workpad with the result. Proof: scoped search found no backticked deleted workspace path; after rebasing onto `origin/main` with CO-276 merged, `npm run docs:check` passes.

## Dependencies
- `scripts/docs-hygiene.ts`
- `docs/ACTION_PLAN-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`

## Validation
- [x] JSON parse for `tasks/index.json`.
- [x] JSON parse for `docs/docs-freshness-registry.json`.
- [x] Scoped search confirms no backticked deleted workspace path remains in the CO-242 action plan.
- [x] `npm run docs:check` no longer reports the targeted `backticked-path-missing` row.
- [x] Rollback plan: revert the CO-242 wording change and CO-282 packet/mirror additions if docs hygiene regresses or scope expands.

## Risks & Mitigations
- Risk: replacing code formatting loses traceability to the historical workspace path.
  - Mitigation: keep the exact deleted path as plain text in the milestone.
- Risk: the fix drifts into CO-278 or broad docs freshness work.
  - Mitigation: keep changes limited to CO-282 packet/mirrors and one CO-242 action-plan line.
- Risk: docs:check finds another unrelated baseline issue.
  - Mitigation: record unrelated failures separately instead of expanding this lane.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-21
