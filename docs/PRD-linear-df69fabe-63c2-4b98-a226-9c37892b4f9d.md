# PRD - CO Codex CLI 0.119/0.120 Adoption and Spark File-Search Policy

## Summary
CO-180 confirmed local `codex-cli 0.120.0` command-surface compatibility and held the active target at `0.118.0` because the required cloud canary could not run without `CODEX_CLOUD_ENV_ID`. CO-183 supersedes that narrow posture check with a release-note-driven adoption lane for official `rust-v0.119.0` and `rust-v0.120.0` changes, plus a stricter policy that `gpt-5.3-codex-spark` / `explorer_fast` is file-search/codebase-search-only.

## User Request Translation
- Preserve official release-note evidence for `https://github.com/openai/codex/releases/tag/rust-v0.119.0` and `https://github.com/openai/codex/releases/tag/rust-v0.120.0`.
- Re-check local `codex --version` and the relevant help surfaces for `exec`, `review`, `mcp`, `app-server`, and `exec-server`.
- Produce an adoption matrix that classifies each relevant upstream change as adopt, hold, no-op, or blocked with evidence.
- Decide whether the documented CO compatibility/adoption target can promote to `0.120.0`; if blocked, record `0.120.0` as the latest stable candidate and keep the exact blocker visible.
- Restrict spark role usage to file/codebase search only across docs, templates, skills, default setup output, doctor/defaults tests, and docs drift guards.

## Intent Checksum
Protected terms: Codex CLI `0.119.0`, Codex CLI `0.120.0`, latest stable, `gpt-5.3-codex-spark`, `explorer_fast`, file-search-only, codebase-search-only, MCP `outputSchema`, `tool_search` result ordering, app-server, exec-server, remote control, `codex review`, `codex exec`, cloud canary, runtime-mode canary, CO-180.

Protected surfaces: `docs/guides/codex-version-policy.md`, `AGENTS.md`, `docs/AGENTS.md`, `README.md`, `docs/README.md`, `docs/public/downstream-setup.md`, `templates/codex/AGENTS.md`, `templates/codex/.codex/config.toml`, `templates/codex/.codex/agents/explorer-fast.toml`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`, `skills/collab-subagents-first/SKILL.md`, `orchestrator/src/cli/codexDefaultsSetup.ts`, `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/doctorUsage.ts`, `scripts/docs-hygiene.ts`, `scripts/lib/docs-catalog.js`, `docs/docs-catalog.json`, `orchestrator/src/cli/delegationServerToolDispatchShell.ts`, `scripts/run-review.ts`, `scripts/lib/review-launch-attempt.ts`, `scripts/runtime-mode-canary.mjs`, `scripts/cloud-canary-ci.mjs`, and focused tests for docs/defaults/doctor/runtime/cloud posture.

Wrong interpretations to reject: a version-string-only bump, keeping spark available for synthesis/planning/review because it is text-only, making app-server or exec-server remote control the provider-worker default without the guarded authority seam, claiming full `0.120.0` adoption while the required cloud canary is missing or unwaived, and unrelated public-doc cleanup outside Codex CLI posture and spark policy.

## Parity / Alignment Matrix
| Surface | Current / reference truth | Target truth |
| --- | --- | --- |
| Codex CLI posture | CO-180 holds public docs at `0.118.0` while local `codex-cli 0.120.0` is present because cloud canary evidence is missing. | `0.120.0` is either promoted after required gates or recorded as the latest stable candidate with current blocker evidence. |
| Spark role policy | `explorer_fast` is documented as spark/text-only search or search/synthesis. | `explorer_fast` and `gpt-5.3-codex-spark` are file-search/codebase-search-only, with no synthesis, planning, implementation, review, or broad exploration wording. |
| MCP tools | Delegation server tool definitions expose input schemas only. | MCP `outputSchema` from `0.120.0` is adopted where useful or held/no-op with source-backed rationale. |
| Review wrapper | CO-180 relied on help-surface compatibility and existing `--title` / artifact fallback. | A real scoped review prompt transport canary on `0.120.0` determines whether the fallback remains necessary. |
| App-server / exec-server | App-server is local default posture, provider workers still use `codex exec` / `codex exec resume`; exec-server is experimental. | New app-server/exec-server capabilities are canaried and documented while remote control remains behind the guarded resident-session/control authority lane. |
| Drift checks | Existing docs checks catch model mentions and target strings but not overbroad spark semantics. | Docs-hygiene/docs-catalog/defaults/doctor tests fail on stale version posture and overbroad spark language. |

## Not Done If
- Public/contributor docs still say `0.118.0` without a current rationale tied to `0.120.0` release-note evidence.
- `explorer_fast` or `gpt-5.3-codex-spark` guidance still permits search/synthesis, exploration, planning, implementation, review, or other non-file-search work.
- Drift guards cannot detect stale Codex CLI posture or overbroad spark role wording.
- CO claims `0.120.0` is adopted while required cloud evidence is missing, failed, or unwaived.
- MCP `outputSchema`, `tool_search` ordering, app-server/exec-server, review-wrapper prompt transport, runtime/cloud canaries, and cloud fallback are not classified with evidence.
- Provider workers are moved to app-server or exec-server remote control by default without the separate authority/control guardrail.

## Goals
- Preserve a task-scoped evidence packet under `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/` and `.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/`.
- Produce and apply a release-note-driven adoption matrix for `0.119.0` and `0.120.0`.
- Make the documented `0.120.0` candidate / hold / promotion posture explicit and current.
- Enforce file-search-only spark role semantics in docs, templates, defaults, and tests.
- Keep remote-control surfaces canaried but not promoted as provider-worker defaults.

## Non-Goals
- No blind replacement of `0.118.0` with `0.120.0`.
- No spark use for synthesis, planning, implementation, review, broad exploration, or image/visual work.
- No provider-worker app-server/exec-server remote-control implementation in this lane.
- No weakening of required cloud canary gates without explicit blocker/waiver evidence.
- No unrelated public-doc cleanup.

## Metrics & Guardrails
- Release-note and local help evidence are stored under the CO-183 issue packet.
- Adoption matrix covers every issue-required upstream surface.
- Docs-hygiene/docs-catalog tests catch overbroad spark wording.
- Defaults/doctor tests cover the generated `explorer_fast` role description and template posture where practical.
- Runtime/cloud/review-wrapper canary results are captured or blocked with exact commands and environment evidence.

## Approvals
- Product: Linear issue CO-183.
- Engineering: docs-review before implementation, validation gates, standalone review, elegance pass, PR ready-review drain, and Linear workpad evidence.
- Design: Not applicable.
