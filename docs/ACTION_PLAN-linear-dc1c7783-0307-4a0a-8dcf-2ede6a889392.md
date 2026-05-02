# ACTION_PLAN - CO-473 review-wrapper command-surface authoritative-gate env isolation

## Summary
- Goal: preserve command-surface prompt-only noninteractive review handoff coverage while proving it is isolated from ambient provider-worker `CODEX_REVIEW_AUTHORITATIVE_GATE=1`.
- Scope: docs-first packet, registry mirrors, current-main focused repro evidence, and parent-owned closeout decision.
- Assumptions:
  - the source payload path from the parent brief is unavailable in this child checkout, so the packet is anchored on the parent-provided source anchor and issue contract
  - current main already contains test-local env isolation in `tests/cli-command-surface.spec.ts`
  - parent owns any source/test changes, Linear state, workpad, PR lifecycle, and patch integration

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CODEX_REVIEW_AUTHORITATIVE_GATE=1`
  - `FORCE_CODEX_REVIEW=1`
  - `prompt-only noninteractive review handoff`
  - `command-surface regression`
  - `tests/cli-command-surface.spec.ts`
  - `review wrapper authoritative gate`
  - `provider-worker environment`
  - `clean-main repro`
- Not done if:
  - `tests/cli-command-surface.spec.ts` fails solely because a provider-worker shell inherited `CODEX_REVIEW_AUTHORITATIVE_GATE=1`
  - prompt-only noninteractive review handoff is treated as authoritative success under `CODEX_REVIEW_AUTHORITATIVE_GATE=1`
  - equivalent command-surface regression coverage is removed
  - CO-468 recovery behavior changes
- Pre-implementation issue-quality review:
  - The issue is narrower than a provider-worker environment redesign and broader than a docs-only typo.
  - The issue is not CO-468 recovery work; CO-468 only supplied the clean-main blocker evidence.
  - The micro-task path is unavailable because exact env names and fail-closed review semantics define correctness.
- Fallback / refactor decision:
  - `remove fallback`: ambient authoritative-gate env leaking into the prompt-only command-surface handoff regression.
  - `justify retaining fallback`: prompt-only noninteractive review handoff as a supported non-authoritative wrapper mode.
  - `justify retaining fallback`: `FORCE_CODEX_REVIEW=1` as the explicit authoritative execution switch under `CODEX_REVIEW_AUTHORITATIVE_GATE=1`.
- Durable retention evidence:
  - Prompt-only noninteractive handoff remains valid only outside authoritative gates.
  - Authoritative review handoff remains terminal-evidence based and fail closed.
- Large-refactor check:
  - A broad review-wrapper/provider-worker env refactor is deferred because the focused current-main repro passes with test-local env isolation. Escalate only if repeated gate-env contamination appears across multiple surfaces.

## Milestones & Sequencing
1. Child lane creates PRD, TECH_SPEC, ACTION_PLAN, checklist, and `.agent` mirror.
2. Child lane updates `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` surgically.
3. Child lane records current-main focused repro evidence under ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1`.
4. Parent imports the patch and records docs-first acceptance in the workpad.
5. Parent decides whether current-main proof is sufficient for docs/evidence-only closeout or whether a narrow source/test assertion is still needed.
6. Parent runs docs-review and any required implementation-gate/review handoff checks.
7. Parent handles PR lifecycle and Linear state.

## Dependencies
- `tests/cli-command-surface.spec.ts`
- `codex-orchestrator review`
- Review wrapper authoritative-gate env contract
- Provider-worker validation environment
- CO-468 clean-main blocker evidence, as provenance only

## Validation
- Checks / tests:
  - child-lane focused current-main repro: `CODEX_REVIEW_AUTHORITATIVE_GATE=1 npx vitest run tests/cli-command-surface.spec.ts -t "launches review via the CLI shell in non-interactive handoff mode"`
  - child-lane JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - child-lane scoped `git diff --check`
  - child-lane protected-term scan
  - parent-owned docs-review or equivalent packet review
  - parent-owned normal provider-worker validation/review gates if source/test changes are made
- Rollback plan:
  - If packet framing is wrong, revert only the docs/mirror patch and relaunch with corrected issue ownership.
  - If parent source inspection finds broader env contamination, keep this packet as evidence and relaunch with widened ownership instead of stretching this docs child lane.

## Risks & Mitigations
- Risk: the packet accidentally weakens authoritative-gate semantics.
  - Mitigation: every packet surface states prompt-only handoff is not authoritative success under `CODEX_REVIEW_AUTHORITATIVE_GATE=1`.
- Risk: CO-468 recovery scope is reopened.
  - Mitigation: CO-468 is named only as provenance for the clean-main repro; no recovery files are in scope.
- Risk: equivalent coverage is removed in parent closeout.
  - Mitigation: require preserved command-surface regression coverage or an equivalent test if implementation changes.

## Approvals
- Reviewer: bounded same-issue child lane.
- Date: 2026-05-02.
