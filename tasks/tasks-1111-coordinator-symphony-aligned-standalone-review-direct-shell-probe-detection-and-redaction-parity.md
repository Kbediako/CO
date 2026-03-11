# Task Checklist - 1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity

- MCP Task ID: `1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`
- TECH_SPEC: `tasks/specs/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`

> This lane follows `1110` by closing direct env-probe parity and shrinking shell-probe failure samples before broader standalone-review drift work resumes.

## Foundation

- [ ] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`, `tasks/specs/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`, `tasks/tasks-1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`, `.agent/task/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`.
- [ ] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1111-standalone-review-direct-shell-probe-detection-and-redaction-parity-deliberation.md`.

## Shared Registry + Review Handoff

- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [ ] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md`, `docs/findings/1111-standalone-review-direct-shell-probe-detection-and-redaction-parity-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1111`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-docs-first/05-docs-review-override.md`.

## Direct Shell-Probe Detection + Redaction

- [ ] Direct non-shell-wrapped env-probe commands count as shell probes in bounded review. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`.
- [ ] Shell-probe failure reasons and telemetry surface a smaller redacted probe sample rather than the full raw wrapper command line. Evidence: `scripts/lib/review-execution-state.ts`, `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [ ] Existing `1110` shell-wrapped probe behavior remains intact, including nested probes, mixed probe-plus-read commands, and valid non-probe inspection. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.
- [ ] Runtime-facing coverage proves repeated direct probes terminate bounded review with the redacted sample behavior. Evidence: `tests/run-review.spec.ts`, `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/08-diff-budget.log`, `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/10-pack-smoke.log`.
- [ ] Manual direct shell-probe parity evidence captured. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/11-manual-direct-shell-probe-check.json`.
- [ ] Elegance review completed. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity/manual/TODO-closeout/12-elegance-review.md`.
