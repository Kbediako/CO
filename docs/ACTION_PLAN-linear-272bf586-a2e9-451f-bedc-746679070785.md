# ACTION_PLAN - CO Bring CO STATUS to True Symphony Terminal Parity

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-44` / `272bf586-a2e9-451f-bedc-746679070785`
- Linear URL: https://linear.app/asabeko/issue/CO-44/co-bring-co-status-to-true-symphony-terminal-parity

## Summary
- Goal: finish `CO-44` by correcting `CO STATUS` from a plain-text live report into a Symphony-parity terminal dashboard while keeping CO's existing observability truth path.
- Scope: docs-first packet, audited docs-review child stream, renderer/state updates in `controlStatusDashboard.ts`, bounded startup wiring in `controlHostCliShell.ts`, focused full-frame tests, and standard validation/review handoff.
- Assumptions:
  - the current operator dashboard dataset remains the authoritative CO read seam for this lane
  - terminal parity should favor Symphony's scanability over preserving the existing CO-only `ISSUES` prose block
  - any missing Symphony data point that cannot be sourced cheaply must be called out as an explicit deviation in docs and workpad notes

## Milestones & Sequencing
1. Register the docs-first packet for `linear-272bf586-a2e9-451f-bedc-746679070785`, update `tasks/index.json`, update `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, mirror the checklist, and refresh the Linear workpad.
2. Run `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json` from the active workspace and capture the child manifest or explicit fallback note before implementation. This issue-worker lane intentionally uses the shared packaged CLI entrypoint mandated by the provider-worker prompt instead of a workspace-local build artifact.
3. Replace the current prose dashboard renderer with a Symphony-style frame, summary lines, running table, backoff queue, throughput calculation, and explicit width-band behavior.
4. Keep `controlHostCliShell.ts` gated to interactive text-mode startup while preserving JSON and non-TTY behavior.
5. Add focused renderer/startup tests with full-frame coverage and run the required validation floor.
6. Run standalone review, address findings, run an explicit elegance/minimality pass, and only then prepare PR and review handoff artifacts.

## Dependencies
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- `orchestrator/tests/ControlHostCliShell.test.ts`
- Symphony references:
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir.ex`
  - `/Users/kbediako/Code/symphony/elixir/test/fixtures/status_dashboard_snapshots/`
  - `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/status_dashboard_snapshot_test.exs`

## Validation
- Checks / tests:
  - `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json` (intentional shared packaged CLI entrypoint required by the provider-worker lane)
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the renderer and startup changes together if the new frame breaks JSON/non-TTY behavior or fails to stay grounded in the shared dataset seam
  - do not hand off to review until the renderer either reaches the planned parity bar or the remaining documented deviations are explicit and justified

## Risks & Mitigations
- Risk: the renderer claims parity while quietly keeping material CO-only layout differences.
  - Mitigation: document the intended Symphony baseline in the spec, add frame-level tests, and record each remaining deviation explicitly.
- Risk: width-aware rendering becomes brittle and unreadable on narrow terminals.
  - Mitigation: implement explicit width bands with tested fallbacks instead of only truncating every field.
- Risk: a new throughput/header layer starts depending on non-authoritative state.
  - Mitigation: limit renderer-local state to display cadence / token-sample calculation and keep business truth in the existing dataset.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-03-30
