---
id: 20260426-co-361-first-post-v0-2-0-release-prep
title: CO-361 First Post-v0.2.0 Release Prep
status: in_progress
owner: Codex
created: 2026-04-26
last_review: 2026-06-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-co-361-first-post-v0-2-0-release-prep.md
related_action_plan: docs/ACTION_PLAN-co-361-first-post-v0-2-0-release-prep.md
related_tasks:
  - tasks/tasks-co-361-first-post-v0-2-0-release-prep.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-04-26: Clean-worktree audit confirmed the remaining release-prep blockers are stale public/package wording plus the version bump, not missing `0.125.0` local/package evidence on current `origin/main`.
---

# Technical Specification

## Context
Current `origin/main` already carries local ChatGPT-auth/appserver `gpt-5.5` posture and package/downstream-smoke Codex CLI `0.125.0` evidence on public/package-facing surfaces, but the repo still presents stale release metadata and book-summary posture wording for the next post-`v0.2.0` cut.

## Requirements
1. Bump the package version for the next release-prep branch.
2. Route the README historical package-docs link to `v0.2.0`.
3. Clarify version policy and the linked `docs/book/*` summaries so local ChatGPT-auth/appserver posture and package/downstream-smoke `0.125.0` compatibility are not hidden behind the separate cloud-only candidate hold.

## Validation
- `npm run build`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run pack:audit`
- `npm run pack:smoke`
- targeted local `codex` and npm posture checks before handoff
