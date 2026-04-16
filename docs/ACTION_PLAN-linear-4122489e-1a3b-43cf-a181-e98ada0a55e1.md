# ACTION PLAN - CO Codex CLI 0.121.0 Adoption Posture

## Summary
- Goal: decide and document CO's Codex CLI `0.121.0` compatibility/adoption posture after local baseline drift from the documented `0.118.0` target.
- Scope: docs-first packet, official release/npm evidence, local CLI evidence, runtime/cloud gate evidence or blockers, auth-profile rotation validation, active truth-surface updates, validation, review, and PR handoff.
- Assumptions: local `codex --version` reports `codex-cli 0.121.0`; promotion remains blocked unless required cloud evidence passes or an explicit policy waiver is recorded.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - Codex CLI `0.121.0`
  - Codex CLI `0.118.0`
  - `rust-v0.121.0`
  - `@openai/codex`
  - `codex exec`
  - `codex exec resume`
  - `codex review --help`
  - `codex login --device-auth`
  - `codex marketplace add --help`
  - app-server/MCP help
  - runtime-mode canary
  - required cloud canary
  - fallback cloud canary
  - multiple GPT/Codex auth profiles
- Not done if:
  - the final posture is only a version-string edit
  - release/npm facts are missing timestamps
  - cloud gates are neither run nor explicitly blocked/waived with exact class evidence
  - auth-profile rotation lacks command/config boundary validation
  - provider-worker/review-wrapper/delegation/appserver assumptions lack current proof
- Pre-implementation issue-quality review:
  - approved. The issue is a parity/alignment lane with explicit protected terms, a reference/current/target matrix, strong non-goals, and a required cloud/auth evidence bar.

## Milestones & Sequencing
1. Claim issue, inspect live workflow states, create workpad, transition to `In Progress`, record `parallelize_now`, and launch the bounded `release-facts` child lane.
2. Register the docs-first packet in `tasks/index.json`, `docs/TASKS.md`, `.agent/task/`, and `docs/docs-freshness-registry.json`.
3. Run docs-review before implementation and record manifest/fallback evidence.
4. Collect official release/npm evidence and local CLI help evidence under the issue packet.
5. Run runtime-mode, required cloud, and fallback cloud canaries or exact blocker commands.
6. Validate auth-profile rotation at the safe command/config boundary and file a linked Bug only if a reusable bug is reproduced.
7. Write the adoption matrix and final promote/hold decision.
8. Update active policy/docs/checklists consistently with the decision.
9. Run required validation, standalone review, elegance pass, open/attach PR, drain automated feedback, and hand off to `In Review`.

## Dependencies
- Official `openai/codex` GitHub release page for `rust-v0.121.0`.
- OpenAI Codex changelog.
- npm registry metadata for `@openai/codex`.
- Local Codex CLI installation.
- Cloud canary credentials/environment for required cloud contract, or exact blocker evidence if absent.
- Existing docs-catalog and docs-hygiene posture checks.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `node scripts/runtime-mode-canary.mjs`
  - required/fallback `npm run ci:cloud-canary` variants or exact blocker artifacts
  - auth-profile rotation boundary proof
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review and explicit elegance pass
- Rollback plan: revert posture/policy edits and leave `0.118.0` as the target with the `0.121.0` audit/hold rationale preserved.

## Risks & Mitigations
- Risk: local-only `0.121.0` help compatibility masks cloud contract drift.
  - Mitigation: required cloud gate evidence remains a hard promotion item.
- Risk: `marketplace add` release facts are mistaken for CO marketplace packaging adoption.
  - Mitigation: classify marketplace support as compatible/no-op for this lane and keep packaging explicitly out of scope.
- Risk: auth-profile rotation validation leaks sensitive account details.
  - Mitigation: validate through help/config boundary and redacted status summaries only.
- Risk: app-server and exec-server improvements are mistaken for provider-worker supervision migration.
  - Mitigation: keep provider workers on the existing `codex exec` / `codex exec resume` seam unless a separate authority-guarded lane lands.

## Approvals
- Docs-review: succeeded at `.runs/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1-co-195-docs-review-r3/cli/2026-04-15T23-10-57-461Z-e2b822df/manifest.json`.
- Posture decision: hold `0.118.0`; `0.121.0` is latest audited candidate, blocked from promotion by missing `CODEX_CLOUD_ENV_ID`.
- Standalone review: bounded success at `.runs/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1-co-195-docs-review-r3/cli/2026-04-15T23-10-57-461Z-e2b822df/review/telemetry.json`; P2 checklist-consistency finding resolved in both task mirrors.
- Elegance review: completed with no simplification needed; evidence at `out/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1/manual/elegance-review/elegance-review.md`.
- Date: 2026-04-16
