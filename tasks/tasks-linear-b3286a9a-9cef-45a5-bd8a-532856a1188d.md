# Task Checklist - linear-b3286a9a-9cef-45a5-bd8a-532856a1188d

- Linear Issue: `CO-127` / `b3286a9a-9cef-45a5-bd8a-532856a1188d`
- MCP Task ID: `linear-b3286a9a-9cef-45a5-bd8a-532856a1188d`
- Primary PRD: `docs/PRD-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`
- Task spec: `tasks/specs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and saved workpad source were drafted for `CO-127`. Evidence: `docs/PRD-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `docs/TECH_SPEC-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `docs/ACTION_PLAN-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `tasks/specs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `tasks/tasks-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `.agent/task/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes captured in the task spec before coding. Evidence: `tasks/specs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`.
- [x] Docs-review approval captured for this task, or a truthful fallback recorded if the child stream stops on an existing repo baseline. Evidence: `.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d-docs-review-rework/cli/2026-04-11T22-05-57-080Z-760b999c/manifest.json`, `.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d-docs-review-rework/cli/2026-04-11T22-05-57-080Z-760b999c/review/telemetry.json`.

## Workflow
- [x] Live issue state and attached PR posture were rechecked before active work; `CO-127` is already in active `Rework` and prior PR `#402` is closed. Evidence: packaged `linear issue-context`, `gh pr view 402`.
- [x] Exactly one explicit same-turn parallelization decision was recorded. Evidence: packaged `linear parallelization` recorded `forbid_parallel` / `parent_only_mutation`.
- [x] Rework reset completed on the workspace branch from fresh `origin/main`. Evidence: `git switch -C linear/co-127-run-review-symlink-hardening origin/main`.
- [ ] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: local source `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/workpad.md`; remote upsert pending shared-budget cooldown expiry.
- [x] At least one audited child stream or child lane evidence artifact is captured for this attempt. Evidence: `.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d-docs-review-rework/cli/2026-04-11T22-05-57-080Z-760b999c/manifest.json`.

## Investigation
- [x] The supported repo-local `run-review` entrypoint posture is proven from current code/runtime evidence. Evidence: `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260412T075900Z-supported-path-verdict.md`.
- [x] The packaged `dist/scripts/run-review.js` entrypoint posture is proven from current code/runtime evidence. Evidence: `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260412T075900Z-supported-path-verdict.md`.
- [x] A bounded decision is explicit: parity hardening is required, while product-surface docs remain truthful about the absence of an installed standalone `run-review` bin. Evidence: `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260412T075900Z-supported-path-verdict.md`.

## Implementation
- [x] Any code change remains bounded to the direct-exec seam and its focused launcher/test surfaces. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [x] The existing `does not crash when stdout pipe closes early` subprocess regression remains unchanged except for retained evidence/coverage. Evidence: focused `tests/run-review.spec.ts` pass.

## Validation
- [x] Focused direct-exec and subprocess-harness tests pass for the final seam decision. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ReviewCliLaunchShell.test.ts tests/run-review.spec.ts`.
- [x] Standard validation floor runs before review handoff for the final non-trivial diff. Evidence: `node scripts/spec-guard.mjs --dry-run`, prior `npm run build`, `npm run lint`, full `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `npm run pack:smoke`.
- [x] Standalone review and explicit elegance/minimality pass complete before handoff. Evidence: `.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/cli/2026-04-11T14-43-18-011Z-10ef4027/review/telemetry.json`, `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260412T081636Z-elegance-review.md`.

## Handoff
- [ ] Workpad refreshed after docs, implementation, validation, and immediately before review handoff. Evidence: pending.
- [ ] Clean PR attached to the Linear issue before review-state transition if code lands. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
