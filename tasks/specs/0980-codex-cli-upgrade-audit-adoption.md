---
id: 20260225-0980-codex-cli-upgrade-audit-adoption
title: Codex CLI Upgrade Audit + CO Capability Adoption
relates_to: tasks/tasks-0980-codex-cli-upgrade-audit-adoption.md
risk: medium
owners:
  - Codex
last_review: 2026-02-26
---

## Summary
- Objective: complete a deep Codex CLI upgrade audit and land CO-specific adoption upgrades with full validation and merge lifecycle.
- Scope: release/fork evidence capture, decision logs, and targeted code/config/docs/skills updates in CO.
- Constraints: minimal high-leverage changes only; no destructive git operations; preserve compatibility context where legacy aliases still matter.
- Follow-up scope (2026-02-26): codify built-ins-first/high-reasoning baseline, additive config posture, simulation coverage ownership, docs relevance governance, RLM default-capability stance, and fallback exception policy.

## Decision and Success Criteria
- Decision:
  - Use latest stable Codex CLI (`0.105.0`) as the primary adoption baseline.
  - Keep legacy compatibility notes but standardize canonical `multi_agent` language.
  - Adopt explicit workload profiles for depth/thread defaults and document why.
  - Use raw built-ins plus top-level `gpt-5.3-codex` + `model_reasoning_effort >= high` as the default operating baseline.
  - Keep user config mutation additive and non-destructive.
  - Keep scenario/mock/simulation guidance in `skills/collab-evals` now and defer new skill creation unless scope expands.
  - Start docs relevance checks with delegated agent lanes; defer deterministic hard gate until false-positive baseline is measured.
- Success criteria:
  - Source-backed change report and fork delta summary published.
  - Thread/depth decision log includes rationale, risks, and rejected alternatives.
  - CO files referencing old defaults are updated consistently.
  - Follow-up docs are aligned on additive config semantics, built-ins-first RLM posture, and contingency-only fallback rationale.
  - Validation chain and PR lifecycle are completed with evidence.

## Technical Requirements
- Functional requirements:
  - Capture latest release facts and behavior changes that matter to CO.
  - Capture local fork vs upstream delta (ahead/behind + key commit lists).
  - Update CO docs/skills/config wording/default guidance for adopted decisions.
  - Provide a prioritized backlog of additional upgrades beyond depth/thread limits.
  - Ensure docs codify: built-ins-first baseline + `>= high` reasoning at top-level defaults, not role-sprawl defaults.
  - Ensure config update guidance is additive (merge/patch semantics) and explicitly avoids destructive overwrite.
  - Ensure `collab-evals` includes concrete scenario/mock/simulation steps for config merge, RLM default behavior, and docs relevance drift checks.
  - Ensure delegation guidance emphasizes agent-first autonomy in non-trivial lanes.
- Non-functional requirements (performance, reliability, security):
  - No regressions to existing orchestrator commands or review wrappers.
  - Keep downstream packaging compatibility intact for touched skills/docs surfaces.
  - Keep fallback profiles as evidence-backed contingency, not routine defaults.
- Interfaces / contracts:
  - Updated guidance must remain consistent with existing collab/delegation compatibility policy.

## Architecture & Data
- Architecture / design adjustments:
  - Docs-first artifacts + findings report become the canonical audit evidence.
  - Minimal script/help text adjustments allowed when they improve upgrade operability.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - `gh` release metadata, upstream codex git refs, local fork state.

## Validation Plan
- Tests / checks:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - `collab-evals` scenario evidence note captured in findings/task docs when simulation lanes are run.
- Rollout verification:
  - Verify docs/skills surfaces in packaged smoke lane.
- Monitoring / alerts:
  - Use PR checks + post-green quiet-window monitoring before merge.

## Open Questions
- Should a future follow-up add an automated Codex release-drift checker to `doctor` (network-dependent)?
- At what measured false-positive threshold should docs-relevance checks graduate from agent-first advisory to a deterministic gate?

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-26
