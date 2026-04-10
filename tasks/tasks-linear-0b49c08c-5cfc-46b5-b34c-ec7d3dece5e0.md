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
- [x] Remove dead selected-run/template/archive residue from the repo. Evidence: the selected-run presenter seam files were removed from orchestrator/src/cli/control and orchestrator/tests, the uppercase template duplicates were removed from .agent/task, and the stale MCP code-mode report archive was removed from archives/REPORT.mcp_code_mode.md in the fresh-main rework branch.
- [x] Update RLM defaults and touched instruction/design docs to the truthful current posture. Evidence: `orchestrator/src/cli/rlm/alignment.ts`, `orchestrator/src/cli/rlmRunner.ts`, `orchestrator/tests/RlmAlignment.test.ts`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `tasks/design-reference-pipeline.md`, `tasks/hi-fi-design-toolkit.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`, and `packages/design-system/scripts/test-visual.mjs`.
- [x] Make the static status UI bundle truthful when no explicit data URL is supplied outside runner-hosted `/ui`. Evidence: `packages/orchestrator-status-ui/app.js` now fail-closes without the hard-coded historical `out/.../data.json` fallback.
- [x] Correct the SDK artifact lifetime contract without a silent compatibility break. Evidence: `packages/sdk-node/src/orchestrator.ts`, `packages/sdk-node/tests/orchestrator.exec.test.ts`, `packages/sdk-node/tests/orchestrator.artifacts.test.ts`, and `docs/guides/ci-integration.md`.
- [x] Record explicit rationale for any compatibility surface intentionally retained in this lane. Evidence: `packages/shared/streams/stdio.ts` carries the published-importer rationale, and `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md` records the narrowed retain-vs-delete decisions for broader compatibility surfaces left out of this rework pass.

## Validation
- [x] Focused tests cover the touched SDK and static UI truthfulness seams. Evidence: `npx vitest run packages/sdk-node/tests/orchestrator.exec.test.ts packages/sdk-node/tests/orchestrator.artifacts.test.ts orchestrator/tests/RlmAlignment.test.ts` passed (`21` tests), and the GC-sensitive artifact test was repeated `10` times during manual review.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `FORCE_CODEX_REVIEW=1 npm run review`, and `npm run pack:smoke` when required are completed or truthfully justified. Evidence: delegation guard passed with `4` manifests; `spec-guard` passed after refreshing stale `last_review` metadata on the 1093-1109 standalone-review spec series; `build`, `lint`, `test` (`324` files / `3310` tests), `docs:check`, and `pack:smoke` passed; `docs:freshness` still reports the pre-existing repo-wide `119`-doc stale baseline; `diff-budget` passed with the explicit CO-88 override; the executed review wrapper stalled without a usable telemetry verdict and is truthfully captured as fallback evidence instead of being overstated.
- [x] Manifest-backed standalone review plus explicit elegance review are recorded before any review handoff. Evidence: `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0-co-88-docs-review-rerun/cli/2026-04-10T00-24-41-527Z-7e610bc7/manifest.json`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/standalone-review-fallback.md`, and `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/elegance-review.md`.

## Handoff
- [x] PR attached to the issue after the fresh rework implementation is ready. Evidence: `https://github.com/Kbediako/CO/pull/403` is attached to CO-88 via the packaged `linear attach-pr` helper.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `Human Review` or `In Review` only after coding stops. Evidence: pending.
