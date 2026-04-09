# Task Checklist - linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0

- Linear Issue: `CO-88` / `0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- MCP Task ID: `linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- Primary PRD: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- Task spec: `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the initial workpad mirror were drafted or refreshed for `CO-88`. Evidence: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `.agent/task/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`.
- [ ] Docs-review delegation evidence is captured and any packet-only findings are folded back before implementation. Evidence: pending.

## Audit / Implementation
- [ ] Selected-run-era truth surfaces are reconciled so current docs/tasks stop describing the removed legacy selected-run presenter module as the live `/ui/data.json` authority where newer seams now own that truth. Evidence: pending.
- [ ] Duplicate uppercase `.agent/task/*_TEMPLATE.md` surfaces are removed or explicitly retained with current-consumer rationale. Evidence: pending.
- [ ] Review-launch compatibility behavior is removed or justified truthfully in `scripts/lib/review-launch-attempt.ts`, `scripts/run-review.ts`, and touched docs/tests. Evidence: pending.
- [ ] The SDK artifact contract is corrected so exported return values are truthful. Evidence: pending.
- [ ] Design-system/design-reference placeholder claims are reduced to truthful current statements or archived follow-up references. Evidence: pending.
- [ ] Stale instruction, archive, and demo surfaces are cleaned up so touched present-tense claims match the current repo story. Evidence: pending.
- [ ] Compatibility leftovers that remain are documented with explicit live-consumer evidence. Evidence: pending.

## Validation
- [ ] Focused tests cover the touched runtime/package/review seams. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `FORCE_CODEX_REVIEW=1 npm run review`, and `npm run pack:smoke` (when required) are completed or truthfully justified. Evidence: pending.
- [ ] Standalone review plus explicit elegance/minimality pass are recorded before any review handoff. Evidence: pending.

## Handoff
- [x] The issue is in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `ce7c900b-b3ea-4223-aaae-799a1b183e1b`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`.
- [ ] A PR is attached before any review-state handoff. Evidence: pending.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
