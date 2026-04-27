---
id: 20260427-linear-f04ab1c2-79e6-4a98-84e1-85efb6583116
title: "CO-398 control-host status fallback projection expiry"
relates_to: docs/PRD-linear-f04ab1c2-79e6-4a98-84e1-85efb6583116.md
risk: high
owners:
  - Codex
last_review: 2026-04-27
related_action_plan: docs/ACTION_PLAN-linear-f04ab1c2-79e6-4a98-84e1-85efb6583116.md
task_checklists:
  - tasks/tasks-linear-f04ab1c2-79e6-4a98-84e1-85efb6583116.md
---

# TECH_SPEC - CO-398 control-host status fallback projection expiry

## Canonical Reference
- PRD: `docs/PRD-linear-f04ab1c2-79e6-4a98-84e1-85efb6583116.md`
- Canonical TECH_SPEC: `tasks/specs/linear-f04ab1c2-79e6-4a98-84e1-85efb6583116.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f04ab1c2-79e6-4a98-84e1-85efb6583116.md`
- Task checklist: `tasks/tasks-linear-f04ab1c2-79e6-4a98-84e1-85efb6583116.md`
- Linear issue: `CO-398` / https://linear.app/asabeko/issue/CO-398

This mirror intentionally tracks the canonical TECH_SPEC at `tasks/specs/linear-f04ab1c2-79e6-4a98-84e1-85efb6583116.md`.

## Summary
- Objective: register CO-398 before implementation and define the fallback-expiry contract for `control-host status surfaces`.
- Scope:
  - packet files, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows in this packet lane
  - parent-owned inventory and implementation across `compatibilityIssuePresenter.ts`, `providerIssueObservability.ts`, `selectedRunProjection.ts`, and `controlRuntime.ts`
- Constraints:
  - no implementation files in this packet lane
  - no provider workflow, review-wrapper, runtime routing, docs freshness, supervision, launchctl, or provider worker lifecycle redesign
  - no Linear transition or PR lifecycle work in this packet lane

## Issue-Shaping Contract
- User-request translation carried forward: CO-398 applies CO-382 `fallback expiry` to `control-host status surfaces`. The parent implementation must inventory status fallback paths and choose `remove fallback`, `expire fallback`, or `justify retaining fallback` for each retained path before changing code.
- Protected terms / exact artifact and surface names:
  - `control-host status surfaces`
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
  - `legacy proof fields`
  - `selected-run projection fallback`
  - `compatibility issue projection fallback`
  - `CLI/API/UI status source authority`
  - `/ui/data.json`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
- Nearby wrong interpretations to reject:
  - hiding source authority behind another fallback projection
  - weakening `/ui/data.json` truth
  - removing audit-visible legacy proof without focused projection tests
  - treating retained proof or cached claims as live authority without explicit source labels
  - widening CO-398 into provider workflow, review-wrapper, runtime routing, docs freshness, supervision, or launchctl work

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `control-host status surfaces` | Legacy proof fields projected into status output | justify retaining fallback | CO-398 parent lane | Retained manifests/proofs or cached provider-intake records are available while live state is missing or incomplete. | oldest known 2026-04-23; current review 2026-04-27 | 2026-05-10 | Non-expiring only for audit-visible proof fields with source labels | Remove or narrow once current-state authority preserves equivalent audit evidence without proof-as-status ambiguity. | Focused compatibility/presenter/status tests plus CLI/API/UI projection checks. |
| `control-host status surfaces` | Selected-run projection fallback | expire fallback | CO-398 parent lane | `co-status` or control-host output lacks a live selected claim/run and falls back to retained projection data. | oldest known 2026-04-23; current review 2026-04-27 | 2026-05-10 | 2026-05-26 | Live selected claim/run state or explicit degraded-read status replaces retained selected-run fallback. | `selectedRunProjection` tests and `co-status --format json` fixture coverage. |
| `control-host status surfaces` | Compatibility issue projection fallback | expire fallback | CO-398 parent lane | Legacy provider proof/status payload shape is present and compatibility projection fills missing fields. | oldest known 2026-04-23; current review 2026-04-27 | 2026-05-10 | 2026-05-26 | Consumers read the canonical issue/status shape directly or the compatibility bridge emits explicit expired/degraded metadata. | `compatibilityIssuePresenter` and provider observability tests. |
| `control-host status surfaces` | Synthetic identity/status fallback that hides CLI/API/UI disagreement | remove fallback | CO-398 parent lane | CLI, API, UI, Linear, provider-intake, or retained proof disagree and projection fabricates one coherent status. | current review 2026-04-27 | N/A after removal | N/A after removal | Disagreement is surfaced with source labels, degraded reason, and current-state authority evidence. | Control runtime tests plus CLI/API/UI status projection regression coverage. |
| `control-host status surfaces` | CLI/API/UI `/ui/data.json` source labels and authority/proof split | justify retaining fallback | CO-398 parent lane | Any status projection includes both live authority and retained proof/audit evidence. | current review 2026-04-27 | 2026-05-26 | Non-expiring durable audit contract | Remove only with a replacement schema preserving live authority, retained proof, source label, and degraded reason. | Control runtime, provider observability, and status presenter tests. |

## Not Done If
- Protected terms are missing or renamed.
- CO-398 can leave Backlog without packet and registry mirrors.
- Legacy proof/status fallback paths remain indefinite with no owner/removal condition.
- CLI/API/UI projections still disagree and the implementation adds a fallback to mask disagreement.
- `/ui/data.json` truth or source labels are weakened.
- Audit-visible legacy proof is removed without focused projection coverage.

## Parent Implementation Contract
- Inventory fallback/legacy projection paths in the four protected control-host files.
- Choose `remove fallback`, `expire fallback`, or `justify retaining fallback` for every retained path.
- Remove synthetic status fallback that masks disagreement between live authority and retained proof.
- Add bounded expiry metadata for retained temporary status bridges.
- Preserve source labels and `/ui/data.json` truth.
- Escalate to CO-400 if implementation requires a larger provider issue current-state authority consolidation.

## Validation Plan
- Packet checks:
  - parse `tasks/index.json`
  - parse `docs/docs-freshness-registry.json`
  - protected-term scan over packet files and `docs/TASKS.md`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - scoped diff/status check
- Parent implementation checks:
  - docs-review before implementation
  - focused `compatibilityIssuePresenter` tests
  - focused `providerIssueObservability` tests
  - focused `selectedRunProjection` tests
  - focused `controlRuntime`, `co-status`, and `/ui/data.json` projection checks
  - normal parent validation floor and review loop
