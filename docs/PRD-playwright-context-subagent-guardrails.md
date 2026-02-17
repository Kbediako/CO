# PRD - Playwright Context Control + Subagent Guardrails (0969)

## Summary
- Problem Statement: Playwright-heavy workflows can emit large snapshots/log streams that rapidly consume parent context and trigger compaction, reducing stability for long-horizon orchestration.
- Desired Outcome: make high-output browser operations predictable and low-noise through subagent routing, minimal parent summaries, and clear MCP enablement defaults.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): reduce context-window blowups from Playwright usage in real agent workflows without adding friction, and align shipped/global guidance so downstream users get the same behavior.
- Success criteria / acceptance:
  - Shipped docs/skills explicitly steer Playwright-heavy work into dedicated subagents with summary-only parent handoff.
  - Guidance explicitly keeps Playwright MCP opt-in/relevant-only instead of broad always-on usage.
  - Local global Playwright wrapper works with current MCP package entrypoints.

## Goals
- Improve reliability of long-running agent sessions by reducing parent-context churn from browser artifacts.
- Preserve agent autonomy by standardizing a minimal delegation pattern for browser-heavy streams.
- Keep downstream adoption friction low via concise, consistent guidance.

## Non-Goals
- Building a new Playwright orchestration subsystem.
- Enforcing hard runtime blocks on users who choose direct Playwright usage.
- Refactoring unrelated orchestration features.

## Stakeholders
- Product: CO maintainer focused on agent-first outcomes.
- Engineering: codex-orchestrator maintainers and downstream agent operators.
- Design/Docs: skill and workflow guidance maintainers.

## Metrics & Guardrails
- Primary Success Metrics:
  - Reduced anecdotal/observed parent context blowups during browser-heavy tasks.
  - Cleaner parent summaries with artifacts-first evidence paths.
- Guardrails / Error Budgets:
  - No regression to delegation lifecycle hygiene.
  - No new mandatory setup burden for repos not using Playwright.

## User Experience
- Personas: top-level agents coordinating multi-step implementation/review tasks.
- User Journeys:
  - Agent detects browser-heavy validation need -> spawns focused subagent -> receives concise summary and artifact paths.
  - Agents enable Playwright MCP only for relevant streams.
  - Skill commands run successfully without stale executable assumptions.

## Technical Considerations
- Architectural Notes:
  - Policy-only shipped changes in docs/skills.
  - Local skill runtime compatibility fix for wrapper command.
- Dependencies / Integrations:
  - Depends on installed `@playwright/mcp` package behavior (`playwright-mcp` entrypoint).

## Open Questions
- None blocking.

## Approvals
- Product: user
- Engineering: user
- Design: user
