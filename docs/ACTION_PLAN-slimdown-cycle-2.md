# Action Plan - Slimdown Refactor Cycle 2 (Task 0102-slimdown-cycle-2)

## Status Snapshot
- [ ] Phase 0 - Kickoff + inventory + baseline evidence
  - [ ] diagnostics manifest
  - [ ] docs-review manifest
  - [ ] subagent inventory manifest
  - [ ] frontend-testing manifest (if pipelines/workflows/packaging touched)
  - [ ] baseline pack file list
  - [ ] baseline required check contexts (workflow file path + workflow name + job ids/names + context string)
  - [ ] freshness registry updated
  - [ ] mirrors updated (docs/TASKS + tasks/ + .agent/task)
- Approvals / Escalations: record in `tasks/index.json` when maintainer sign-off is required (e.g., workflow deletions with rare triggers or pipeline ID aliasing).

## Milestones & Tasks
1. Phase 0 - Kickoff + inventory + baseline evidence
   - Draft PRD/TECH_SPEC/ACTION_PLAN/task checklists.
   - Run baseline manifests with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2` (diagnostics, docs-review; optional implementation-gate).
   - Run `codex-orchestrator start frontend-testing --format json` when touching pipelines/workflows/packaging; record manifest.
   - Spawn subagent inventory run (`MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2-inventory npx codex-orchestrator start diagnostics --format json`) and capture manifest evidence.
   - Capture baseline `npm pack --dry-run` file list (record in task evidence).
   - Confirm clean worktree before evidence capture (`git status --porcelain` empty).
   - Capture baseline required check contexts (workflow file path + workflow `name:` + job ids/names + context string) from branch protection or a recent run; record in task evidence.
   - Record inventory evidence for candidate deletions (rg summary + `.runs/**` scan).
   - Update `docs/docs-freshness-registry.json` with current review dates.
   - Mirror task status updates in `docs/TASKS.md`, `tasks/tasks-0102-slimdown-cycle-2.md`, and `.agent/task/0102-slimdown-cycle-2.md` once manifests exist.
2. Phase 1 - Dead surface pruning (safe deletions)
   - Remove 1-3 items with proof requirements by artifact type (pipelines/scripts = 2-part; workflows = 3-part with required-check confirmation).
   - Update docs and references in the same PR.
   - Run guardrail chain (see Guardrail Chain section), then run `codex-orchestrator start diagnostics --format json` (and `codex-orchestrator start docs-review --format json` if docs changed) with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2`, recording manifests in the Evidence Log.
   - If pipelines/workflows/packaging are touched, run `codex-orchestrator start frontend-testing --format json` post-change and record the manifest.
3. Phase 2 - Indirection cleanup (barrels/shims)
   - Remove one low-fan-in barrel per PR.
   - Confirm barrel/shim is not part of published entrypoints/exports (package.json exports/bin + documented import paths); record proof.
   - Update imports mechanically; no formatting churn.
   - Run guardrail chain (see Guardrail Chain section), then run `codex-orchestrator start diagnostics --format json` (and `codex-orchestrator start docs-review --format json` if docs changed) with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2`, recording manifests in the Evidence Log.
4. Phase 3 - CLI scaffolding consolidation (internal only)
   - Add characterization tests for CLI output in a separate PR (net-positive allowed).
   - Extract one helper at a time in a follow-up PR (must be net-negative); preserve output strings.
   - Run guardrail chain (see Guardrail Chain section), then run `codex-orchestrator start diagnostics --format json` (and `codex-orchestrator start docs-review --format json` if docs changed) with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2`, recording manifests in the Evidence Log.
5. Phase 4 - Packaging + workflow contraction
   - Execute as two PRs unless trivially small: 4a packaging allowlist/pack smoke, 4b workflow refactor/reuse.
   - Tighten package allowlists; validate pack smoke + before/after pack list diff with justified removals.
   - Consolidate workflow setup into reusable workflows with stable wrappers; verify trigger/permissions parity and required check contexts (workflow name + job display names, preserving job ids/explicit names) and preserve workflow interface contracts (`workflow_dispatch` inputs + `workflow_call` inputs/secrets/outputs) or provide wrapper translation.
   - Verify required check contexts unchanged post-change (compare baseline context strings to a post-change run or maintainer-provided list).
   - Run guardrail chain (see Guardrail Chain section), then run `codex-orchestrator start diagnostics --format json` (and `codex-orchestrator start docs-review --format json` if docs changed) with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2`, recording manifests in the Evidence Log.
   - If pipelines/workflows/packaging are touched, run `codex-orchestrator start frontend-testing --format json` post-change and record the manifest.

## Guardrail Chain (required for code changes)
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`

## Risks & Mitigations
- Deleting live tooling.
  - Mitigation: proof requirements by artifact type (workflows require 3-part) + alias window for public-ish IDs.
- CLI output drift.
  - Mitigation: characterization tests; no string edits.
- Packaging regressions.
  - Mitigation: pack smoke tests in a clean worktree.

## Next Review
- Date: TBD
- Agenda: confirm Phase 0 evidence and inventory list before deletions.
