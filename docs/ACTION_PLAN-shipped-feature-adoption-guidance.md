# ACTION_PLAN - Shipped Feature Adoption Guidance Hardening (0977)

## Summary
- Goal: improve global capability utilization in shipped CO by strengthening discoverability and in-flow guidance without changing core execution semantics.
- Scope: help quickstart, runtime text hints on `start`/`flow`, `doctor --usage` dedupe, and shipped skills guidance alignment.
- Assumptions: most users are agents; concise command-first guidance is highest leverage.

## Milestones & Sequencing
1) Docs-first bootstrap
- Finalize PRD/TECH_SPEC/ACTION_PLAN/checklist + task/spec registry entries.
- Capture delegated research/review evidence.
- Run docs-review and docs guards before code edits.

2) Simulation-first validation (mock/dummy repos)
- Build isolated dummy scenario workspace.
- Execute scenario matrix for low/mid/high adoption and JSON/noise checks.
- Calibrate hint policy if simulation indicates noisy recommendations.

3) Implementation (minimal Option set)
- Update help surfaces with quickstart guidance.
- Add runtime hint emission for text-mode `start`/`flow`.
- De-duplicate cloud recommendation messages in `doctor --usage`.
- Update shipped skill guidance snippets.
- Add regression tests for JSON safety and hint behavior.

4) Verification and review
- Run required validation chain.
- Run standalone post-implementation review.
- Run explicit elegance/minimality pass and simplify if needed.
- Record dogfood next steps for cross-repo usage monitoring.

## Dogfood Snapshot (2026-02-21)
- `tower-defence` (30d): runs=96, cloud=0, rlm=0, advanced_share=0%.
- `CO-0958-ui` (30d): runs=9, cloud=0, rlm=0, advanced_share=0%.
- `CO` (30d): runs=258, cloud=8, rlm=26, advanced_share=16.3%.

## Next After Dogfood
1) Run normal delivery work in `tower-defence` and `CO-0958-ui` with updated CO guidance for 1-2 weeks.
2) Re-check `codex-orchestrator doctor --usage --window-days 14` and `--window-days 30`.
3) Track cloud/RLM deltas; if still near zero, add compact follow-up examples (guidance only, no Option 3 implementation).
4) Keep Option 3 strictly backlog-only until telemetry shows persistent adoption plateau.

## Dependencies
- Existing `runDoctorUsage` recommendation logic.
- Existing command-surface test harness.
- Shipped skill bundle paths in `skills/`.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Rollback plan:
  - revert guidance changes if JSON contracts regress or hint-noise thresholds fail.

## Risks & Mitigations
- Risk: runtime hints leak into JSON output.
  - Mitigation: strict text-mode gating + dedicated tests.
- Risk: hint fatigue from noisy recommendations.
  - Mitigation: one hint max and recommendation dedupe.
- Risk: help text drift across printers.
  - Mitigation: add help-surface parity assertions in command-surface tests.

## Approvals
- Reviewer: user
- Date: 2026-02-21
