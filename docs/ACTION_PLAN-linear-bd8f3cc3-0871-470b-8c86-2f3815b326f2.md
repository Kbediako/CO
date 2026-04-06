# ACTION_PLAN - CO STATUS: make live attach scrolling work without accumulated full-frame history

## Added by Bootstrap 2026-04-06

## Summary
- Goal: land the smallest truthful fix set that keeps live attach on `primary scrollback`, stops accumulated full-frame history, and fixes the bounded readability/truth defects called out in `CO-97`.
- Scope: docs-first packet, audited docs-review child stream, pinned live-primary redraw semantics, bounded countdown/rate-limit/event/retry improvements, optional presenter freshness only if reproduced, focused tests, real-device proof, and normal validation/review gates.
- Assumptions: the primary defect is still the attach writer path in `controlStatusDashboard.ts`, most readability fixes can stay dashboard-local, and presenter widening should remain evidence-driven.

## Milestones
1. Bootstrap the docs packet, registry entries, task mirrors, and single workpad.
2. Run the audited docs-review child stream and fold back any packet corrections.
3. Implement the pinned live-primary attach redraw strategy without regressing launch-mode alternate-screen behavior.
4. Tighten bounded duration, rate-limit, retry, and event formatting helpers.
5. Widen into presenter freshness only if validation still reproduces stale stage/read-model truth.
6. Capture real-device proof, run the validation/review/elegance gates, and hand off only after the PR drain is clean.

## Validation
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-97-docs-review --format json`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 node scripts/delegation-guard.mjs`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 node scripts/spec-guard.mjs --dry-run`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run build`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run lint`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run test`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run docs:check`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run docs:freshness`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 node scripts/diff-budget.mjs`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 FORCE_CODEX_REVIEW=1 npm run review`
- `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run pack:smoke`

## Risks
- Alternate-screen launch mode regresses while attach-mode changes land.
- Presentation changes accidentally widen into source-truth changes.
- Proof capture leaves behind temporary sessions or windows.

## Approvals
- Reviewer: docs-review child stream clean
- Date: 2026-04-06
