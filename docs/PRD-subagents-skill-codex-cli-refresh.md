# PRD — Subagents Skill + Codex CLI Refresh Helper

## Summary
- Problem Statement: Codex CLI updates land frequently, but downstream users lack a simple, repo-relative workflow to sync upstream, update forks, and rebuild the CO-managed CLI; subagent usage guidance exists but is not centralized in a global skill + global AGENTS.md.
- Desired Outcome: Provide a repo-relative refresh script for downstream users plus a global subagent-first skill and global AGENTS.md that reinforce constant subagent usage and link to existing delegation skills.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Make Codex CLI updates fast and repeatable for downstream users, and provide a global skill + AGENTS guidance that keeps subagent usage consistent.
- Success criteria / acceptance: Repo includes a path-agnostic refresh script; README mentions it; global skill exists and links to delegate-early + delegation-usage; global AGENTS.md links to all three skills and includes the required “ALWAYS wait…” line.
- Constraints / non-goals: Do not ship a prebuilt Codex binary; keep script simple and safe; avoid heavy new tooling.

## Goals
- Create a repo-relative `scripts/codex-cli-refresh.sh` for downstream use.
- Provide a global subagent-first skill that links to `delegate-early` and `delegation-usage`, with fallback to bundled skills when globals are unavailable.
- Add a global `~/.codex/AGENTS.md` emphasizing constant subagent usage and linking to the three skills.

## Non-Goals
- Shipping or pinning prebuilt Codex CLI binaries.
- Introducing new CI pipelines or release artifacts.
- Reworking existing delegation or collab infrastructure.

## Stakeholders
- Product: Codex Orchestrator maintainers.
- Engineering: Codex CLI + Orchestrator users (downstream).
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics: Script adoption for updates; reduced manual steps for Codex CLI refresh.
- Guardrails / Error Budgets: Script remains path-agnostic and does not mutate repo state beyond fast-forward + optional push.

## User Experience
- Personas: Maintainers and downstream users who rebuild Codex CLI often.
- User Journeys: Run one command to sync upstream, update fork, and rebuild managed CLI.

## Technical Considerations
- Architectural Notes: Script should respect `CODEX_REPO`/`CODEX_CLI_SOURCE` and fall back to a sane default.
- Dependencies / Integrations: Requires git + cargo and an available `codex-orchestrator` binary.

## Open Questions
- None.

## Evidence
- Docs-review: `.runs/0956-subagents-skill-codex-cli-refresh/cli/2026-01-23T01-56-28-788Z-ee539ceb/manifest.json` — docs checks for this PRD/TECH_SPEC/ACTION_PLAN and related skill guidance.
- Implementation-gate: `.runs/0956-subagents-skill-codex-cli-refresh/cli/2026-01-23T01-58-35-130Z-8146c3ea/manifest.json` — build/lint/test/docs/review evidence covering the subagent guidance updates.

## Approvals
- Product:
- Engineering:
- Design:
