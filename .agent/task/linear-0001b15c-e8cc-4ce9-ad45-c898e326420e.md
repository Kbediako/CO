# Task Checklist - linear-0001b15c-e8cc-4ce9-ad45-c898e326420e

- Linear Issue: `CO-107` / `0001b15c-e8cc-4ce9-ad45-c898e326420e`
- MCP Task ID: `linear-0001b15c-e8cc-4ce9-ad45-c898e326420e`
- Primary PRD: `docs/PRD-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`
- Task Spec: `tasks/specs/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` were drafted or refreshed for `CO-107`. Evidence: bootstrap packet created in the current workspace on 2026-04-08.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`.
- [x] Docs-review delegation evidence is captured, and the rerun baseline failure is recorded truthfully as fallback rather than as a packet-shape blocker. Evidence: `/Users/kbediako/Code/CO/.workspaces/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/.runs/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e-docs-review/cli/2026-04-07T14-44-58-689Z-5944f158/manifest.json`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T144500Z-docs-review-fallback.md`.

## Implementation
- [x] `CO STATUS` header `Agents` renders `running/max_allowed` instead of `running/tracked`. Evidence: `orchestrator/src/cli/control/controlStatusDashboard.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/01-live-frame-a.png`.
- [x] `max_allowed` is sourced from the same live provider concurrency contract used for admission (`max_concurrent_agents`). Evidence: `orchestrator/src/cli/control/providerAgentCapacity.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/operatorDashboardPresenter.ts`, `orchestrator/tests/ControlRuntime.test.ts`.
- [x] Header `Runtime`, row `AGE / TURN`, and relative event-age text advance locally every second during cached-frame monitoring. Evidence: `orchestrator/src/cli/control/controlStatusDashboard.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/01-live-frame-a.png`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/02-live-frame-b.png`.
- [x] Running `EVENT` is promoted upstream into message-first authoritative `display_event` output, with generic fallback text only when richer authoritative text is absent. Evidence: `orchestrator/src/cli/control/controlStatusDashboard.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/00-proof-index.md`.
- [x] Focused regression coverage locks the denominator mapping, live ticking behavior, and message-first `EVENT` contract. Evidence: `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`.

## Validation
- [x] Proof records the current-main audit truth and the exact Symphony mapping for denominator, live ticking, and event semantics. Evidence: `docs/PRD-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`, `docs/TECH_SPEC-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`, `tasks/specs/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/00-proof-index.md`.
- [x] Renderer output plus live payload cross-checks confirm the displayed `Agents`, `Runtime`, `AGE / TURN`, and `EVENT` match authoritative projected values. Evidence: `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/co-status-proof-viewer.mjs`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/01-live-frame-a.png`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/02-live-frame-b.png`.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` all pass on the branch head or record truthful existing-baseline fallback. Evidence: `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T152906Z-review-fallback.md`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T152906Z-workpad.md`.
- [x] Manifest-backed standalone review runs before handoff, and an explicit elegance/minimality pass is recorded after findings are addressed. Evidence: `.runs/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e-docs-review/cli/2026-04-07T14-44-58-689Z-5944f158/review/telemetry.json`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T152906Z-review-fallback.md`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T152906Z-elegance-review.md`.
- [x] Real screenshot proof from this device is embedded directly in the single Linear workpad before review handoff. Evidence: Linear workpad comment `e7384fba-b111-415e-8820-68f2bffe72a6`, `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T153442Z-closeout-proof/00-proof-index.md`.

## Handoff
- [x] The issue is in the live team started state and exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear transition to `In Progress`; Linear workpad comment `e7384fba-b111-415e-8820-68f2bffe72a6`.
- [x] A PR is attached before any review-state handoff. Evidence: PR `#377`.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
