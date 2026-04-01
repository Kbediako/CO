# PRD - CO Preserve Scoped Standalone-Review Context Without Inline Prompt

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-43` / `9ff97d4a-dead-4bbf-b6e8-ee9423fa1612`
- Linear URL: https://linear.app/asabeko/issue/CO-43/co-preserve-scoped-standalone-review-context-without-inline-prompt

## Summary
- Problem Statement: `CO-39` made explicit `--base`, `--commit`, and `--uncommitted` standalone-review launches truthful by omitting the unsupported inline prompt, but that left scoped reviews with no live reviewer-visible task context beyond the raw diff scope. The full prompt still lands in `review/prompt.txt`, yet the actual Codex review session only sees the default scoped-review scaffold and can drift because task `NOTES`, review surface intent, and other prompt-only guidance never reach the live reviewer.
- Desired Outcome: explicit scoped standalone-review launches keep the compatibility fix, but they also carry a bounded reviewer-visible context transport that preserves the most important task intent without reintroducing prompt-plus-scope failures.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete Linear issue `CO-43` in this workspace by preserving enough scoped standalone-review context for the live reviewer after the `CO-39` compatibility fix, while keeping the wrapper truthful and narrowly scoped to the standalone-review transport seam.
- Success criteria / acceptance:
  - explicit `npm run review -- --base|--commit|--uncommitted` still avoids inline prompt-plus-scope launch failures
  - scoped review receives bounded reviewer-visible transport for task `NOTES` and the requested review surface, or the wrapper ships an explicit, tested contract for what scoped review does and does not receive
  - focused wrapper tests fail if the chosen scoped-context transport silently disappears again
- Constraints / non-goals:
  - keep the change bounded to standalone-review context transport, telemetry, docs, and focused tests
  - do not reintroduce inline prompt delivery under explicit diff scope flags
  - do not widen into broader review-policy redesign, provider-worker workflow changes, or unrelated review-runtime guard work

## Goals
- Preserve compatibility for explicit scoped standalone-review launches.
- Preserve reviewer-visible scoped context through a bounded transport that survives current Codex CLI scope restrictions.
- Keep persisted evidence truthful about what context reached the live reviewer versus what stayed artifact-only.
- Add focused regression coverage for the scoped-context transport contract.

## Non-Goals
- Changing upstream `codex review` prompt-plus-scope behavior.
- Reworking bounded review-mode policies, termination guards, or unrelated review-runtime telemetry.
- Expanding explicit scoped review beyond the supported `diff` surface.

## Stakeholders
- Product: CO operators and provider-worker closeout lanes relying on manifest-backed standalone review
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - scoped standalone review still launches successfully on the requested diff scope
  - the live review transcript receives bounded task intent instead of only the bare scope scaffold
  - saved artifacts and telemetry make the scoped transport explicit and auditable
- Guardrails / Error Budgets:
  - never silently drop explicit scope flags
  - never claim full prompt delivery when the live reviewer only received a bounded transport
  - keep the patch local to the standalone-review transport seam and direct docs/test consumers

## User Experience
- Personas: provider-worker lanes, CO operators running manual scoped review, and reviewers auditing manifest-backed review evidence
- User Journeys:
  - a provider worker runs forced commit/base scoped review before `In Review` and the live reviewer sees bounded task intent, not just the raw scope scaffold
  - an operator inspects scoped review telemetry and can tell whether the live reviewer received inline prompt context, bounded title context, or artifact-only context
  - a maintainer reruns focused wrapper tests and gets a hard failure if scoped context silently regresses back to bare scope-only review

## Technical Considerations
- Architectural Notes:
  - the scoped-launch seam lives in `scripts/lib/review-launch-attempt.ts`
  - prompt assembly and task/surface note construction live in `scripts/run-review.ts` and `scripts/lib/review-prompt-context.ts`
  - telemetry truth currently lives in `scripts/lib/review-execution-telemetry.ts`
  - current local Codex help advertises `--title <TITLE>`, and a bounded live probe showed `codex review --commit <sha> --title "<context>"` renders that title in the initial reviewer-visible transcript (`commit <sha>: <title>`)
- Dependencies / Integrations:
  - `scripts/run-review.ts`
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/lib/review-prompt-context.ts`
  - `scripts/lib/review-execution-telemetry.ts`
  - `tests/review-launch-attempt.spec.ts`
  - `tests/run-review.spec.ts`
  - `docs/standalone-review-guide.md`
  - `skills/standalone-review/SKILL.md`
  - `AGENTS.md`
  - `docs/AGENTS.md`

## Open Questions
- None. Pre-implementation review approves the bounded title-plus-artifact transport path: keep full prompt context in `review/prompt.txt`, synthesize reviewer-visible scoped title context from resolved `NOTES` plus review surface when `--title` is absent, and if Codex rejects that synthesized scoped title retry the same explicit scope without `--title` so telemetry/docs/tests still report the fallback artifact-only contract truthfully.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria
- Engineering: Pre-implementation review approved for the bounded scoped-context transport repair; docs-review approved via `.runs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612-docs-review/cli/2026-03-30T06-52-40-070Z-7b90108a/manifest.json` and `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T070418Z-docs-review-fallback.md`
- Design: N/A
