# ACTION_PLAN - JS_REPL + Cloud Usage Evidence Gate

## Summary
- Goal: produce decision-grade evidence for `js_repl` usage guidance via broad dummy-repo local+cloud simulations, then update global guidance docs.
- Scope: docs-first scaffolding, delegated discovery streams, minimal automation, matrix execution, and synchronized checklists/index/docs.
- Assumptions: cloud environment access remains available for required cloud canary contracts.

## Milestones & Sequencing
1) Docs-first artifacts + task registration/mirrors + delegated stream capture.
2) Implement minimal matrix automation (`runtime-mode-canary` + looped cloud canary coverage + summary artifact).
3) Execute local+cloud dummy-repo matrix and capture evidence logs/manifests.
4) Apply global guidance doc updates from validated evidence.
5) Run ordered guardrails/validation, sync mirrors, and publish recommendation decision.

## Dependencies
- Existing scripts: `scripts/runtime-mode-canary.mjs`, `scripts/cloud-canary-ci.mjs`, `scripts/pack-smoke.mjs`, `scripts/run-review.ts`.
- Codex CLI + cloud credentials/branch availability.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs --task 0990-js-repl-cloud-usage-evidence-gate`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Reviewer hand-off note: `NOTES` must include `<goal + summary + risks>`.
- Rollback plan:
  - If matrix evidence is unstable or fails required lanes, keep `js_repl` policy in `defer/hold` state and avoid default guidance changes.

## Risks & Mitigations
- Risk: cloud variability causes false confidence.
- Mitigation: multi-iteration runs with explicit per-lane summaries and rerun thresholds.
- Risk: docs drift across global surfaces.
- Mitigation: prioritize P0 surfaces (`AGENTS.md`, `docs/AGENTS.md`, `README.md`, key guides) and mirror in checklist evidence.
