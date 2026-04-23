# ACTION_PLAN: CO-271 MCP client command/args normalization

## Summary

- Goal: Register a docs-first packet before parent implementation normalizes shipped MCP client config startup from single `command` string to split `command` plus `args`.
- Scope: Docs/task evidence in this child lane; parent config implementation in `mcp-client.json` and `templates/codex/mcp-client.json`.
- Assumptions: `plugins/codex-orchestrator/.mcp.json` remains the protected reference shape because it already uses split `command` plus `args`.

## Issue Readiness Gate

- Intent checksum / protected terms carried forward: `mcp-client.json`, `templates/codex/mcp-client.json`, `plugins/codex-orchestrator/.mcp.json`, `command`, `args`, `codex-orchestrator mcp serve`.
- Not done if:
  - root/template configs still use a single `codex-orchestrator mcp serve` command string
  - root/template configs lack exact `args: ["mcp", "serve"]`
  - plugin `.mcp.json` regresses away from structured `command` plus `args`
  - runtime MCP server behavior changes without a widened issue
- Pre-implementation issue-quality review: accepted. The lane is not plausibly narrower than the user request because it names the current config values, target config values, protected surfaces, wrong interpretations, non-goals, parity matrix, and validation checks.

## Milestones & Sequencing

1. Docs packet creation
   - Create PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
   - Register the task in `tasks/index.json`.
   - Add a compact `docs/TASKS.md` snapshot entry.
2. Parent config implementation
   - Update `mcp-client.json` to split `command` and `args`.
   - Update `templates/codex/mcp-client.json` to split `command` and `args`.
   - Preserve `plugins/codex-orchestrator/.mcp.json` split-launch shape.
   - Update focused init-template coverage so the shipped template cannot regress to a single command string.
3. Parent validation and review
   - Parse protected JSON files.
   - Assert exact `command` and `args` field values.
   - Run docs/spec guards and downstream-facing smoke appropriate for shipped templates.

## Dependencies

- Parent lane owns authoritative Linear state, workpad, PR lifecycle, config implementation, validation, and merge.
- Child lane patch export carries docs/task files only.
- Declared source payload is unavailable in this child checkout; parent can reconcile source payload if the authoritative workspace contains additional issue text.

## Validation

### Child Lane Checks

- `jq empty tasks/index.json`
- Protected-term `rg` over owned docs/task files plus `tasks/index.json` and `docs/TASKS.md`
- `git diff --check` over touched files
- trailing-whitespace check over touched files

### Parent Lane Checks

- JSON parse:
  - `mcp-client.json`
  - `templates/codex/mcp-client.json`
  - `plugins/codex-orchestrator/.mcp.json`
- Exact field checks:
  - root `command === "codex-orchestrator"`
  - root `args === ["mcp", "serve"]`
  - template `command === "codex-orchestrator"`
  - template `args === ["mcp", "serve"]`
  - no root/template `command === "codex-orchestrator mcp serve"`
  - plugin remains split `command` plus `args`
- Focused regression:
  - `npx vitest run orchestrator/tests/InitTemplates.test.ts`
- Repo guards:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run pack:smoke` unless parent records a scoped downstream-surface waiver

## Rollback Plan

- Revert only the parent config normalization if a consumer requires a different structured launch shape.
- Keep docs packet history intact and amend it with the discovered consumer requirement rather than silently returning to shell-dependent command strings.

## Risks & Mitigations

- Risk: Client expectations differ across MCP consumers.
  - Mitigation: Use the broadly compatible executable plus argument-vector shape and validate exact JSON.
- Risk: Plugin config is accidentally changed while normalizing root/template configs.
  - Mitigation: Treat `plugins/codex-orchestrator/.mcp.json` as a protected reference surface and include it in parent validation.
- Risk: Config-only change bypasses downstream smoke.
  - Mitigation: Parent should run `npm run pack:smoke` because templates are shipped downstream.

## Approvals

- Reviewer: pending parent docs-review / implementation.
- Date: 2026-04-21
