---
id: 20260214-0959-experience-prompt-injection-delegation-skill-harmonization
title: Experience Prompt Injection + Delegation Skill Harmonization
relates_to: docs/PRD-experience-prompt-injection-and-delegation-skill-harmonization.md
risk: medium
owners:
  - Codex
last_review: 2026-02-14
---

## Summary
- Objective: Make persisted experiences directly useful in cloud execution prompts and streamline delegation guidance for shipped users.
- Scope: Cloud prompt builder, targeted tests, bundled skill docs, README skill listing.
- Constraints: Keep behavior additive and backward-compatible.

## Technical Requirements
- Functional requirements:
  - Include selected prompt-pack experience snippets in cloud execution prompt text.
  - Select snippets by relevant domain with stable fallback behavior.
  - Mark `delegate-early` as compatibility/deprecated guidance and route users to `delegation-usage`.
  - Keep bundled skill/package paths intact.
- Non-functional requirements (performance, reliability, security):
  - Bounded snippet count and normalized prompt text.
  - No secret/token disclosure in skill examples.
- Interfaces / contracts:
  - No manifest schema expansion.
  - Existing skill names remain resolvable.

## Architecture and Data
- Architecture / design adjustments:
  - Prompt composition update in orchestrator cloud path.
  - Skill wording update in bundled markdown docs.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - None.

## Validation Plan
- Tests / checks:
  - Add/update orchestrator tests for cloud prompt behavior.
  - Run full repo quality gates.
- Rollout verification:
  - Confirm check suite green and bot reviewers satisfied.
- Monitoring / alerts:
  - Existing CI + PR checks.

## Open Questions
- Should non-cloud prompt paths consume the same experience block in a subsequent task?

## Evidence
- Planning scout / delegation evidence: `.runs/0959-experience-prompt-injection-delegation-skill-harmonization-scout/cli/2026-02-14T03-17-20-574Z-02f71ef8/manifest.json`
- Docs-review (pre-implementation): `.runs/0959-experience-prompt-injection-delegation-skill-harmonization/cli/2026-02-14T03-20-41-027Z-c35101dd/manifest.json`
- Implementation-gate: `.runs/0959-experience-prompt-injection-delegation-skill-harmonization/cli/2026-02-14T03-21-12-811Z-a6b02bbb/manifest.json`
- Reviewer hand-off (`npm run review` with `NOTES`): `.runs/0959-experience-prompt-injection-delegation-skill-harmonization/cli/2026-02-14T03-21-12-811Z-a6b02bbb/manifest.json`

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
