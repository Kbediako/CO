---
id: 20260517-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6
title: CO-548 decouple targeted provider-worker nudge from broad dispatch pilot
relates_to: docs/PRD-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md
risk: high
owners:
  - Codex
last_review: 2026-05-17
related_action_plan: docs/ACTION_PLAN-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md
task_checklists:
  - tasks/tasks-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md
---

# TECH_SPEC Mirror - CO-548 decouple targeted provider-worker nudge from broad dispatch pilot

This mirror summarizes `tasks/specs/linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md` for docs-surface discoverability.

## Objective
Let explicit `control-host recover|relaunch|nudge --issue-id` resolve one Linear issue through configured source binding while broad dispatch-pilot admission remains disabled.

## Scope
- `ProviderIssueHandoff` recovery resolver selection.
- `createControlHostTrackedIssueResolvers` recovery source binding.
- Focused tests proving broad dispatch remains disabled.
- Docs-first packet and task registry mirrors for CO-548.

## Key Requirements
- Recovery actions use a recovery-specific resolver backed by `resolveLinearConfiguredSourceSetup`.
- Broad `resolveTrackedIssue` and `resolveTrackedIssues` paths still use `resolveLinearWebhookSourceSetup`.
- Kill switch and missing source/binding errors remain fail-closed.
- Accepted/no-run pending-revalidation claims can be reclaimed by explicit targeted recovery when live Linear state is runnable.
- CO-546 revalidation remains separate.

## Fallback / Refactor Decision
This lane removes the operational fallback of enabling broad dispatch to recover one issue. It retains the durable broad-dispatch disabled posture as an explicit operator safety contract.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Targeted recovery source binding | Explicit recover/relaunch/nudge is blocked by broad `dispatch_pilot.enabled=false`. | `remove fallback` | CO-548 | Operator invokes targeted recovery for one Linear issue id. | Existing shared resolver wiring | 2026-05-17 | This issue | Recovery uses configured source binding while broad dispatch stays disabled. | ControlHostCliShell and ProviderIssueHandoff regression tests. |
| Broad dispatch disabled posture | Queue sweeps are disabled unless pilot is enabled. | `justify retaining fallback` | Control-host dispatch pilot | `dispatch_pilot.enabled=false`. | Existing dispatch-pilot safety contract | 2026-05-17 | Durable safety contract | Separate reviewed dispatch rollout enables broad admission. | Regression proves broad paths still skip. |

- Contract name: dispatch-pilot broad admission disabled posture.
- Owning surface: control-host dispatch pilot.
- Steady-state proof: broad issue discovery remains disabled unless the pilot is explicitly enabled.
- Tests/docs: focused resolver and recovery tests plus this docs packet.
- Non-expiring rationale: durable operator safety contract, not a temporary fallback.

## Validation Plan
- Focused resolver and recovery regressions.
- `git diff --check`, JSON parse, spec guard, build, docs checks, and review handoff as scope requires.

## Validation Results - 2026-05-17
- Focused resolver and recovery tests passed, including explicit `recover`, `relaunch`, and `nudge` actions.
- Touched `ControlHostCliShell` and `ProviderIssueHandoff` coverage passed together.
- Build, lint, docs:check, repo:stewardship, diff-budget, pack:smoke, JSON parse, and `git diff --check` passed.
- Raw gpt-5.5/xhigh standalone review completed cleanly and reported full core passing.
- `spec-guard` stale-spec output and `docs:freshness` stale-doc output are existing repo-wide baseline debt outside CO-548; this mirror is current.
