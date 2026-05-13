# Task Checklist - linear-bb472787-be60-44e3-ac83-a3c297dab470

- Linear Issue: `CO-109` / `bb472787-be60-44e3-ac83-a3c297dab470`
- MCP Task ID: `linear-bb472787-be60-44e3-ac83-a3c297dab470`
- Primary PRD: `docs/PRD-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`
- Task spec: `tasks/specs/linear-bb472787-be60-44e3-ac83-a3c297dab470.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the initial workpad source were drafted or refreshed for `CO-109`. Evidence: `docs/PRD-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`, `docs/TECH_SPEC-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`, `docs/ACTION_PLAN-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`, `tasks/specs/linear-bb472787-be60-44e3-ac83-a3c297dab470.md`, `tasks/tasks-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`, `.agent/task/linear-bb472787-be60-44e3-ac83-a3c297dab470.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-bb472787-be60-44e3-ac83-a3c297dab470/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-bb472787-be60-44e3-ac83-a3c297dab470.md`.
- [x] Docs-review delegation evidence is captured and the repo-wide `docs:freshness` baseline failure is recorded truthfully as manual fallback rather than as a packet-shape blocker. Evidence: `.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470-co-109-docs-review/cli/2026-04-08T09-38-27-493Z-da4100bc/manifest.json`, `out/linear-bb472787-be60-44e3-ac83-a3c297dab470/manual/20260408T093827Z-docs-review-fallback.md`.

## Implementation
- [ ] Authoritative running `display_event` truth prefers richer worker, debug, or nearby child-stream or child-lane state over generic progress filler. Evidence: pending.
- [ ] Operator telemetry freshness is explicit and sourced from authoritative timestamps rather than local rerender cadence. Evidence: pending.
- [ ] Current 1-second local runtime ticking is preserved. Evidence: pending.
- [ ] Current 5-second rolling throughput semantics are preserved and documented. Evidence: pending.
- [ ] Remaining-based Linear complexity display remains truthful and does not default to exhausted when budget remains. Evidence: pending.

## Validation
- [ ] Focused proof records which original complaints remained valid on the `2026-04-08` baseline versus already-correct behavior. Evidence: pending.
- [ ] Focused presenter, runtime, and dashboard regressions cover authoritative event truth and explicit freshness surfacing. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `TASK=linear-bb472787-be60-44e3-ac83-a3c297dab470 FORCE_CODEX_REVIEW=1 npm run review -- --manifest /Users/kbediako/Code/CO/.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T09-23-37-853Z-e77da08c/manifest.json`, and `npm run pack:smoke` all pass on the branch head or record a truthful existing-baseline fallback. Evidence: pending.
- [ ] Payload truth and rendered proof are cross-checked with screenshots before review handoff. Evidence: pending.

## Handoff
- [x] The issue is in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `fa473099-faff-4434-b4ae-8e57a38f0820`, `out/linear-bb472787-be60-44e3-ac83-a3c297dab470/manual/workpad.md`.
- [x] A PR is attached before any review-state handoff. Evidence: `PR #382`.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
