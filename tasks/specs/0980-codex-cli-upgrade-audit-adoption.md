---
id: 20260225-0980-codex-cli-upgrade-audit-adoption
title: Codex CLI Upgrade Audit + CO Capability Adoption
relates_to: tasks/tasks-0980-codex-cli-upgrade-audit-adoption.md
risk: medium
owners:
  - Codex
last_review: 2026-02-25
---

## Summary
- Objective: complete a deep Codex CLI upgrade audit and land CO-specific adoption upgrades with full validation and merge lifecycle.
- Scope: release/fork evidence capture, decision logs, and targeted code/config/docs/skills updates in CO.
- Constraints: minimal high-leverage changes only; no destructive git operations; preserve compatibility context where legacy aliases still matter.

## Decision and Success Criteria
- Decision:
  - Use latest stable Codex CLI (`0.105.0`) as the primary adoption baseline.
  - Keep legacy compatibility notes but standardize canonical `multi_agent` language.
  - Adopt explicit workload profiles for depth/thread defaults and document why.
- Success criteria:
  - Source-backed change report and fork delta summary published.
  - Thread/depth decision log includes rationale, risks, and rejected alternatives.
  - CO files referencing old defaults are updated consistently.
  - Validation chain and PR lifecycle are completed with evidence.

## Technical Requirements
- Functional requirements:
  - Capture latest release facts and behavior changes that matter to CO.
  - Capture local fork vs upstream delta (ahead/behind + key commit lists).
  - Update CO docs/skills/config wording/default guidance for adopted decisions.
  - Provide a prioritized backlog of additional upgrades beyond depth/thread limits.
- Non-functional requirements (performance, reliability, security):
  - No regressions to existing orchestrator commands or review wrappers.
  - Keep downstream packaging compatibility intact for touched skills/docs surfaces.
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
- Rollout verification:
  - Verify docs/skills surfaces in packaged smoke lane.
- Monitoring / alerts:
  - Use PR checks + post-green quiet-window monitoring before merge.

## Open Questions
- Should a future follow-up add an automated Codex release-drift checker to `doctor` (network-dependent)?

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-25
