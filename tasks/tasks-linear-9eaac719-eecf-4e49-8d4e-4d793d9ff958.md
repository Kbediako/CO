# Task Checklist - linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958

- Linear Issue: `CO-92` / `9eaac719-eecf-4e49-8d4e-4d793d9ff958`
- MCP Task ID: `linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958`
- Primary PRD: `docs/PRD-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`
- TECH_SPEC: `tasks/specs/linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`, `docs/TECH_SPEC-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`, `docs/ACTION_PLAN-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`, `tasks/specs/linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`, `tasks/tasks-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`, `.agent/task/linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`.
- [ ] docs-review child-stream evidence recorded, and any packet-shape fixes or truthful baseline fallback are folded back into the spec before implementation. Evidence: pending.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `https://linear.app/asabeko/issue/CO-92/make-planner-memory-selection-real-instead-of-leaving-taskcontext-as#comment-c757a92c`, `out/linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958/manual/workpad.md`.

## Investigation
- [x] Live Linear workflow states were rechecked and the issue was moved from `Ready` to `In Progress` before active coding. Evidence: `linear issue-context`, `linear transition --state "In Progress"`.
- [x] Required same-turn parallelization decision recorded as `stay_serial` / `single_bounded_change`. Evidence: `linear parallelization --decision stay_serial --reason single_bounded_change`.
- [x] The detached workspace was moved onto branch `linear/co-92-planner-memory-selection` before repo edits. Evidence: `git switch -c linear/co-92-planner-memory-selection`.
- [x] Baseline audit confirmed the bounded seam: `TaskContext` is still planner-dead, `CommandPlanner` still discards the task input, and the cloud prompt builder still performs post-plan prompt-pack selection heuristics. Evidence: `orchestrator/src/types.ts`, `orchestrator/src/cli/services/runPreparation.ts`, `orchestrator/src/cli/adapters/CommandPlanner.ts`, `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`.

## Implementation
- [ ] Planner receives a meaningful memory-bearing input rather than a dead `TaskContext`. Evidence: pending.
- [ ] The planner seam can consume literal `source 0` plus selected memory refs before downstream prompt builders run. Evidence: pending.
- [ ] Planner-selected memory refs are consumed downstream through the bounded cloud prompt path without breaking fallback behavior. Evidence: pending.
- [ ] The change remains additive and bounded rather than becoming a broad planner rewrite. Evidence: pending.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-92-docs-review-rerun --format json`. Evidence: pending.
- [ ] Focused planner-memory and cloud-prompt tests. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness` or a truthful repo-baseline fallback note. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] Manifest-backed standalone review plus explicit elegance review before any review handoff. Evidence: pending.
- [ ] `npm run pack:smoke` if the final diff touches downstream-facing CLI/runtime surfaces. Evidence: pending.

## Handoff
- [ ] A PR is attached before any review-state handoff. Evidence: pending.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
