# TECH_SPEC - PR Watch-Merge CLI Command (0964)

## Summary
- Objective: Add a shipped `codex-orchestrator pr watch-merge` command with parity to current PR monitor semantics.
- Scope: CLI command wiring, behavior parity, docs/skill updates, tests, and validation evidence.
- Constraints: minimal scope; preserve existing script behavior and defaults.

## Technical Requirements
- Functional requirements:
  - Add `pr` command group with `watch-merge` subcommand in `bin/codex-orchestrator.ts`.
  - Support existing monitor flags (`--pr`, `--owner`, `--repo`, `--interval-seconds`, `--quiet-minutes`, `--timeout-minutes`, `--merge-method`, `--auto-merge`, `--no-auto-merge`, `--delete-branch`, `--no-delete-branch`, `--dry-run`).
  - Preserve current env var semantics (`PR_MONITOR_*`).
  - Keep repo script path available (`npm run pr:watch-merge`).
- Non-functional requirements:
  - Non-interactive-safe execution with clear errors.
  - Deterministic help text and exit codes.
  - No dependence on local repo-only files for shipped command behavior.
- Interfaces / contracts:
  - CLI help includes new `pr watch-merge` command.
  - Existing command surfaces remain backward compatible.

## Implementation Plan
1. Add CLI handler for `pr watch-merge` and integrate monitor logic.
2. Add/adjust tests for command-surface coverage.
3. Update docs/SOP/skill references to prefer shipped command with fallback.
4. Validate using required guardrail lane + manual E2E.

## Risks & Mitigations
- Risk: Divergence between script and shipped CLI behavior.
  - Mitigation: keep parity-focused logic and document fallback.
- Risk: Packaging omissions for runtime dependencies.
  - Mitigation: ensure command logic ships within included dist paths.
- Risk: PR automation misuse.
  - Mitigation: keep explicit flags, dry-run support, and quiet-window constraints.

## Validation Strategy
- Automated:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Manual:
  - `codex-orchestrator pr watch-merge --help`
  - dry-run monitor invocation with explicit PR id.

## Rollout & Rollback
- Rollout: ship in next npm patch/minor with docs updated.
- Rollback: remove `pr watch-merge` command wiring and restore previous docs.
