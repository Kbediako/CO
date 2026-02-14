# TECH_SPEC - Experience Prompt Injection + Delegation Skill Harmonization (0959)

## Summary
- Objective: Wire persisted prompt-pack experiences into cloud execution prompts and make delegation-skill usage canonical with minimal downstream friction.
- Scope: `orchestrator/src/cli/orchestrator.ts`, targeted tests, bundled skill docs under `skills/`, and release-facing docs.
- Constraints: Small diff, backward-compatible skill naming, no new external dependencies.

## Technical Requirements
- Functional requirements:
  - Cloud prompt builder must include a bounded experience section when `manifest.prompt_packs[].experiences` exists.
  - Experience selection should prefer domain relevance and gracefully fall back.
  - `delegate-early` remains shipped but clearly delegates behavior to `delegation-usage`.
  - Delegation docs should remove stale version pin friction and keep guidance aligned with current runtime.
- Non-functional requirements:
  - Keep prompt size bounded (small fixed max snippets).
  - Maintain deterministic behavior with and without experiences.
- Interfaces / contracts:
  - No manifest schema changes required.
  - Existing skill file paths remain valid.

## Architecture and Data
- Architecture / design adjustments:
  - Extend `buildCloudPrompt(...)` to append a short “relevant prior experiences” block.
  - Add helper selection logic for choosing prompt-pack/domain snippet set.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - None beyond current orchestrator and skill packaging.

## Validation Plan
- Tests / checks:
  - Add/extend orchestrator tests for cloud prompt experience injection and fallback.
  - Run full guardrail/build/test/docs/review chain.
- Rollout verification:
  - Confirm prompts now include snippet block in unit tests.
  - Confirm packaged skill files reflect canonical path.
- Monitoring / alerts:
  - Existing CI checks + review bots.

## Open Questions
- Should domain-matching be centralized into a shared utility in a follow-up refactor?

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
