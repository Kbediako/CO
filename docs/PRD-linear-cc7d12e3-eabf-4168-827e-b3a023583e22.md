# PRD - CO Align Non-Interactive Standalone Review Policy Across Gate, Advisory, and Provider-Worker Lanes

## Added by Bootstrap 2026-03-25

## Traceability
- Linear issue: `CO-12` / `cc7d12e3-eabf-4168-827e-b3a023583e22`
- Linear URL: https://linear.app/asabeko/issue/CO-12/co-align-non-interactive-standalone-review-policy-across-gate-advisory

## Summary
- Problem Statement: CO's standalone review wrapper already behaves truthfully in unattended mode by printing a review handoff prompt unless `FORCE_CODEX_REVIEW=1` is set, but the repo does not currently present one explicit lane policy across gate, advisory, and provider-worker flows. Gate lanes already force real review execution, advisory lanes stay prompt-only, and provider-worker closeout is still ambiguous about whether standalone review should really run or only emit a handoff prompt.
- Desired Outcome: keep the wrapper's default handoff-only behavior truthful, explicitly document which unattended lanes force real standalone review execution versus which remain prompt-only, and make provider-worker closeout use one unambiguous autonomous review contract before review handoff.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete Linear issue `CO-12` in this workspace by auditing Symphony and CO, then align the non-interactive standalone-review policy across config, docs, skills, and provider-worker behavior without inventing a fake bug or widening scope into unrelated review features.
- Success criteria / acceptance:
  - the repo explicitly distinguishes handoff-only non-interactive lanes from auto-forced review-execution lanes
  - `codex.orchestrator.json`, `AGENTS.md`, `docs/standalone-review-guide.md`, and `skills/standalone-review/SKILL.md` describe the same policy
  - provider-worker closeout guidance is explicit about whether standalone review is separate/manual or autonomous/forced
  - focused tests cover the chosen unattended-policy path
  - the current wrapper behavior is not mislabeled as broken if it remains handoff-only by design
- Constraints / non-goals:
  - stay bounded to non-interactive standalone-review policy alignment
  - do not widen into elegance-review policy or unrelated provider features
  - record delegation as an explicit override because this worker run cannot spawn subagents

## Goals
- Publish one explicit unattended review lane matrix for standalone review.
- Preserve the existing forced-review behavior in gate lanes where it is already intentional.
- Preserve advisory review as advisory-only when that is the repo's explicit choice.
- Make provider-worker review closeout explicit and autonomous instead of implied.
- Add focused contract coverage so the policy is enforced by code, not only docs.

## Non-Goals
- Replacing `codex-orchestrator review` with a different wrapper or changing its default direct-call behavior.
- Expanding provider-worker lifecycle scope beyond the review-execution contract for this issue.
- Changing elegance-review or unrelated merge-shepherding policy.

## Stakeholders
- Product: CO operator / reviewer relying on truthful autonomous review behavior
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - unattended lanes now have an explicit forced-versus-handoff review policy
  - provider-worker closeout guidance matches the actual runtime/config behavior
  - focused contract tests fail if a lane silently drifts between prompt-only and forced review execution
- Guardrails / Error Budgets:
  - keep the raw wrapper behavior truthful and opt-in for forced execution
  - do not present advisory review as deterministic autonomous review execution
  - stop coding once the issue reaches the live review handoff state

## User Experience
- Personas: CO operators, provider-worker authors, and downstream users relying on unattended review lanes
- User Journeys:
  - an operator launches `docs-review` or `implementation-gate` non-interactively and expects real review execution
  - an operator launches a non-blocking advisory lane and expects a prompt-only/advisory result rather than a silent forced review
  - a provider worker prepares `In Review` handoff and knows whether standalone review must actually run in that unattended lane

## Technical Considerations
- Architectural Notes:
  - the current non-interactive handoff contract lives in `scripts/lib/review-non-interactive-handoff.ts` and `scripts/run-review.ts`
  - gate/advisory lane behavior is encoded in `codex.orchestrator.json`
  - provider-worker closeout guidance lives in `orchestrator/src/cli/providerLinearWorkerRunner.ts` and the repo docs/skills
  - the broader autonomy posture is bounded by the current Symphony baseline in `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, and `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
- Dependencies / Integrations:
  - `AGENTS.md`
  - `docs/AGENTS.md`
  - `docs/standalone-review-guide.md`
  - `skills/standalone-review/SKILL.md`
  - `codex.orchestrator.json`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`

## Open Questions
- Whether provider-worker closeout should require the repo's full `implementation-gate` pipeline or an explicit manifest-backed standalone review step. The implementation should choose the smallest truthful contract that matches current CO/Symphony posture.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria
- Engineering: docs-review approved; implementation validation pending
- Design: N/A

## Manifest Evidence
- Baseline audit: `out/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/manual/20260325T065646Z-baseline-audit.md`
- Docs-review manifest: `.runs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/cli/2026-03-25T07-21-52-956Z-12d6b412/manifest.json`
