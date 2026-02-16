# PRD - PR Watch Required-Checks Gate + Review Artifacts Guide (0967)

## Summary
- Problem Statement: `codex-orchestrator pr watch-merge` currently blocks on any pending check context from GraphQL rollup. Optional review bots (for example CodeRabbit) can remain pending for long periods and keep PRs in `UNSTABLE`, even when required checks are already green.
- Desired Outcome: keep both CodeRabbit and Codex review value, but make merge automation gate on required checks (plus existing safety gates), and add a clear guide for where review prompt/output artifacts are written.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): keep dual PR review signal quality while removing automation friction from non-required pending checks, and provide downstream-friendly docs for review artifacts in `.runs`.
- Success criteria / acceptance:
  - `pr watch-merge` can progress when required checks are green even if optional checks remain pending.
  - Existing safety guards remain intact (`do-not-merge`, unresolved threads, failing required checks, non-open state).
  - A `docs/guides/review-artifacts.md` guide exists and is linked from discoverable docs/help surfaces.

## Goals
- Update PR watch/merge gating to prefer required-check status (`gh pr checks --required`).
- Keep CodeRabbit enabled; do not disable its reviews or commit status globally.
- Add and link a concise review-artifacts guide for agents/downstream users.

## Non-Goals
- Disabling CodeRabbit or removing Codex review comments.
- Changing GitHub branch protection policy directly from the repo.
- Reworking the full PR monitor architecture.

## Stakeholders
- CO maintainers and agents relying on `pr watch-merge` for long polling/auto-merge.
- Downstream npm users using shipped monitor workflows.
- Review bots (CodeRabbit + Codex) as complementary signal sources.
