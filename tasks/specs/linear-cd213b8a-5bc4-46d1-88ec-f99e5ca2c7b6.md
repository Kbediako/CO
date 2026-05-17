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

# TECH_SPEC - CO-548 decouple targeted provider-worker nudge from broad dispatch pilot

## Canonical Reference
- PRD: `docs/PRD-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- Task checklist: `tasks/tasks-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- Linear issue: `CO-548` / `cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`

## Summary
- Objective: allow explicit targeted `recover`, `relaunch`, and `nudge` requests to resolve one Linear issue by id through configured source binding when the broad dispatch pilot is disabled.
- Scope:
  - `ProviderIssueHandoff` recovery resolver selection
  - control-host tracked issue resolver wiring
  - focused resolver and recovery regression coverage
  - docs/task registry mirrors for CO-548
- Constraints:
  - no broad `dispatch_pilot.enabled` rollout
  - no queue-wide admission changes
  - no provider-intake state-file edits
  - no source binding or kill-switch bypass
  - no CO-546 revalidation rewrite

## Issue-Shaping Contract
- User-request translation carried forward: fix the root control-host path that prevented targeted CO-543 worker recovery after broad dispatch returned `dispatch_source_disabled`.
- Protected terms / exact artifact and surface names: `control-host recover`, `recover|relaunch|nudge`, `dispatch_source_disabled`, `dispatch_pilot.enabled=false`, `ProviderIssueHandoff`, `createControlHostTrackedIssueResolvers`, `resolveLinearWebhookSourceSetup`, `resolveLinearConfiguredSourceSetup`, `resolveTrackedIssue`, `resolveTrackedIssues`, `resolveRevalidationTrackedIssue`.
- Nearby wrong interpretations to reject: enabling broad dispatch, manual intake cleanup, queue-wide WIP changes, unscoped Linear reads, or duplicating CO-546 revalidation behavior.
- Explicit non-goals: no dispatch-pilot rollout, no worker capacity change, no docs-freshness baseline repair, and no quota-hygiene automation changes.

## Technical Requirements
- `CreateProviderIssueHandoffServiceOptions` must expose an optional recovery-specific issue resolver.
- `recoverIssue` must use the recovery resolver for explicit `recover`, `relaunch`, and `nudge` actions, falling back to the existing tracked issue resolver only when no recovery resolver is provided.
- `createControlHostTrackedIssueResolvers` must wire the recovery resolver to `resolveLinearConfiguredSourceSetup`.
- Broad `resolveTrackedIssue` and `resolveTrackedIssues` paths must continue using `resolveLinearWebhookSourceSetup` so `dispatch_pilot.enabled=false` disables broad admission.
- Targeted recovery must still honor source setup errors from kill switch, missing source, malformed source, and missing Linear binding.
- Regression coverage must prove accepted/no-run pending-revalidation claims can be reclaimed through explicit recovery under disabled broad dispatch.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Targeted recovery source binding | Explicit recover/relaunch/nudge is blocked by broad `dispatch_pilot.enabled=false`. | `remove fallback` | CO-548 | Operator invokes targeted recovery for one Linear issue id. | Existing shared resolver wiring | 2026-05-17 | This issue | Recovery uses configured source binding while broad dispatch stays disabled. | ControlHostCliShell and ProviderIssueHandoff regression tests. |
| Broad dispatch disabled posture | Queue sweeps are disabled unless pilot is enabled. | `justify retaining fallback` | Control-host dispatch pilot | `dispatch_pilot.enabled=false`. | Existing dispatch-pilot safety contract | 2026-05-17 | Durable safety contract | Separate reviewed dispatch rollout enables broad admission. | Regression proves broad paths still skip. |

- Contract name: dispatch-pilot broad admission disabled posture.
- Owning surface: control-host dispatch pilot.
- Steady-state proof: broad issue discovery remains disabled unless the pilot is explicitly enabled.
- Tests/docs: focused resolver and recovery tests plus this docs packet.
- Non-expiring rationale: durable operator safety contract, not a temporary fallback.
- Large-refactor check: not required; existing configured-source and webhook-source helpers already encode the authority split. CO-548 only exposes that split at the recovery action boundary.
- Minor-seam decision: acceptable because it removes the operational workaround of enabling broad dispatch and does not introduce competing eligibility logic.

## Validation Plan
- Add a focused `ControlHostCliShell` resolver test for disabled dispatch with configured source binding.
- Add a focused `ProviderIssueHandoff` `it.each(['recover','relaunch','nudge'])` regression using a recovery resolver while the normal resolver returns `dispatch_source_disabled`.
- Run `git diff --check`.
- Run JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- Run focused tests, spec guard, build, docs checks, and review handoff as scope requires.

## Validation Results - 2026-05-17
- Focused resolver and recovery tests passed, including explicit `recover`, `relaunch`, and `nudge` actions.
- Touched `ControlHostCliShell` and `ProviderIssueHandoff` coverage passed together.
- Build, lint, docs:check, repo:stewardship, diff-budget, pack:smoke, JSON parse, and `git diff --check` passed.
- Raw gpt-5.5/xhigh standalone review completed cleanly and reported full core passing.
- `spec-guard` stale-spec output and `docs:freshness` stale-doc output are existing repo-wide baseline debt outside CO-548; this spec is current.
