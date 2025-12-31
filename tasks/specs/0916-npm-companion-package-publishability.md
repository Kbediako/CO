---
id: 20251229-npm-companion-package-publishability
title: NPM Companion Package Publishability (Sterile Tarball)
relates_to: docs/PRD-npm-companion-package-publishability.md
risk: medium
owners:
  - Unassigned
last_review: 2025-12-29
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Define the packaging, CLI surface, and release guardrails required to publish Codex Orchestrator as a single npm package without leaking internal artifacts.
- Constraints:
  - Tarball must be sterile (runtime dist subtrees only: dist/bin/**, dist/orchestrator/**, dist/packages/**, dist/scripts/design/pipeline/**, dist/types/**; plus schemas/**, optional templates/**, README.md, LICENSE).
  - No postinstall hooks; telemetry default-off.
  - MCP stdio protocol must go to stdout only; logs to stderr (verify downstream `codex` output when delegating).
  - Templates must live under templates/ with README disclaimer + version marker; `init` is explicit and non-overwriting by default.
  - Review handoff stays non-interactive in CI (no TTY prompts).

## Proposed Changes
- Architecture / design adjustments:
  - Add `files` allowlist, `prepack`, pack audit, and smoke test.
  - Tighten pack audit to restrict `dist/` to runtime subtrees only.
  - Add `mcp serve`, `self-check`, `init codex`, and `doctor` CLI commands.
  - Introduce `imports` alias for schema resolution with fallback.
  - Add tag-driven release workflow that publishes from GitHub Release assets.
- Data model updates:
  - None to manifest schema; only location/resolution changes.
- External dependencies:
  - Optional peer deps for Playwright-class tooling.
  - GitHub release assets and npm trusted publishing for release pipeline.

## Impact Assessment
- User impact:
  - Clearer install and MCP registration flow; explicit init for templates.
- Operational risk:
  - Packaging errors could block release or ship wrong files.
- Security / privacy:
  - No postinstall; no network calls unless enabled; no writes into `node_modules`.

## Rollout Plan
- Prerequisites:
  - Pack audit + smoke test implemented and green in CI.
  - Docs-review manifest recorded before implementation.
- Testing strategy:
  - Schema resolver tests (imports alias + fallback), MCP stdout/stderr tests, init behavior tests.
- Launch steps:
  - Tag-driven release, publish from GitHub Release tarball, validate dist-tag.

## Open Questions
- Should we mandate a hard tarball size budget for the first release?

## Approvals
- Reviewer: approved (2025-12-29)
- Date: 2025-12-29
