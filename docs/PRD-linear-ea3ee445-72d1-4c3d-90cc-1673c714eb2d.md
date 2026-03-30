# PRD - CO Fix Standalone Review Wrapper Commit/Base Scoped Codex Review Launch

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-39` / `ea3ee445-72d1-4c3d-90cc-1673c714eb2d`
- Linear URL: https://linear.app/asabeko/issue/CO-39/co-fix-standalone-review-wrapper-commitbase-scoped-codex-review-launch

## Summary
- Problem Statement: `npm run review -- --commit <sha>` and `npm run review -- --base <ref>` still launch `codex review` with an inline prompt payload even though the current Codex CLI rejects combining prompt arguments with diff-scoping flags. The wrapper then refuses to drop the explicit scope, so manifest-backed standalone review fails instead of executing truthfully on the requested commit/base surface.
- Desired Outcome: explicit commit-scoped and base-scoped standalone review invocations run successfully, while the wrapper still saves prompt/context artifacts and describes the scoped-launch contract truthfully in help, docs, and telemetry.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete Linear issue `CO-39` in this workspace by fixing the standalone review wrapper so provider-worker and manual review flows can run exact commit/base scoped `npm run review` commands without falling back to manual review.
- Success criteria / acceptance:
  - `npm run review -- --commit <sha>` executes successfully without the prompt-plus-scope incompatibility
  - `npm run review -- --base <ref>` executes successfully without the prompt-plus-scope incompatibility
  - wrapper help/docs and telemetry stay truthful about what prompt/context reaches `codex review` in scoped modes
  - manifest-backed standalone review remains auditable and does not silently widen or drop the requested scope
- Constraints / non-goals:
  - stay bounded to the scoped standalone-review launch seam plus the docs/tests needed to keep it truthful
  - do not widen into broader review-policy redesign, provider-worker workflow changes, or unrelated telemetry cleanup
  - preserve prompt/context artifacts for operator evidence even when explicit scope launches cannot pass that prompt to the CLI

## Goals
- Make explicit commit-scoped standalone review launch successfully.
- Make explicit base-scoped standalone review launch successfully.
- Keep explicit diff scope auditable instead of silently widening to the default working-tree review.
- Keep wrapper output, docs, and persisted evidence truthful about scoped review launch behavior.
- Add focused regression coverage around the scoped launch contract.

## Non-Goals
- Changing raw `codex review` upstream CLI behavior.
- Replacing the standalone review wrapper or changing unrelated non-interactive handoff policy.
- Reworking bounded-review runtime guards or unrelated review telemetry fields beyond this launch truthfulness seam.

## Stakeholders
- Product: CO operator / reviewer relying on exact scoped standalone review
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - scoped wrapper invocations execute on the requested commit/base surface
  - saved review artifacts remain aligned with the manifest lineage and requested scope
  - tests fail if scoped launch ever reintroduces prompt-plus-scope incompatibility
- Guardrails / Error Budgets:
  - never drop explicit scope flags silently
  - never claim scoped modes pass prompt context to `codex review` if they do not
  - keep the change narrow to wrapper launch behavior, docs, and focused coverage

## User Experience
- Personas: CO operators, provider-worker closeout lanes, and reviewers who need exact commit/base scoped checks
- User Journeys:
  - a provider worker runs forced standalone review against the exact issue commit before `In Review`
  - an operator runs `npm run review -- --base origin/main` and gets a real scoped review instead of a prompt incompatibility failure
  - a reviewer inspects saved artifacts and can tell whether prompt context was delivered inline to Codex or retained as wrapper-side evidence only

## Technical Considerations
- Architectural Notes:
  - the launch seam currently lives in `scripts/lib/review-launch-attempt.ts`
  - wrapper prompt/context assembly lives in `scripts/run-review.ts` and `scripts/lib/review-prompt-context.ts`
  - current tests already assert prompt artifacts and path-only scope notes, but they do not yet prove that explicit scoped launches omit prompt arguments while staying auditable
- Dependencies / Integrations:
  - `scripts/run-review.ts`
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/lib/review-execution-telemetry.ts`
  - `tests/review-launch-attempt.spec.ts`
  - `tests/run-review.spec.ts`
  - `docs/standalone-review-guide.md`
  - `skills/standalone-review/SKILL.md`
  - `AGENTS.md`
  - `docs/AGENTS.md`

## Open Questions
- Whether the smallest truthful telemetry update is a new explicit prompt-delivery field or a narrower output/doc clarification only. Prefer the smallest option that makes scoped launch behavior auditable in persisted evidence.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria
- Engineering: Pre-implementation review approved for the narrow scoped-launch fix; docs-review pending
- Design: N/A
