# Task Checklist - linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0

- Linear Issue: `CO-88` / `0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- MCP Task ID: `linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- Primary PRD: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- TECH_SPEC: `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`

## Docs
- [x] Docs packet recreated and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` on fresh `origin/main`. Evidence: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `.agent/task/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] docs-review child-stream evidence was rerun for the fresh `r4` packet before implementation handoff. Evidence: `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0-co-88-docs-review-r4/cli/2026-04-10T15-37-42-440Z-832ca68d/manifest.json`, `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0-co-88-docs-review-r4/cli/2026-04-10T15-37-42-440Z-832ca68d/review/telemetry.json`, `docs/docs-freshness-registry.json`.
- [x] Exactly one persistent Linear workpad comment is current for the fresh attempt. Evidence: `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`, fresh Rework-reset workpad comment on `CO-88`.

## Reset / Investigation
- [x] Live Linear workflow states were rechecked before any transition or mutation. Evidence: `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/provider-linear-issue-context-cache.json`, `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/provider-linear-worker-linear-audit.jsonl`.
- [x] Required current-turn parallelization decision recorded as `forbid_parallel` / `parent_only_mutation` for the reset phase. Evidence: `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/provider-linear-worker-linear-audit.jsonl`, `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/provider-linear-worker-proof.json`.
- [x] The stale handoff was reset before new coding: replay PR `#425` was closed, the previous workpad was deleted, and the branch was recreated from fresh `origin/main` as `linear/co-88-repo-cleanup-truthfulness-r4`. Evidence: `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/provider-linear-worker-linear-audit.jsonl`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`.
- [x] Fresh-main audit confirmed the narrowed in-scope CO-88 seams still exist. Evidence: the dead selected-run presenter seam under `orchestrator/src/cli/control/`, uppercase templates under `.agent/task/`, stale MCP report archive under `archives/`, stale RLM defaults, placeholder design-system wording, misleading SDK artifact lifetime, and `packages/orchestrator-status-ui/app.js`.

## Implementation
- [x] Remove dead selected-run/template/archive residue from the repo. Evidence: deleted uppercase template files under `.agent/task/`, deleted stale archive report `archives/REPORT.mcp_code_mode.md`, and deleted selected-run presenter seam files formerly under `orchestrator/src/cli/control/` and `orchestrator/tests/`.
- [x] Update RLM defaults and touched instruction/design docs to the truthful current posture. Evidence: `orchestrator/src/cli/rlm/alignment.ts`, `orchestrator/src/cli/rlmRunner.ts`, `orchestrator/tests/RlmAlignment.test.ts`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `docs/design/PRD-design-reference-pipeline.md`, `docs/design/PRD-hi-fi-design-toolkit.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, and `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`.
- [x] Make the static status UI bundle truthful when no explicit data URL is supplied outside runner-hosted `/ui`. Evidence: `packages/orchestrator-status-ui/app.js`.
- [x] Correct the SDK artifact lifetime contract without a silent compatibility break. Evidence: `packages/sdk-node/src/orchestrator.ts`, `packages/sdk-node/tests/orchestrator.exec.test.ts`, and `packages/sdk-node/tests/orchestrator.artifacts.test.ts`.
- [x] Record explicit rationale for any compatibility surface intentionally retained in this lane. Evidence: `packages/shared/streams/stdio.ts`, `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, and `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`.

## Validation
- [x] Focused tests cover the touched SDK and RLM truthfulness seams. Evidence: `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/validation-summary.md`.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `FORCE_CODEX_REVIEW=1 npm run review`, and `npm run pack:smoke` when required are completed or truthfully justified. Evidence: `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/validation-summary.md`.
- [x] Manifest-backed standalone review requirement plus explicit elegance review are recorded before any review handoff. Evidence: `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/standalone-review.md`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/elegance-review.md`, `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/review/telemetry.json`.

## Handoff
- [ ] Fresh replay PR is attached to the issue after the `r4` branch is ready. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `Human Review` or `In Review` only after coding stops. Evidence: pending.
