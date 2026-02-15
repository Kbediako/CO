# PRD - PR Watch-Merge CLI Command (0964)

## Summary
- Problem Statement: PR monitoring/quiet-window/auto-merge exists as a repo script (`scripts/pr-monitor-merge.mjs`), but npm/downstream users do not get this capability via a shipped `codex-orchestrator` command.
- Desired Outcome: Ship PR monitor/merge as a first-class CLI command (`codex-orchestrator pr watch-merge`) with behavior parity and clear docs/skill guidance.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Start the next high-impact task after PR 211, with shipped outcomes and low-friction operations.
- Success criteria / acceptance:
  - `codex-orchestrator pr watch-merge` is available in the shipped CLI.
  - Command supports quiet-window monitoring and optional auto-merge behavior.
  - Existing repo workflow (`npm run pr:watch-merge`) remains compatible.
  - Agent/SOP docs prefer shipped command and include fallback path.
  - Manual E2E evidence covers help output + dry-run monitor path.
- Constraints / non-goals:
  - Keep implementation minimal and behavior-focused.
  - No broad refactor of unrelated CLI surfaces.

## Goals
- Reduce friction for npm/downstream users by shipping PR monitor behavior directly in CLI.
- Standardize patient polling/quiet-window merge workflow in a single command surface.
- Preserve compatibility with existing script-based usage.

## Non-Goals
- Rewriting GH policy logic beyond parity requirements.
- Replacing existing review-loop SOP structure.

## Stakeholders
- Product: CO maintainers and downstream npm users.
- Engineering: Orchestrator CLI and release maintainers.

## Metrics and Guardrails
- Primary Success Metrics:
  - New CLI command resolves and executes with expected options.
  - Required CI/doc gates remain green with no regression.
  - Docs/skills consistently point to shipped command.
- Guardrails / Error Budgets:
  - Maintain deterministic non-interactive CLI behavior.
  - Keep diff budget within policy limits.

## User Experience
- Personas:
  - Maintainer monitoring PR checks until merge-safe.
  - Downstream user running CO from npm without repo script context.
- User Journeys:
  - User runs `codex-orchestrator pr watch-merge --help` and sees full options.
  - User monitors a PR in dry-run mode, then enables auto-merge when desired.

## Technical Considerations
- Architectural Notes:
  - Favor direct CLI command support over repo-only npm scripts.
  - Keep script parity so existing workflows do not break.
- Dependencies / Integrations:
  - `gh` CLI authentication and PR GraphQL/status endpoints.
  - Existing monitor logic in `scripts/pr-monitor-merge.mjs`.

## Open Questions
- Resolved in implementation: whether to share logic via module import vs wrapper delegation.

## Approvals
- Product: Approved by user (2026-02-14)
- Engineering: Pending implementation validation
- Design: N/A
