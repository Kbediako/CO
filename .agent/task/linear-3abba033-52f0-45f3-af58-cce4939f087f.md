# Task Checklist - linear-3abba033-52f0-45f3-af58-cce4939f087f

- Linear Issue: `CO-480` / `3abba033-52f0-45f3-af58-cce4939f087f`
- MCP Task ID: `linear-3abba033-52f0-45f3-af58-cce4939f087f`
- Primary PRD: `docs/PRD-linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- Canonical TECH_SPEC: `tasks/specs/linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3abba033-52f0-45f3-af58-cce4939f087f.md`

## Docs-First Packet
- [x] PRD drafted for CO-480 MultiAgentV2 0.128 cap audit.
- [x] TECH_SPEC mirror drafted with protected terms, parity matrix, fallback decision, and validation plan.
- [x] Canonical task spec drafted.
- [x] ACTION_PLAN drafted.
- [x] Checklist mirrored to `.agent/task`.
- [x] Registry and task snapshot updated for backlog promotion traceability.

## Scope Guardrails
- [x] Protected terms preserved: Codex CLI 0.128, MultiAgentV2, `features.multi_agent_v2=true`, `agents.max_threads`, `features.multi_agent_v2.max_concurrent_threads_per_session`, CO-354, CO-466, doctor/default/init behavior.
- [x] Non-goals recorded: no model posture, workflow pin, cloud-canary, release, or broad delegation changes.
- [x] Stable multi-agent behavior preserved as an explicit requirement.

## Implementation Acceptance
- [x] Document the 0.128 v2-specific cap surface, including persisted `multi_agent_v2.max_concurrent_threads_per_session` and CLI/probe evidence at `features.multi_agent_v2.max_concurrent_threads_per_session`. Evidence: `docs/guides/rlm-recursion-v2.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`.
- [x] Preserve and test rejection/omission of `agents.max_threads` when `features.multi_agent_v2=true`. Evidence: `orchestrator/src/cli/doctor.ts`, `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/CodexDefaultsSetup.test.ts`.
- [x] Update doctor/default/init behavior, or explicitly classify the v2-specific cap as user-owned with actionable doctor guidance. Evidence: doctor `multi_agent_v2_thread_cap` classification and guidance.
- [x] Add focused tests or command probes for rejected old path and accepted new path. Evidence: focused vitest pass plus live command probes showing old path rejected and new path accepted on the installed Codex CLI.
- [x] Keep stable `features.multi_agent=true` `[agents] max_threads = 12` guidance intact. Evidence: stable-path tests unchanged and docs preserve the stable baseline.

## Validation
- [x] Packet branch created from current `origin/main` on 2026-05-13.
- [x] Packet-only validation on 2026-05-13: `npm run docs:check` passed and `node scripts/diff-budget.mjs` passed for the working-tree scope.
- [x] Repo-wide blocker evidence preserved on 2026-05-13: `node scripts/spec-guard.mjs --dry-run` still reports unrelated stale fallback-expiry metadata for CO-522 packet rows plus unrelated April 12 stale specs, and `npm run docs:freshness` still reports the existing repo-wide stale-doc baseline (`747` stale rows); this packet branch does not weaken either gate.
- [x] Docs-review before implementation attempted; `docs:check` passed and `docs:freshness` preserved the unrelated repo-wide stale-doc baseline.
- [x] Delegation-evidence gate: spawned same-issue child lane with `MCP_RUNNER_TASK_ID=linear-3abba033-52f0-45f3-af58-cce4939f087f-docs-v2-cap-guidance`; manifest captured at `.runs/linear-3abba033-52f0-45f3-af58-cce4939f087f-docs-v2-cap-guidance/cli/2026-05-13T00-56-18-644Z-50e2d788/manifest.json`; output patch stored at `.runs/linear-3abba033-52f0-45f3-af58-cce4939f087f-docs-v2-cap-guidance/cli/2026-05-13T00-56-18-644Z-50e2d788/provider-linear-child-lane.patch`.
- [x] Focused feature parser / doctor / defaults / init tests. Evidence: `npm run test -- --run orchestrator/tests/Doctor.test.ts orchestrator/tests/CodexDefaultsSetup.test.ts orchestrator/tests/InitTemplates.test.ts orchestrator/tests/_reproIssueLogTask.test.ts` passed `114` tests on 2026-05-13.
- [x] `node scripts/delegation-guard.mjs`: passed with two subagent manifests.
- [x] `node scripts/spec-guard.mjs --dry-run`: exited 0 and preserved unrelated stale-spec baseline rows.
- [x] `npm run build`: passed.
- [x] `npm run lint`: passed with existing `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`: passed, `359` files / `5554` tests.
- [x] `npm run docs:check`: passed.
- [x] `npm run docs:freshness`: ran and failed only on the existing repo-wide stale-doc baseline (`747` stale docs).
- [x] `npm run repo:stewardship`: passed.
- [x] `node scripts/diff-budget.mjs`: passed.
- [x] Manifest-backed standalone review: final telemetry reports `review_verdict=clean`, `finding_count=0`, `review_outcome=bounded-success`.
- [x] `npm run pack:smoke` because package/CLI distribution surfaces changed.

## Handoff Status
- [x] Branch pushed and PR opened for packet repair or implementation. Evidence: PR #798 on `kb/co-480-packet-traceability`.
- [x] CO-480 moved from Backlog only after packet and registry traceability were present. Evidence: Linear state moved Backlog -> In Progress on 2026-05-13 after the packet and registry mirrors existed.
- [x] Provider worker owns implementation once the issue is Ready/In Progress. Evidence: current provider-worker run owns the implementation, validation, PR feedback, and review-handoff gates for CO-480.
