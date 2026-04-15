# Task Checklist - linear-34b60caa-258b-4f18-8d67-cdad3f6352cf

- Linear Issue: `CO-192` / `34b60caa-258b-4f18-8d67-cdad3f6352cf`
- MCP Task ID: `linear-34b60caa-258b-4f18-8d67-cdad3f6352cf`
- Primary PRD: `docs/PRD-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- TECH_SPEC: `tasks/specs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- Shared source 0 anchor: `ctx:sha256:4988a9186e7944a1d681ff5093420160eb74c672f2c5a221f19b80c33cae1199#chunk:c000001`

## Docs-First
- [x] PRD drafted for stale `in_progress` provider rows losing to released terminal no-live-worker truth. Evidence: `docs/PRD-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`.
- [x] TECH_SPEC drafted with status projection precedence, `CO-182` preservation, `CO-189` preservation, and parent-owned implementation boundaries. Evidence: `tasks/specs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused validation, and patch export. Evidence: `docs/ACTION_PLAN-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md` readiness gate.
- [x] Registry and mirrors updated inside this child-lane scope: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, docs TECH_SPEC mirror, and `.agent/task` mirror. Evidence: those files.

## Child-Lane Scope
- [x] Child lane stayed within the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist.
- [x] Child lane did not run full repo validation suites. Evidence: this checklist.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [x] Released/not-active provider-intake row with `issue_state_type: completed`, dead worker PID, merged PR, and no live same-issue worker is non-active for `co-status --format json`. Evidence: `orchestrator/tests/ControlRuntime.test.ts` stale `CO-183` regression and live smoke excluding `CO-183`.
- [x] Stale `in_progress` manifests/proofs do not restore the row to `counts.issues`, `counts.running`, active `issues[]`, or active-looking `provider_debug_snapshot.claim`. Evidence: `orchestrator/src/cli/control/controlRuntime.ts` inactive bound-claim veto plus `orchestrator/src/cli/control/compatibilityIssuePresenter.ts` stale terminal selected suppression.
- [x] Historical manifests/proofs remain inspectable after active projection pruning. Evidence: regression keeps `readSelectedRunSnapshot()` audit proof visible while active projection is empty.
- [x] `CO-182` terminal-release pruning remains covered. Evidence: focused regression slice includes existing terminal released completed coverage.
- [x] `CO-189` released-pending-reopen live same-issue worker visibility remains covered. Evidence: focused regression slice includes pending-reopen live worker coverage.
- [x] Parent validates with the issue command `co-status --format json`. Evidence: live smoke selected `CO-192`, listed `CO-192`, `CO-191`, `CO-193`, and `has_CO_183=false`.

## Validation
- [x] Child lane scoped docs/JSON parse checks after packet creation. Evidence: scoped Node reference check and `git diff --check` on the touched registry/mirror files.
- [x] Parent focused status projection regression passes after implementation. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ControlRuntime.test.ts -t "prunes stale in-progress|keeps selected in-progress|prunes terminal released completed|keeps released pending-reopen"` passed.
- [x] Parent focused `CO-182` terminal-release pruning regression passes after implementation. Evidence: same focused regression slice passed.
- [x] Parent focused `CO-189` live same-issue worker regression passes after implementation. Evidence: same focused regression slice passed.
- [x] `node scripts/spec-guard.mjs --dry-run` after docs packet and implementation. Evidence: guard passed.
- [x] Parent required validation/review/elegance gates before PR creation. Evidence: delegation/spec/diff guards, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, live `co-status` smoke, manifest-backed review `bounded-success` at `.runs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf/cli/2026-04-15T15-13-39-658Z-5e7c3046/review/telemetry.json`, and manual elegance pass all completed.

## Handoff
- [x] Parent lane accepts or adjusts this patch, then continues owning Linear workpad, runtime implementation, validation, PR lifecycle, and review-state transition.

## Progress Log
- 2026-04-15: Bounded same-issue child lane prepared the `CO-192` docs-first packet and registry mirrors only. The packet preserves protected terms: `CO STATUS`, `co-status --format json`, `provider-intake-state.json`, `provider_issue_released:not_active`, `provider_issue_released_pending_reopen`, `issue_state_type: completed`, `in_progress`, dead worker PID, merged PR, `counts.issues`, `counts.running`, `issues[]`, and `provider_debug_snapshot.claim`.
- 2026-04-16: Parent lane accepted the docs packet, implemented bound inactive-claim precedence for selected active classification, suppressed stale terminal selected payloads only after completed merge closeout evidence, added CO-192/CO-182/CO-189 regression coverage, and completed required validation/review/elegance gates.
