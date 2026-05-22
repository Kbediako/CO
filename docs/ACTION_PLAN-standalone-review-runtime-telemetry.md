# ACTION_PLAN - Standalone Review Runtime Bounding + Telemetry (0979)

## Summary
- Goal: eliminate ambiguous standalone review timeout behavior by adding bounded defaults and actionable telemetry.
- Scope: docs-first scaffolding, run-review wrapper changes, regression tests, and docs updates.
- Assumptions: current timeout/hang reports are primarily due to long-running review traversal/command selection, not MCP startup deadlock.

## Milestones & Sequencing
1) Docs-first scaffolding + evidence
- Draft PRD + TECH_SPEC + ACTION_PLAN + task checklist + mirror.
- Register task/spec + docs freshness entries.
- Capture docs-review manifest before runtime edits.
2) Runtime hardening implementation
- Add bounded review prompt guidance with env override.
- Add timeout/failure telemetry summary + artifact persistence.
3) Validation + review
- Run targeted wrapper tests and docs checks.
- Run tailored standalone/elegance review validation and mirror evidence in task files.

## Dependencies
- Existing wrapper tests (`tests/run-review.spec.ts`).
- Existing review artifact directory (`review/`).

## Validation
- Checks / tests:
  - `npm run test -- run-review`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Rollback plan:
  - Revert wrapper/test/doc changes for this task in one commit.

## Risks & Mitigations
- Risk: bounded prompt might reduce deep coverage.
  - Mitigation: explicit env override for thorough/heavy review commands.
- Risk: telemetry parser misclassifies command lines.
  - Mitigation: keep parser heuristic/simple, emit best-effort summaries only.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-25
