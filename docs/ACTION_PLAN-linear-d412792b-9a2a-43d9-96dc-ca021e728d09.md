# ACTION_PLAN - CO-452 retire js_repl posture after Codex CLI 0.128.0 removal

## Summary
- Goal: remove active `js_repl` posture from CO docs/tests after Codex CLI `0.128.0` removed the feature.
- Scope: current-facing docs, cloud feature-toggle tests, stale `js_repl` canary script/package affordance, historical packet labeling, docs-first metadata.
- Assumptions: generic cloud feature flag support remains valid for non-removed feature names.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `js_repl`, `js_repl_tools_only`, `removed false`, `CODEX_CLOUD_ENABLE_FEATURES=js_repl`, `CODEX_CLOUD_DISABLE_FEATURES=js_repl`, `codex features enable js_repl`, `codex features disable js_repl`, `CO-449`, `CO-450`, `CO-451`.
- Not done if: any current-facing doc still recommends `js_repl` toggles; tests still encode `js_repl` as an active feature; historical packet docs can be mistaken for current posture.
- Pre-implementation issue-quality review: 2026-05-01 parent review confirms the lane must cover docs plus code/test surfaces and must not broaden into adjacent release-intake issues.
- Fallback / refactor decision: this lane removes stale default-on and break-glass guidance for a removed feature; it does not introduce or retain a fallback seam.
- Durable retention evidence: not applicable because the stale `js_repl` active posture is removed, while old evidence docs are retained only as history.
- Large-refactor check: no large refactor is required because CO-452 removes the stale `js_repl` active posture instead of adding another compatibility layer.
- Minor-seam check: the bounded minor-seam removal is acceptable because generic cloud feature pass-through remains intact while only removed-feature guidance and canary affordances are retired.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `js_repl` active posture guidance | default-on, break-glass, and cloud feature-contract guidance for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-03 | 2026-05-01 | immediate removal | current-facing docs no longer recommend `js_repl` enable/disable or cloud feature toggles | `rg`, docs checks, focused cloud feature tests |
| scripts/js-repl-usage-matrix.mjs | active canary matrix for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-02 | 2026-05-01 | immediate removal | package script and source checkout no longer expose the `js_repl` canary as current guidance | package script audit and focused cloud feature tests |

## Milestones & Sequencing
1. Create and register the CO-452 docs-first packet.
2. Capture docs-review evidence before implementation. Completed: `.runs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09-docs-review/cli/2026-04-30T23-45-07-409Z-1e813802/manifest.json`.
3. Update current-facing docs and remove the active `js_repl` canary affordance. Completed in current diff.
4. Update cloud feature pass-through tests to use non-removed examples. Completed in current diff.
5. Accept or reject the bounded child-lane patch for historical packet labeling. Child helper accept failed on Linear `updated_at` drift; parent manually imported the clean checked patch.
6. Run targeted and full validation, standalone review, elegance review, PR checks, and ready-review drain.

## Dependencies
- Active local Codex CLI `0.128.0` feature list evidence.
- CO-449 release intake remains the broader posture audit owner.
- Same-issue child lane `archive-js-repl-packet` owns only historical packet labeling.

## Validation
- Checks / tests:
  - focused cloud feature Vitest tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review and elegance review
- Rollback plan: revert the docs/test/script cleanup if it removes generic feature flag pass-through or mislabels historical evidence.

## Risks & Mitigations
- Risk: removing generic cloud feature controls while retiring `js_repl`.
  - Mitigation: tests continue to cover pass-through with non-removed feature names.
- Risk: old evidence docs keep looking current.
  - Mitigation: child lane labels those docs as history-only.
- Risk: scope expands into all `0.128.0` changes.
  - Mitigation: route adjacent posture findings through CO-449 or separate follow-up issues.

## Approvals
- Reviewer: parent provider worker self-review.
- Date: 2026-05-01.
