# ACTION_PLAN - CO: Make paused CO STATUS inspection scrollback-clean

## Added by Bootstrap 2026-04-02

## Summary
- Goal: land the smallest terminal-surface change that keeps `CO STATUS` live monitoring intact while making paused inspection scrollback-clean.
- Scope: docs-first packet, alternate-screen live rendering, paused primary-buffer snapshot handoff, focused dashboard regressions, operator-doc updates, and the required validation or review gates.
- Assumptions:
  - the current defect is caused by primary-buffer redraw semantics, not by the dashboard dataset itself
  - alternate screen plus a primary-buffer pause handoff is sufficient to make paused inspection clean without reopening broader parity work
  - snapshot export and compact inspect remain part of the same dashboard surface after the change

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `pause`, `freeze`, `snapshot`, `inspect`, and `scrollback`; reject cadence-only, density-only, `/ui`-first, or “current behavior is sufficient” interpretations.
- Not done if:
  - live redraw still stacks full frames in the primary scrollback path
  - pausing still leaves the operator relying on historical redraw noise to inspect the frame
  - docs/tests fail to explain and enforce the terminal-mode contract
- Pre-implementation issue-quality review: approved. This issue is narrower than another inspectability lane and specifically targets the remaining terminal-buffer contract after `CO-55`.

## Milestones & Sequencing
1) Bootstrap docs and registry mirrors for `CO-60`
2) Run the audited docs-review child stream and fold back any packet corrections
3) Implement alternate-screen live rendering plus paused primary-buffer snapshot semantics in `controlStatusDashboard.ts`
4) Update focused tests and operator docs for the new live-vs-paused contract
5) Capture proof and run the required validation, standalone review, and elegance review before handoff

## Dependencies
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/tests/ControlStatusDashboard.test.ts`
- `README.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-60-docs-review --format json`
  - focused Vitest coverage for live alternate-screen rendering, paused primary-snapshot inspection, and paused redraw-in-place behavior
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d npm run build`
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d npm run test`
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-69030f04-cfa5-491b-8928-8f325f00da8d FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - remove the alternate-screen / pause-handoff surface logic and restore the prior primary-buffer redraw contract if the new semantics prove untruthful or unstable in focused tests
  - keep any terminal-compatibility follow-up narrow and separate instead of broadening this lane

## Risks & Mitigations
- Risk: alternate-screen behavior changes break non-interactive or custom-output paths.
  - Mitigation: gate the new behavior to interactive TTY output only and keep the previous primary-buffer path as the fallback.
- Risk: paused explicit rerenders still accumulate full-frame history.
  - Mitigation: append only the initial paused snapshot to primary scrollback, then redraw in place while paused.
- Risk: operator docs drift from the actual surface behavior.
  - Mitigation: update README and the task packet in the same change and add focused tests around the exact live-vs-paused contract.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-02
