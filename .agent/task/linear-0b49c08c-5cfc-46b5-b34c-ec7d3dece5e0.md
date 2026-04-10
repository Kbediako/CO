# Task Checklist - linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0

- Linear Issue: `CO-88` / `0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- MCP Task ID: `linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- Primary PRD: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- TECH_SPEC: `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`

## Docs
- [x] Docs packet recreated and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` on fresh `origin/main`. Evidence: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `.agent/task/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] docs-review child-stream evidence recorded and packet-only findings folded back before implementation. Evidence: first run `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0-co-88-docs-review/cli/2026-04-10T00-22-52-906Z-a9d91f50/manifest.json` surfaced only a packet-local missing path; after fixing that reference, rerun `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0-co-88-docs-review-rerun/cli/2026-04-10T00-24-41-527Z-7e610bc7/manifest.json` passed `docs:check` and failed only on the existing repo-wide `docs:freshness` stale-doc baseline, which is recorded as truthful fallback rather than a packet defect.
- [x] Exactly one persistent Linear workpad comment is current for the fresh attempt. Evidence: `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`, fresh Rework-reset workpad comment on `CO-88`.

## Reset / Investigation
- [x] Live Linear workflow states were rechecked before any transition or mutation. Evidence: `linear issue-context`.
- [x] Required current-turn parallelization decision recorded as `forbid_parallel` / `parent_only_mutation` for the reset phase. Evidence: `linear parallelization --decision forbid_parallel --reason parent_only_mutation`.
- [x] The stale handoff was reset before new coding: PR `#394` closed, old workpad deleted, and branch recreated from fresh `origin/main`. Evidence: `gh pr close 394`, `linear delete-workpad`, `git checkout -B linear/co-88-repo-cleanup-truthfulness origin/main`.
- [x] Fresh-main audit confirmed the narrowed in-scope CO-88 seams still exist. Evidence: the dead selected-run presenter seam under `orchestrator/src/cli/control/`, uppercase templates under `.agent/task/`, stale MCP report archive under `archives/`, stale RLM defaults, placeholder design-system wording, misleading SDK artifact lifetime, and `packages/orchestrator-status-ui/app.js`.

## Implementation
- [ ] Remove dead selected-run/template/archive residue from the repo. Evidence: pending.
- [ ] Update RLM defaults and touched instruction/design docs to the truthful current posture. Evidence: pending.
- [ ] Make the static status UI bundle truthful when no explicit data URL is supplied outside runner-hosted `/ui`. Evidence: pending.
- [ ] Correct the SDK artifact lifetime contract without a silent compatibility break. Evidence: pending.
- [ ] Record explicit rationale for any compatibility surface intentionally retained in this lane. Evidence: pending.

## Validation
- [ ] Focused tests cover the touched SDK and static UI truthfulness seams. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `FORCE_CODEX_REVIEW=1 npm run review`, and `npm run pack:smoke` when required are completed or truthfully justified. Evidence: pending.
- [ ] Manifest-backed standalone review plus explicit elegance review are recorded before any review handoff. Evidence: pending.

## Handoff
- [ ] PR attached to the issue after the fresh rework implementation is ready. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `Human Review` or `In Review` only after coding stops. Evidence: pending.
