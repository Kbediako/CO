# ACTION_PLAN - CO: Automate docs truthfulness and relevance across README, shipped skills, and agent-facing docs

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-75` / `27ac1e64-d88c-4add-b2f4-f4908cb63e80`
- Linear URL: https://linear.app/asabeko/issue/CO-75/co-automate-docs-truthfulness-and-relevance-across-readme-shipped

## Summary
- Goal: land a durable docs catalog plus deterministic truthfulness checks and reporting so front-door and shipped docs cannot silently drift again.
- Scope: docs-first packet, child docs-review, shared catalog helpers/config, blocking `docs:check` truthfulness rules, class-separated `docs:freshness` report, weekly artifact workflow, bounded README/shipped-doc alignment, and full validation/review handoff.
- Assumptions:
  - the smallest truthful implementation extends the current docs gates instead of inventing new parallel commands
  - README remains the package front door, while `docs/README.md` stays the deeper repository guide
  - task packets, mirrors, and archives should stay visible via class grouping rather than being removed

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs truthfulness and relevance`
  - `front-door docs`
  - `shipped skills`
  - `agent-facing docs`
  - `class-separated drift report`
- Not done if:
  - the new gate does not block stale posture, roster drift, and README budget drift
  - the weekly report is still flat or dominated by task packets
- Pre-implementation issue-quality review:
  - completed during docs-first setup. The lane must cover catalog, gate, report, workflow, and bounded doc alignment together; stopping at one of those would leave the issue materially unfinished.

## Milestones & Sequencing
1. Register the docs-first packet for `linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80`, update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`, mirror the task checklist, and refresh the Linear workpad.
2. Rerun `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review` so the task has audited pre-implementation review evidence.
3. Add the docs catalog/config and shared helper logic for class resolution, posture policy, README budget, and bundled-skill roster parity.
4. Extend `scripts/docs-hygiene.ts` with blocking truthfulness checks and add focused tests.
5. Extend `scripts/docs-freshness.mjs` with class-separated reporting and add focused tests.
6. Add the weekly workflow artifact path and align README plus any stale shipped/agent-facing docs so the new gate passes truthfully.
7. Run the required validation floor, then run standalone review followed by an explicit elegance pass before any PR or review handoff.

## Dependencies
- `scripts/docs-hygiene.ts`
- `scripts/docs-freshness.mjs`
- `scripts/lib/docs-helpers.js`
- new docs catalog helper(s)
- `README.md`
- `docs/README.md`
- `AGENTS.md`
- `docs/AGENTS.md`
- `skills/delegation-usage/SKILL.md`
- `skills/delegation-usage/DELEGATION_GUIDE.md`
- `templates/codex/AGENTS.md`
- `.github/workflows/*`
- `tests/docs-hygiene.spec.ts`
- new docs-freshness or docs-catalog tests

## Validation
- Checks / tests:
  - `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 node scripts/delegation-guard.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 node scripts/spec-guard.mjs --dry-run`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 npm run build`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 npm run lint`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 npm run test`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 npm run docs:check`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 npm run docs:freshness`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 node scripts/diff-budget.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 TASK=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 NOTES="Goal: CO-75 standalone review handoff | Summary: add docs catalog plus blocking truthfulness gate, class-separated docs report, weekly artifact workflow, and bounded front-door/shipped-doc alignment | Risks: README budget and roster parity may expose nearby doc drift" FORCE_CODEX_REVIEW=1 npm run review -- --manifest \"$CODEX_ORCHESTRATOR_MANIFEST_PATH\"`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80 npm run pack:smoke`
- Required manual proof:
  - staged diffs show README posture/roster updates and a reduced front-door scope
  - focused tests prove the new gate fails on seeded stale posture, README budget overflow, and roster divergence
  - weekly workflow definition uploads the class-separated report artifact
- Rollback plan:
  - revert the new docs truthfulness/catalog/reporting changes together if they create noisy or non-deterministic failures, and record the blocker as a follow-up instead of weakening the gate

## Risks & Mitigations
- Risk: classifying the whole repo manually becomes unmaintainable.
  - Mitigation: explicit entries for high-signal docs plus pattern rules for packets, mirrors, and archives.
- Risk: the README budget gate fails immediately on the current tree.
  - Mitigation: make a bounded front-door trim in the same lane rather than setting a meaningless budget.
- Risk: bundled-skill parity is ambiguous if the canonical doc source is unclear.
  - Mitigation: pick one user-facing roster source in the same lane and make the gate enforce that source explicitly.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-03
