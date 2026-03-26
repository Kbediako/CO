# Task Checklist - linear-74d145eb-305b-4b27-be84-21c248b22e4d

- MCP Task ID: `linear-74d145eb-305b-4b27-be84-21c248b22e4d`
- Primary PRD: `docs/PRD-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`
- TECH_SPEC: `tasks/specs/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`

## Docs-first
- [x] PRD drafted for the `CO-15` diff-budget recalibration lane. Evidence: `docs/PRD-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`, `docs/TECH_SPEC-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [x] `tasks/index.json` registers the `CO-15` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-15` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`. Evidence: `.agent/task/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [x] docs-review approved the `CO-15` packet for implementation. Evidence: `.runs/linear-74d145eb-305b-4b27-be84-21c248b22e4d/cli/2026-03-25T14-04-17-097Z-09437beb/manifest.json`.

## Investigation
- [x] Live Linear workflow states and current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id 74d145eb-305b-4b27-be84-21c248b22e4d`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id 74d145eb-305b-4b27-be84-21c248b22e4d --state "In Progress"`.
- [x] Baseline audit captured the current diff-budget codepath and the focused-versus-broad stacked artifact evidence required by the issue. Evidence: `out/linear-74d145eb-305b-4b27-be84-21c248b22e4d/manual/20260325T070238Z-baseline-audit.md`.
- [x] Required diff-budget, review-wrapper, CI workflow, and standalone-review docs seams were audited before implementation. Evidence: `scripts/diff-budget.mjs`, `scripts/run-review.ts`, `codex.orchestrator.json`, `.github/workflows/core-lane.yml`, `docs/standalone-review-guide.md`, `tests/diff-budget.spec.ts`.
- [x] Delegation override was explicitly recorded for this worker run because subagent spawning is unavailable in-session. Evidence: `tasks/specs/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [x] Rework audit identified the remaining actionable PR `#300` gap: unborn-repository staged line accounting in `scripts/lib/review-scope-advisory.ts` still used `git diff --cached ... HEAD`, which suppresses `changedLines` before the first commit exists. Evidence: PR `#300` unresolved thread `https://github.com/Kbediako/CO/pull/300#discussion_r2988403927`, local repro on 2026-03-25.
- [x] Rework docs-review also surfaced the sibling hard-gate bug: `scripts/diff-budget.mjs` still failed outright on unborn repositories because its cached staged diff paths also appended `HEAD`. Evidence: `.runs/linear-74d145eb-305b-4b27-be84-21c248b22e4d/cli/2026-03-25T13-58-54-207Z-15726b24/review/output.log`, local repro on 2026-03-25.

## Implementation
- [x] Recalibrate local auto diff-budget scope so stacked local runs hard-gate current-head scope while still surfacing broad aggregate scope as advisory evidence. Evidence: `scripts/diff-budget.mjs`, `tests/diff-budget.spec.ts`.
- [x] Preserve explicit base/commit/CI hard-gated behavior and align thresholds/docs with the current review large-scope policy. Evidence: `scripts/diff-budget.mjs`, `docs/standalone-review-guide.md`, `.github/workflows/core-lane.yml`.
- [x] Add focused regressions covering explicit hard scope, stacked-lane local auto mode, and output wording. Evidence: `tests/diff-budget.spec.ts`.
- [x] Keep both the hard diff-budget gate and uncommitted review-scope line accounting truthful on unborn repositories by counting staged content before the first commit exists. Evidence: `scripts/diff-budget.mjs`, `scripts/lib/review-scope-advisory.ts`, `tests/diff-budget.spec.ts`, `tests/review-scope-advisory.spec.ts`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-74d145eb-305b-4b27-be84-21c248b22e4d`. Evidence: `.runs/linear-74d145eb-305b-4b27-be84-21c248b22e4d/cli/2026-03-25T14-04-17-097Z-09437beb/manifest.json`.
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`. Evidence: local command pass on 2026-03-25 with recorded override.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: local command pass on 2026-03-25.
- [x] `npm run build`. Evidence: local command pass on 2026-03-25.
- [x] `npm run lint`. Evidence: local command pass on 2026-03-25.
- [x] `npm run test`. Evidence: sanitized local pass on 2026-03-25 via `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" CI=1 npm run test` (`295` files / `2367` tests).
- [x] `npm run docs:check`. Evidence: local command pass on 2026-03-25.
- [x] `npm run docs:freshness`. Evidence: local command pass on 2026-03-25, artifact `out/linear-74d145eb-305b-4b27-be84-21c248b22e4d/docs-freshness.json`.
- [x] `node scripts/diff-budget.mjs`. Evidence: local command pass on 2026-03-25 with `✅ Diff budget: OK (scope=working-tree, files=5/25, lines=58/1200, +54/-4)`.
- [x] `npm run review`. Evidence: local command pass on 2026-03-25, artifact `.runs/linear-74d145eb-305b-4b27-be84-21c248b22e4d/cli/2026-03-25T13-55-12-979Z-51fda3cf/review/output.log`.
- [x] `npm run pack:smoke`. Evidence: local command pass on 2026-03-25.

## Delivery
- [ ] Open PR for `CO-15`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence in PR review threads/task notes before moving to `In Review`.
- [ ] Merge the latest `origin/main` into the branch before review handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
