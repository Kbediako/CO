# ACTION_PLAN - CO Codex CLI 0.124.0 and GPT-5.5 Posture

## Summary
- Goal: complete CO-341 as a single evidence-gated posture lane for Codex CLI `0.124.0`, `gpt-5.5`, hooks/config hygiene, and workflow pins.
- Scope: source evidence, local probes, docs/tests/config alignment, smoke-command compatibility, validation, review, PR, and Linear handoff.
- Assumptions: the per-issue workspace is isolated; `/Users/kbediako/Code/CO` shared root remains dirty and read-only for this lane.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserved in the PRD and TECH_SPEC with all CO-341 exact surface names.
- Not done if: evidence gaps are hidden, cloud unsupported surfaces are promoted, or local config/hook warnings are left untracked.
- Pre-implementation issue-quality review: approved for docs-first execution because the issue is a high-risk posture/alignment lane with exact naming and parity requirements.

## Milestones & Sequencing
1. Record workflow state, workpad, pre-turn decomposition matrix, parallelization decision, and same-issue child-lane result.
2. Capture source, local, delegated, review, provider-worker/app-server, command-surface, config, hook, CO STATUS, runtime, cloud, and marketplace evidence.
3. Run docs-review on the docs packet before implementation edits.
4. Apply the smallest posture/config/workflow/test updates supported by evidence.
5. Run validation floor, post-build canaries, standalone review, elegance pass, PR creation/attachment, ready-review drain, and Linear review transition.

## Dependencies
- OpenAI docs MCP and official GitHub release page for source evidence.
- Current local `codex-cli 0.124.0` with ChatGPT auth.
- `CODEX_CLOUD_ENV_ID` and connector availability for required cloud canary.
- `npm run build` before runtime/cloud canary scripts that require packaged `dist/bin/codex-orchestrator.js`.

## Validation
- Checks / tests: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, manifest-backed review, elegance review, and `npm run pack:smoke` if smoke/package surfaces change.
- Rollback plan: revert CO-341 posture edits and keep evidence-only docs if any required runtime/cloud/marketplace validation fails.

## Risks & Mitigations
- Risk: local ChatGPT-auth `gpt-5.5` success is mistaken for Cloud/API availability. Mitigation: document Cloud/API hold buckets separately.
- Risk: marketplace command rename breaks `pack:smoke`. Mitigation: update script/tests only after local `plugin marketplace add` proof and rerun `pack:smoke`.
- Risk: runtime/cloud scripts fail before semantics due missing build output. Mitigation: record the pre-build failure, run `npm run build`, and rerun.
- Risk: shared checkout dirt contaminates the lane. Mitigation: keep all writes in the isolated CO-341 worktree.
- Current status: implementation, validation floor, final forced standalone review, and elegance review are complete; PR attachment, checks, latest `origin/main`, and `pr ready-review` drain remain before handoff.

## Approvals
- Reviewer: docs-review child stream passed after merging current `origin/main`; final forced standalone review and elegance review completed.
- Date: 2026-04-24
