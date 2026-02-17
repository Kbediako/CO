# PRD - Control-Plane + Guardrail Runner Hardening (0970)

## Summary
- Problem Statement: recent runs exposed three reliability gaps: control-plane request validation can fail on optional fields emitted as `undefined`, guard wrappers may skip/fail when repo-local scripts are absent, and guardrail summaries can report success while the underlying spec guard was actually skipped.
- Desired Outcome: harden request/wrapper/summary behavior so downstream and local runs produce accurate guardrail signals with low friction.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): proceed with the approved Option 2 path, keep changes in `CO` only (no `tower-defence` edits), and implement the most accurate low-friction behavior after explicit deliberation.
- Success criteria / acceptance:
  - Optional task fields no longer cause control-plane schema noise when missing.
  - Guard wrapper wiring uses the best available script path and avoids false negatives from missing repo-local scripts.
  - Guardrail summary/reporting reflects skipped guard execution even when command exit status is `0`.
  - Deliberation decisions remain enforced:
    - default guard profile remains `auto`.
    - strict marker set remains `AGENTS.md` + `tasks/index.json` + `docs/TASKS.md`.
    - strict mode keeps no-child-manifest as hard fail.

## Goals
- Remove false validation failures caused by `undefined` optional fields.
- Improve runner portability across repo-local vs packaged execution contexts.
- Make guardrail reporting trustworthy for merge decisions.

## Non-Goals
- Changing strict/warn policy defaults beyond the already approved deliberation outcome.
- Broad refactors outside the affected control-plane/guardrail surfaces.
- Any edits in `tower-defence` while that agent is active.

## Stakeholders
- Product: CO maintainer.
- Engineering: codex-orchestrator maintainers and downstream operators.
- Design/Docs: not primary.

## Metrics & Guardrails
- Primary Success Metrics:
  - Control-plane request validation no longer fails on missing optional task fields.
  - Guard wrappers run when either repo-local or package-local scripts are available.
  - Guardrail summary text correctly marks skipped guardrail runs.
- Guardrails / Error Budgets:
  - No behavior regression for existing strict/warn profile logic.
  - No new dependency or CLI surface additions.

## User Experience
- Personas: agent operators running docs-review/implementation-gate in CO and downstream repos.
- User Journeys:
  - Repo without local scripts still gets best-effort guard wrapper execution.
  - Guardrail summaries become decision-safe for PR merge monitoring.

## Technical Considerations
- Architectural Notes:
  - Small, targeted patches in request builder + runner utilities + manifest summarization.
  - Regression tests in control-plane + runner utility + manifest summary coverage.
- Dependencies / Integrations:
  - Existing `findPackageRoot` helper and command summary behavior.

## Open Questions
- None blocking for this patch.

## Approvals
- Product: user
- Engineering: user
- Design: n/a
