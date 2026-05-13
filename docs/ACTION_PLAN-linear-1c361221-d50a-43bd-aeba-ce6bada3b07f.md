# ACTION_PLAN - CO: Add a bounded macOS screenshot-proof capture path without external helper dependencies

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-105` / `1c361221-d50a-43bd-aeba-ce6bada3b07f`
- Linear URL: https://linear.app/asabeko/issue/CO-105/co-add-a-bounded-macos-screenshot-proof-capture-path-without-external

## Summary
- Goal: land the smallest truthful macOS screenshot capture helper that CO owns in-repo, using built-in tools only, while keeping `runtime-proof` reviewer URLs and `upsert-workpad` image embedding as separate seams.
- Scope: docs-first packet, audited docs-review child stream, bounded screenshot-proof helper implementation, worker/skill/help updates, focused tests, real host capture plus direct Linear embed, required validation, and review-handoff prep.
- Assumptions:
  - the current upload/embed seam in `providerLinearWorkflowFacade.ts` remains correct and should not be rewritten
  - the current reviewer-link contract in `providerLinearRuntimeProof.ts` remains correct and should not be widened
  - the new helper only needs one bounded default macOS path in this slice

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `repo-owned macOS screenshot-proof capture`, `runtime-proof`, `upsert-workpad`, `file:///absolute/path/to/proof.png`, `macOS screencapture`, and `AppleScript / osascript cleanup`
  - reject reopening `CO-61` or `CO-8` as if they already solved local capture
  - reject external/local Swift helper dependency as the default CO contract
- Not done if:
  - capture still depends on the off-repo Swift helper
  - the only documented fallback remains raw manual `screencapture`
  - capture and upload failures are still conflated
  - helper-opened proof surfaces can remain behind without truthful cleanup status
- Pre-implementation issue-quality review:
  - approved as one bounded helper lane over the existing proof seams, not a generic media-tooling or cross-platform capture project

## Milestones & Sequencing
1. Register the docs-first packet for `linear-1c361221-d50a-43bd-aeba-ce6bada3b07f`, update `tasks/index.json`, update `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, mirror the checklist, and refresh the single active Linear workpad.
2. Run `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-105-docs-review --format json` from the active workspace and record the child manifest or truthful fallback before implementation.
3. Add the bounded screenshot capture seam:
   - create `providerLinearScreenshotProof.ts`
   - add `linear screenshot-proof` CLI routing and help text
   - add audit wiring for the new operation
   - update worker and skill guidance so capture, reviewer-link handoff, and local-image embed are clearly separated
4. Add focused tests for command shaping and failure classification.
5. Run the required validation floor, then capture one real screenshot on this host with the new helper and embed it directly in the CO-105 workpad.
6. Run standalone review and an explicit elegance pass before any review handoff activity.

## Dependencies
- `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- focused new screenshot-proof tests
- `skills/linear/SKILL.md`

## Validation
- Repo-local validation in this provider-worker workspace must strip provider-owned `CODEX_ORCHESTRATOR_*` root/runs/out/config/package overrides so commands operate on this workspace’s own `.runs/` and repo config instead of the shared control-host root.
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-105-docs-review --format json`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f node scripts/delegation-guard.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f node scripts/spec-guard.mjs --dry-run`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run build`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run lint`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run test`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run docs:check`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run docs:freshness`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f node scripts/diff-budget.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f TASK=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f NOTES="Goal: CO-105 standalone review handoff | Summary: add a built-in macOS screenshot-proof helper and keep capture separate from reviewer-link/runtime-proof and upload/embed seams | Risks: macOS permission behavior and cleanup classification must stay truthful" MANIFEST="$CODEX_ORCHESTRATOR_MANIFEST_PATH" FORCE_CODEX_REVIEW=1 npm run review -- --manifest "$MANIFEST"`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run pack:smoke`
- Required manual proof:
  - at least one real screenshot captured via the new helper on this host
  - the captured screenshot embedded directly into the active CO-105 workpad
  - explicit validation notes covering Screen Recording failure reporting, Automation failure reporting, unreadable output handling, and cleanup failure or skip handling
- Rollback plan:
  - revert the new helper and guidance together if the path cannot produce a truthful local artifact, cannot distinguish failure classes, or regresses existing Linear helper surfaces

## Risks & Mitigations
- Risk: macOS permission behavior is environment-specific and brittle.
  - Mitigation: keep the runtime contract explicit, capture structured stderr/stdout when commands fail, and cover the classification logic with focused tests plus host-manual validation.
- Risk: the lane broadens into generic window-management or cross-platform media tooling.
  - Mitigation: keep the default helper bounded to one macOS capture path and file a follow-up if richer target-selection behavior is needed later.
- Risk: cleanup behavior is misleading when no temporary proof surface was opened.
  - Mitigation: represent cleanup skip as an explicit truthful status rather than pretending cleanup succeeded.

## Approvals
- Reviewer: pending docs-review child stream.
- Date: 2026-04-08
