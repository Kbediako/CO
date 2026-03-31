# ACTION_PLAN - CO: Make CO STATUS inspectable in smaller terminals and easy to launch

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-55` / `cd3020f3-b6be-4adb-ae00-1a15497de036`
- Linear URL: https://linear.app/asabeko/issue/CO-55/co-make-co-status-inspectable-in-smaller-terminals-and-easy-to-launch

## Summary
- Goal: finish `CO-55` by making the existing live `CO STATUS` dashboard intentionally inspectable in active operator use and by giving it a simple dedicated launch surface.
- Scope: docs-first packet, audited docs-review child stream, additive dashboard interaction state in `controlStatusDashboard.ts`, `co-status` launch alias wiring, focused tests, required validation, and review handoff.
- Assumptions:
  - `CO-44` remains the authoritative baseline for full-frame layout, width-aware running rows, and live redraw cadence
  - this lane should add operator controls and launch affordances rather than reopen general terminal parity
  - the smallest useful shorter-terminal path is an explicit compact inspect mode focused on the existing summary/header block

## Milestones & Sequencing
1. Register the docs-first packet for `linear-cd3020f3-b6be-4adb-ae00-1a15497de036`, update `tasks/index.json`, update `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, mirror the checklist, and refresh the Linear workpad.
2. Run `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json` from the active workspace and capture the child manifest or explicit fallback note before implementation.
3. Extend `controlStatusDashboard.ts` with the smallest truthful interaction model:
   - frozen-mode redraw suppression
   - compact inspect mode for short terminals
   - stable snapshot export under the host run directory
   - clear in-terminal control affordances
4. Add a dedicated `co-status` launch alias through `bin/codex-orchestrator.ts`, and update repo-facing help/docs surface to teach that easier monitoring entrypoint. Add a repo-local npm alias only if it stays a cheap additive follow-through.
5. Add focused renderer/interaction/launch-path tests and gather manual screenshot-proof artifacts for the required review states.
6. Run standalone review, address findings, run an explicit elegance/minimality pass, and only then prepare PR and review handoff artifacts.

## Dependencies
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/tests/ControlStatusDashboard.test.ts`
- `orchestrator/tests/ControlHostCliShell.test.ts`
- `bin/codex-orchestrator.ts`
- `package.json`
- `README.md`
- Symphony references:
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/cli.ex`

## Validation
- Repo-local validation in this provider-worker workspace must strip the provider-owned `CODEX_ORCHESTRATOR_*` root/runs/out/config/package overrides so commands operate on this workspace's own `.runs/` + `codex.orchestrator.json` instead of the shared control-host root.
- Checks / tests:
  - `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 node scripts/delegation-guard.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 node scripts/spec-guard.mjs --dry-run`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 npm run build`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 npm run lint`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 npm run test`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 npm run docs:check`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 npm run docs:freshness`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 node scripts/diff-budget.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 FORCE_CODEX_REVIEW=1 npm run review`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-cd3020f3-b6be-4adb-ae00-1a15497de036 npm run pack:smoke`
- Required manual proof:
  - screenshot of normal live mode
  - screenshot of paused/frozen mode with redraw suppression visible
  - screenshot of the constrained-height or compact inspect path
  - screenshot or equivalent proof of the snapshot/export artifact path in operator use
  - proof of the dedicated launch surface (`co-status` command and any shipped additive alias)
- Rollback plan:
  - revert the dashboard interaction and launch-alias changes together if the patch breaks JSON/non-TTY behavior, leaves redraw suppression leaky, or adds a larger runtime surface than the current lane warrants

## Risks & Mitigations
- Risk: pause/freeze mode still leaks timer or runtime-triggered redraws.
  - Mitigation: cache the last frame, buffer update intent while paused, and add explicit tests that timer/runtime updates do not write during the frozen state.
- Risk: short-terminal handling becomes another broad layout rewrite.
  - Mitigation: keep the default live frame intact and implement an explicit compact inspect mode rather than reworking all width/height behavior.
- Risk: snapshot export creates an unclear operator contract or unsafe artifact path.
  - Mitigation: write snapshots only beneath the active host run directory, report the path in-dashboard, and document the resulting inspection flow directly.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-03-31
