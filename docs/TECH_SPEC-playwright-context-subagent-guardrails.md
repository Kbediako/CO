# TECH_SPEC - Playwright Context Control + Subagent Guardrails (0969)

## Summary
- Standardize a policy pattern for high-output browser automation:
  - run Playwright-heavy actions in dedicated subagents,
  - return artifact paths + concise summaries to parent,
  - avoid raw snapshot/network/console dumps in parent context.
- Keep MCP posture explicit: Playwright MCP is relevant-only/opt-in.
- Fix local wrapper compatibility with current `@playwright/mcp` executable.

## Design

### 1) Shipped policy updates (repo)
- Touchpoints:
  - `docs/AGENTS.md`
  - `docs/guides/collab-vs-mcp.md`
  - `skills/collab-subagents-first/SKILL.md`
  - `skills/delegation-usage/SKILL.md`
  - `skills/delegation-usage/DELEGATION_GUIDE.md`
- Behavior:
  - Add explicit high-output stream guidance for Playwright/browser workflows.
  - Keep guidance non-blocking but normative.

### 2) Local/global skill compatibility + low-noise guidance
- Touchpoints:
  - `/Users/kbediako/.codex/skills/playwright/scripts/playwright_cli.sh`
  - `/Users/kbediako/.codex/skills/playwright/SKILL.md`
  - `/Users/kbediako/.codex/skills/playwright/references/workflows.md`
  - `/Users/kbediako/.codex/skills/frontend-testing/SKILL.md`
  - `/Users/kbediako/.codex/skills/frontend-design-review/SKILL.md`
  - `/Users/kbediako/.codex/skills/develop-web-game/SKILL.md`
- Behavior:
  - Use `playwright-mcp` executable via `npx --package @playwright/mcp@latest`.
  - Add guidance to capture artifacts in files and summarize briefly in parent.

## Validation
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
  - Run legacy wrapper command (expect prior failure baseline).
  - Run updated wrapper command (expect success).
  - Capture concise logs in `out/0969-playwright-context-subagent-guardrails/manual/`.
