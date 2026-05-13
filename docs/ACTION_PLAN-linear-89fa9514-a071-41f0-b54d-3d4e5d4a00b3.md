# ACTION_PLAN - CO: resolve weakly-owned historical reference and archive residue surfaced by repo stewardship audit

## Traceability
- Linear issue: `CO-126` / `89fa9514-a071-41f0-b54d-3d4e5d4a00b3`

## Summary
- Goal: resolve the live six-path historical residue cluster surfaced by `repo:stewardship` with the smallest truthful keep/delete decisions and local rationale anchors.
- Scope: docs-first packet, registry/checklist/workpad continuity, audited docs-review child stream, `reference/**` rationale anchors, archive JSON deletion if still orphaned, audit rerun, and the normal validation/review floor.
- Assumptions:
  - the 0956 evidence pack and mirror config example still have live retained purpose
  - the orphan archive JSON should be deleted unless new references appear

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `reference/**`
  - `archives/**`
  - `retain_with_rationale`
  - `local README/rationale anchor`
  - `repo:stewardship`
- Not done if:
  - the current six-path residue cluster is not resolved explicitly
  - a retained subtree still lacks a local anchor
  - the rerun audit still reports the targeted residue as unexplained `update`
- Pre-implementation issue-quality review:
  - the lane is correctly scoped to current residue truth; no audit redesign or unrelated historical cleanup is justified

## Milestones & Sequencing
1. Create the `CO-126` docs-first packet, update `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and mirror the active workpad source locally.
2. Run an audited `docs-review` child stream and record its manifest or truthful fallback before implementation continues.
3. Add the root-level and subtree-local `reference/**` rationale anchors, delete `archives/REPORT.mcp_code_mode.json` if still unreferenced, and keep the diff bounded to the residue cluster.
4. Rerun the stewardship audit with explicit artifact paths, refresh the workpad, and complete the full validation/review floor if the diff remains non-trivial.

## Dependencies
- `docs/repo-stewardship-catalog.json`
- `scripts/repo-stewardship-audit.mjs`
- `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`
- `docs/guides/pixel-perfect-local-clones.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run repo:stewardship`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 node scripts/repo-stewardship-audit.mjs --report out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/repo-stewardship.json --summary-markdown out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/repo-stewardship.md`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - restore the deleted archive JSON only if new live references appear during implementation
  - drop any new README anchor that turns out not to be needed after the rerun audit

## Risks & Mitigations
- Risk: the audit surfaces another out-of-scope historical path while this lane is in progress.
  - Mitigation: keep this lane bounded to the current six-path cluster and create a follow-up only if a genuinely new cluster appears.
- Risk: retention rationale becomes speculative instead of tied to live references.
  - Mitigation: cite the current spec/guide consumers directly in the local README anchors.
- Risk: deleting the archive JSON breaks a hidden consumer.
  - Mitigation: re-run repo search before deletion and stop if new usage appears.

## Approvals
- Reviewer: pending
- Date: 2026-04-11
