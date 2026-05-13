# ACTION_PLAN - CO Add Terminal Observability Dashboard as CO STATUS

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-26` / `a861c0fe-0db2-4c2b-a62a-c2010b5cbed6`
- Linear URL: https://linear.app/asabeko/issue/CO-26/co-add-terminal-observability-dashboard-as-co-status

## Summary
- Goal: finish Linear issue `CO-26` by adding a terminal-first `CO STATUS` dashboard to the live control-host runtime without reopening the already-landed web/operator-dashboard truth path.
- Scope: docs-first packet, audited docs-review child stream, one control-host terminal renderer over the existing operator dashboard dataset, focused tests, required validation, and normal review handoff.
- Assumptions:
  - `control-host` is the relevant CO process for this operator surface because it owns the live provider intake + oversight runtime already feeding `/ui`
  - `CO-7` already landed the shared operator dashboard presenter, poll-health surfacing, and `/ui` consumer, so this lane should stay terminal-only
  - the provider-worker lane can use the sanctioned `linear child-stream` helper, so docs-review should be captured as delegated evidence instead of a blanket override

## Milestones & Sequencing
1. Register the docs-first packet for `linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6`, update `tasks/index.json`, update `docs/TASKS.md`, mirror the checklist, and refresh the single Linear workpad.
2. Run `node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --format json` from the active workspace checkout and capture the returned child manifest in the docs packet before implementation.
3. Add a bounded terminal dashboard helper that renders the existing operator dashboard dataset as a `CO STATUS` terminal frame with summary, queue, and issue/session sections.
4. Wire `controlHostCliShell.ts` to start and stop that dashboard only for interactive text-mode usage, while preserving JSON and non-TTY behavior.
5. Add focused tests for renderer output, startup gating, and JSON/non-TTY preservation, then run the required validation floor.
6. Run standalone review, address findings, run an explicit elegance/minimality pass, and only then prepare PR/review handoff artifacts.

## Dependencies
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/tests/ControlHostCliShell.test.ts`
- Symphony references:
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/test/fixtures/status_dashboard_snapshots/`

## Validation
- Checks / tests:
  - `node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --format json`
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
  - revert the terminal renderer and control-host wiring together if the patch pollutes non-interactive output or drifts away from the shared presenter/read-model seam
  - keep the issue active and do not hand off to review until interactive dashboard output and machine-readable modes are both truthful

## Risks & Mitigations
- Risk: the terminal dashboard duplicates or drifts from `/ui` truth.
  - Mitigation: render `OperatorDashboardDataset` directly instead of deriving a new terminal-only state model.
- Risk: ANSI clear/home output breaks non-interactive automation or JSON consumers.
  - Mitigation: gate live dashboard rendering to interactive text-mode TTY usage and preserve the existing JSON readiness path.
- Risk: issue rows become unreadable in narrow terminals.
  - Mitigation: keep the renderer ASCII-first, width-aware, and truncate long fields instead of widening scope into a full TUI framework.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-03-30
