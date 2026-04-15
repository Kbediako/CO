---
id: 20260414-linear-df69fabe-63c2-4b98-a226-9c37892b4f9d
title: CO Codex CLI 0.119/0.120 Adoption and Spark File-Search Policy
relates_to: docs/PRD-linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md
risk: high
owners:
  - Codex
last_review: 2026-04-14
---

## Canonical Reference
- Task spec: `tasks/specs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`
- PRD: `docs/PRD-linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`
- Task checklist: `tasks/tasks-linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`

## Summary
CO-183 expands the CO-180 `0.120.0` command-surface audit into a release-note-driven adoption decision for official `0.119.0` and `0.120.0` changes. It also changes the spark role contract: `gpt-5.3-codex-spark` / `explorer_fast` is allowed only for file/codebase search, not synthesis or broad exploration.

## Requirements
- Preserve official release-note evidence for `rust-v0.119.0` and `rust-v0.120.0`.
- Preserve local help/version evidence for `codex --version`, `codex --help`, `codex exec --help`, `codex review --help`, `codex mcp --help`, `codex app-server --help`, and `codex exec-server --help`.
- Produce an adoption matrix that classifies MCP/custom-server/resources/file-upload/elicitations, MCP `outputSchema`, `tool_search` ordering, app-server stdio/ws/auth/remote `--cd`, exec-server, Realtime v2 / Agent Turn API, review/exec prompt surfaces, cwd/session transcript export, rollout recorder/app-server cleanup/TLS fixes, runtime canary, required cloud canary, and cloud fallback.
- Decide promote versus hold for the documented Codex CLI target. If hold remains required, record `0.120.0` as the latest stable candidate with the exact blocker.
- Update spark policy across docs, templates, skills, defaults setup, doctor/defaults surfaces, and tests to file-search/codebase-search-only.
- Evaluate delegation MCP `outputSchema` adoption in `orchestrator/src/cli/delegationServerToolDispatchShell.ts` and either implement schema-backed outputs plus tests or document the no-op/hold reason.
- Run a real `0.120.0` scoped review-wrapper prompt transport canary and keep/remove fallback behavior based on evidence.
- Run or explicitly block runtime-mode canary, required cloud canary, and cloud fallback contract.
- Keep app-server/exec-server remote control behind the guarded resident-session/control authority lane.

## Evidence
- Parent evidence root: `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/`.
- Run root: `.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/`.
- Child evidence lane: same-issue child lane `release-audit` owns `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/release-audit.md`.
- CO-180 reference: `docs/TECH_SPEC-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md` and `tasks/tasks-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`.

## Validation Plan
- Required gates: delegation guard, spec guard, build, lint, test, docs check, docs freshness, repo stewardship, diff budget, manifest-backed standalone review, elegance pass, and PR ready-review drain before handoff.
- Focused checks: docs-hygiene tests for spark file-search-only wording; Codex defaults tests for role description/template; doctor/defaults tests where practical; outputSchema tests if schema-backed output is adopted.
- Canary checks: runtime-mode canary, required cloud canary, cloud fallback, and scoped review-wrapper prompt transport canary.

## Approvals
- Docs-review: passed via `.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-co-183-docs-review-r2/cli/2026-04-14T23-00-44-902Z-abb6e4bf/manifest.json`.
- Standalone review: passed as bounded-success via `../../.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/cli/2026-04-14T22-49-28-802Z-039d36f2/review/telemetry.json`.
- Elegance review: passed via `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/elegance-review.md`.
- Review handoff: blocked by CO-184 spec/docs freshness baseline.
- Date: 2026-04-14
