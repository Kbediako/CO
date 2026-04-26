# ACTION_PLAN - CO-361 First Post-v0.2.0 Release Prep

## Summary
- Goal: prepare a clean release PR for the first post-`v0.2.0` release without publishing it.
- Scope: docs-first packet, bounded public/package posture updates (`README.md`, `docs/guides/codex-version-policy.md`, and the live `docs/book/*` posture summaries they front), and release-prep validation.
- Assumptions: current `origin/main` already contains the needed `0.125.0` local/package evidence; the remaining work is truthfulness and semver prep, not runtime enablement.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `first post-v0.2.0 release lane`, `gpt-5.5`, `Codex CLI 0.125.0 adoption evidence`, `not lazily hold appserver work`, `README.md`, `docs/guides/codex-version-policy.md`, `docs/book/public-posture.md`, `docs/book/README.md`, `docs/book/codex-cli-0124-adoption.md`, `package.json`, `package-lock.json`, `npm run pack:smoke`.
- Not done if: version bump lands without the public/package-surface fixes, or if the lane drifts into publish/tag/merge work.
- Pre-implementation issue-quality review: current audit says the release-prep blocker is stale public/package posture wording, not missing `0.125.0` release-workflow or pack-smoke support on `main`.

## Milestones & Sequencing
1. Register CO-361 docs-first packet and task mirrors.
2. Run docs-review from the clean worktree using the documented local-child fallback if delegation MCP cannot target that path.
3. Apply the minimal release-prep diff: version bump, README historical-doc route, version-policy clarification, and release-facing book-summary corrections.
4. Run targeted posture checks plus build/docs/pack validation.
5. Report whether the branch is release-PR ready and list any hard holds.

## Dependencies
- Current installed `codex` CLI
- npm registry access
- clean `origin/main` worktree

## Validation
- Checks / tests:
  - `codex --version`
  - `codex debug models`
  - `codex app-server --help`
  - `npm run build`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run pack:audit`
  - `npm run pack:smoke`
- Rollback plan:
  - drop the release-prep branch/worktree and keep `origin/main` untouched if the package/docs posture cannot be made truthful without broader follow-up work.

## Risks & Mitigations
- Risk: docs-review/delegation evidence is blocked by the delegation MCP path allowlist.
  - Mitigation: record the exact `repo_not_permitted` / `runs_root not permitted` blocker and use a local orchestrator child run with `DELEGATION_GUARD_OVERRIDE_REASON`.
- Risk: package smoke fails on the current `0.125.0` marketplace contract.
  - Mitigation: stop immediately, capture the exact output, and report it as a release blocker rather than weakening the smoke.

## Approvals
- Reviewer: parent release worker audit
- Date: 2026-04-26
