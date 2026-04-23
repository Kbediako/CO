---
id: 20260421-linear-45363c7e-c083-4eaa-911f-8fc7873141d8
title: CO-271 MCP client command/args normalization
relates_to: docs/PRD-linear-45363c7e-c083-4eaa-911f-8fc7873141d8.md
risk: medium
owners:
  - Codex
last_review: 2026-04-21
---

# TECH_SPEC: CO-271 MCP client command/args normalization

## Canonical References

- Canonical TECH_SPEC: `tasks/specs/linear-45363c7e-c083-4eaa-911f-8fc7873141d8.md`
- PRD: `docs/PRD-linear-45363c7e-c083-4eaa-911f-8fc7873141d8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-45363c7e-c083-4eaa-911f-8fc7873141d8.md`
- Task checklist: `tasks/tasks-linear-45363c7e-c083-4eaa-911f-8fc7873141d8.md`
- `.agent` mirror: `.agent/task/linear-45363c7e-c083-4eaa-911f-8fc7873141d8.md`
- Source anchor: `ctx:sha256:68ccac7f9d7c412b12a2c9b2515960ed6753a82e0142f6ade2d904c04758f0bd#chunk:c000001`

## Summary

CO-271 is a narrow shipped-config normalization lane. Root `mcp-client.json` and `templates/codex/mcp-client.json` currently place the full invocation `codex-orchestrator mcp serve` in `command`. Parent implementation should split that into executable `command: "codex-orchestrator"` and `args: ["mcp", "serve"]`.

`plugins/codex-orchestrator/.mcp.json` already uses a split structured launch shape and must remain protected from regression.

## Requirements

1. Preserve `mcp-client.json` server id `codex-local`.
2. Preserve `templates/codex/mcp-client.json` server id `codex-orchestrator`.
3. Preserve `templates/codex/mcp-client.json` `templateVersion`.
4. Replace only the root/template single command string with split `command` plus `args`.
5. Preserve plugin `.mcp.json` split-launch behavior.
6. Keep the runtime invocation equivalent to `codex-orchestrator mcp serve`.
7. Keep the child lane docs-only.

## Protected Terms

- `mcp-client.json`
- `templates/codex/mcp-client.json`
- `plugins/codex-orchestrator/.mcp.json`
- `command`
- `args`
- `codex-orchestrator mcp serve`
- `codex-orchestrator`
- `mcp`
- `serve`

## Reject These Wrong Interpretations

- `Change the MCP server implementation.`
- `Use a shell wrapper to preserve command-string parsing.`
- `Rename the MCP server ids.`
- `Convert plugin .mcp.json back to one command string.`
- `Treat CO-271 as a marketplace release or package-publish lane.`
- `Edit implementation/config files in this docs child lane.`

## Parity / Alignment Matrix

| Surface | Current Truth | Target Truth |
| --- | --- | --- |
| `mcp-client.json` | `command` equals `codex-orchestrator mcp serve`; `args` absent. | `command` equals `codex-orchestrator`; `args` equals `["mcp", "serve"]`. |
| `templates/codex/mcp-client.json` | `command` equals `codex-orchestrator mcp serve`; `args` absent. | `command` equals `codex-orchestrator`; `args` equals `["mcp", "serve"]`. |
| `plugins/codex-orchestrator/.mcp.json` | Split launch already present via `command: "node"` and `args`. | Keep split launch present; no single command string regression. |

## Validation Plan

- Child lane: JSON parse `tasks/index.json`, protected-term grep, `git diff --check`, and trailing-whitespace check for touched docs/task files.
- Parent lane: JSON parse all protected config files and assert exact root/template `command` and `args` values.
- Parent lane: assert no root/template `command` value is `codex-orchestrator mcp serve`.
- Parent lane: run `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run pack:smoke` unless a scoped waiver is recorded.

## Not Done If

- Root/template config still stores `codex-orchestrator mcp serve` as one `command`.
- `args` is missing or malformed.
- Plugin `.mcp.json` loses split `command` plus `args`.
- The parent patch changes runtime MCP server behavior.
- The packet or closeout omits protected surfaces.

## Approvals

- Reviewer: pending parent docs-review / implementation.
- Date: 2026-04-21
