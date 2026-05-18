# ACTION_PLAN: CO-268 Marketplace Docs And Smoke Coverage Rebaseline To Codex 0.122 Plugin Marketplace Commands

## Summary
- Goal: Replace stale `codex marketplace ...` marketplace setup/removal guidance and smoke coverage with Codex CLI `0.122.0` `codex plugin marketplace ...` truth.
- Scope: docs-first packet, public docs child lane, launcher recovery text, pack-smoke detection/invocation/messages, focused tests, smoke workflow pins, version-policy lineage, validation, review, PR handoff.
- Assumptions: npm remains the baseline install path; CO-196 packaging assets remain valid; `0.122.0` posture promotion is handled outside this issue.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `Codex CLI 0.122.0`, `rust-v0.122.0`, `codex plugin marketplace add`, `codex plugin marketplace remove`, `codex marketplace add`, `README.md`, `docs/public/downstream-setup.md`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `plugins/codex-orchestrator/launcher.mjs`, `CO-196`.
- Not done if: stale public docs, launcher guidance, pack-smoke logic, or tests still use the old command as the current `0.122.0` path; rollback/removal omits `codex plugin marketplace remove`; npm or packaging boundaries change.
- Pre-implementation issue-quality review: 2026-04-21 parent review approved the issue as narrow enough for implementation after the Rework reset and child-lane split.

## Milestones & Sequencing
1. Reset Rework state: close stale PR, delete old workpad, create fresh branch from `origin/main`, seed workpad, record parallelization, and launch docs child lane.
2. Create docs-first packet and registry mirrors before implementation.
3. Capture official release and local command evidence.
4. Implement parent-owned launcher, pack-smoke, tests, version-policy lineage, and smoke workflow pin changes.
5. Accept/reject child public-docs patch; avoid parent edits in child-owned files until resolved.
6. Run focused validation, full required gates, standalone review, and elegance pass.
7. Open/attach replacement PR, run `pr ready-review`, refresh workpad, and hand off only after clean drain.

## Dependencies
- `openai/codex` release `rust-v0.122.0`.
- Local `codex-cli 0.122.0`.
- Existing CO-196 packaging path and CO-269 posture lineage.
- Same-issue public docs child lane `public-docs-command-surface`.

## Validation
- Checks / tests:
  - `gh release view rust-v0.122.0 --repo openai/codex --json tagName,name,publishedAt,url,isDraft,isPrerelease`
  - `codex --version`
  - `codex marketplace add --help`
  - `codex plugin marketplace add --help`
  - `codex plugin marketplace remove --help`
  - `npm run test:orchestrator -- tests/pack-smoke.spec.ts`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review`
  - `npm run pack:smoke`
- Rollback plan: revert this command-surface rebaseline PR. No data migration or package architecture rollback is required.

## Risks & Mitigations
- Risk: accidentally broadening into Codex `0.122.0` posture promotion. Mitigation: docs and PR text state active posture is out of scope.
- Risk: parent/child lane edit collision. Mitigation: parent avoids child-owned public docs until patch resolution.
- Risk: stale docs freshness baseline blocks unrelated gates. Mitigation: classify failures against current `origin/main` and create/reuse canonical follow-up only if this diff introduces new baseline debt.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-21
