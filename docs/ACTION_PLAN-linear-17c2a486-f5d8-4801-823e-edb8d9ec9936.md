# ACTION_PLAN - CO: Embed screenshot proof directly in Linear comments and workpads

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-61` / `17c2a486-f5d8-4801-823e-edb8d9ec9936`
- Linear URL: https://linear.app/asabeko/issue/CO-61/co-embed-screenshot-proof-directly-in-linear-comments-and-workpads

## Summary
- Goal: finish `CO-61` by letting the provider-worker upload a local screenshot artifact into Linear storage and embed the resulting image directly in the active workpad comment.
- Scope: docs-first packet, audited docs-review child stream, bounded upload-and-embed implementation in the Linear workflow facade, proof-contract wording updates, focused tests, live Linear proof, required validation, and review handoff.
- Assumptions:
  - the existing workpad helper remains the canonical proof surface for this lane
  - preserving PR attachment and external URL attachment behavior is mandatory
  - the smallest truthful implementation is server-side `fileUpload` plus markdown image rewrite rather than a broad new asset or comment platform

## Milestones & Sequencing
1. Register the docs-first packet for `linear-17c2a486-f5d8-4801-823e-edb8d9ec9936`, update `tasks/index.json`, update `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, mirror the checklist, and refresh the Linear workpad.
2. Run `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json` from the active workspace and capture the child manifest or an explicit fallback note before implementation.
3. Extend the provider Linear workflow facade with the smallest truthful upload seam:
   - negotiate a Linear signed upload URL through `fileUpload`
   - upload local screenshot bytes server-side with the returned headers
   - rewrite local markdown image references to the returned Linear `assetUrl`
   - surface proof traceability in the result and audit path
4. Update the CLI and worker-guidance wording so lanes that require screenshot proof can explicitly require `embedded directly in Linear, not only linked`.
5. Add focused facade and CLI tests, then run the required validation floor.
6. Capture a live embedded screenshot example in the Linear workpad, refresh the workpad with final status, run standalone review plus elegance review, and only then prepare PR or review handoff.

## Dependencies
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/linearGraphqlClient.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `skills/linear/SKILL.md`

## Validation
- Repo-local validation in this provider-worker workspace must strip the provider-owned `CODEX_ORCHESTRATOR_*` root/runs/out/config/package overrides so commands operate on this workspace's own `.runs/` and repo config instead of the shared control-host root.
- Checks / tests:
  - `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 node scripts/delegation-guard.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 node scripts/spec-guard.mjs --dry-run`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 npm run build`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 npm run lint`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 npm run test`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 npm run docs:check`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 npm run docs:freshness`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 node scripts/diff-budget.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 TASK=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 NOTES="Goal: CO-61 standalone review handoff | Summary: upload local screenshot refs into Linear workpad comments, surface asset URLs in audit output, and keep proof guidance bounded to direct-in-Linear screenshots | Risks: review output depends on local Codex CLI capabilities" MANIFEST="$CODEX_ORCHESTRATOR_MANIFEST_PATH" FORCE_CODEX_REVIEW=1 npm run review -- --manifest "$MANIFEST"`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-17c2a486-f5d8-4801-823e-edb8d9ec9936 npm run pack:smoke`
- Required manual proof:
  - at least one screenshot embedded directly into the active Linear workpad comment
  - helper or audit output that records the workpad comment id plus the resulting Linear asset URL
  - proof that the worker guidance distinguishes embedded-in-Linear screenshot proof from external proof URLs
- Rollback plan:
  - revert the upload resolver and wording changes together if the patch breaks existing workpad updates, changes unrelated attachment flows, or cannot deliver a visible in-Linear screenshot

## Risks & Mitigations
- Risk: upload negotiation succeeds but the signed PUT fails because required headers are missing.
  - Mitigation: copy the returned Linear upload headers verbatim onto the server-side PUT request and cover the path with focused tests.
- Risk: the implementation expands into a generic asset system.
  - Mitigation: limit accepted inputs to explicit local image references used by the workpad flow and avoid introducing a new broad attachment manager.
- Risk: repeated workpad refreshes make proof behavior ambiguous.
  - Mitigation: keep the workpad as the single proof surface for this lane and record the resulting asset URL and comment id in audit or validation artifacts.

## Approvals
- Reviewer: `codex-orchestrator docs-review (failed-other, manual fallback accepted)`
- Date: 2026-04-02
