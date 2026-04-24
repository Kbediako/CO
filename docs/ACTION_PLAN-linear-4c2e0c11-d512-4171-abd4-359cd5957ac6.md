# ACTION PLAN - CO: Rebaseline Marketplace Docs and Pack-Smoke for Codex 0.125

## Summary
- Goal: complete CO-355 by aligning public marketplace docs, pack-smoke behavior/tests, and version-policy release-smoke pin posture with Codex CLI `0.125.0`.
- Scope: docs-first packet, current CLI/npm evidence, same-issue child lane for pack-smoke behavior/tests, parent docs/version-policy/workflow integration, validation, review, and PR handoff.
- Assumptions: local `/opt/homebrew/bin/codex` is the current canary binary for command-surface evidence, npm latest is verified during the lane, and release-facing pins move only if `npm run pack:smoke` canary evidence passes on the final candidate.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-355`, Codex CLI `0.125.0`, `codex plugin marketplace add`, `upgrade`, `remove`, `pack:smoke`, `README.md`, `docs/public/downstream-setup.md`, `docs/guides/codex-version-policy.md`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `tests/marketplace-launcher.spec.ts`, `@openai/codex@0.125.0`.
- Not done if: public docs still recommend top-level `codex marketplace add` for current Codex, pack-smoke is promoted without canary evidence, or remote install / marketplace upgrade support is ignored.
- Pre-implementation issue-quality review: approved. This is not a micro-task because correctness depends on exact CLI command names, public docs, workflow pins, and cross-version pack-smoke behavior.

## Milestones & Sequencing
1. Create docs-first packet, task mirrors, registry rows, and workpad matrix.
2. Capture current CLI/npm command-surface evidence for `0.125.0`.
3. Use the child pack-smoke lane for behavior/tests and integrate an accepted patch or parent-equivalent fix.
4. Update README, downstream setup docs, version policy, and release-facing workflow pins according to canary evidence.
5. Run focused tests and required validation floor, then manifest-backed review, elegance pass, PR attachment, and ready-review drain.

## Dependencies
- Local Codex CLI `0.125.0` command help.
- npm registry metadata for `@openai/codex`.
- Same-issue child-lane result for pack-smoke behavior/tests.
- GitHub workflow pin decision after canary evidence.

## Validation
- Checks / tests:
  - `codex plugin marketplace add --help`
  - `codex plugin marketplace upgrade --help`
  - `codex plugin marketplace remove --help`
  - `codex marketplace add --help` expected failure on `0.125.0`
  - focused pack-smoke / marketplace tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan: revert docs, workflow pin, pack-smoke, and test edits together; version policy should return to the last known conservative release-smoke pin rationale if canary evidence fails.

## Risks & Mitigations
- Risk: current local `0.125.0` behavior differs from CI-installed package behavior. Mitigation: use npm-installed `@openai/codex@0.125.0` for pack-smoke canary before moving release-facing pins.
- Risk: older supported pins still require top-level `codex marketplace add`. Mitigation: keep explicit legacy fallback tests.
- Risk: docs overstate active CO target promotion. Mitigation: version-policy wording must limit this lane to marketplace/release-smoke compatibility unless broader canaries are provided.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-04-24
