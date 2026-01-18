# Standalone Review (Agent-First)

This guide is the canonical reference for ad-hoc reviews outside pipelines. Use the `codex review` subcommand (non-interactive) when you need a fast check without pipeline manifests.

## Codex review (non-interactive)
- Uncommitted diff: `codex review --uncommitted`
- Base branch: `codex review --base <branch>`
- Commit: `codex review --commit <sha>`
- Custom focus: `codex review "<custom instructions>"` (cannot be combined with `--uncommitted/--base/--commit`)

## Use during implementation (recommended)
- Run a quick standalone review after each meaningful chunk of work to catch issues early.
- Prefer a custom focus prompt for targeted checks, for example:
  `codex review "Focus on correctness, regressions, and edge cases in the files I just touched; ignore style; list missing tests."`

## With manifest evidence (repo-only)
If you need the latest run manifest referenced in the review prompt, use the wrapper:

`TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." MANIFEST=<path> npm run review -- --manifest <path>`

Notes:
- Set `TASK` or `MCP_RUNNER_TASK_ID` so the review prompt includes task context instead of `unknown-task`.
- In CI or when `CODEX_REVIEW_NON_INTERACTIVE=1`/`CODEX_NON_INTERACTIVE=1` (or `CODEX_NO_INTERACTIVE=1`) is set, the wrapper prints a “review handoff” prompt and exits unless `FORCE_CODEX_REVIEW=1` is set.
- To force execution in those environments: `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 TASK=<task-id> NOTES="..." MANIFEST=<path> npm run review -- --manifest <path>`.

## Expected outputs
- `codex review`: prioritized findings; no working tree edits.
- `npm run review`: includes the manifest path in the review prompt and applies diff-budget checks; may emit a handoff prompt in non-interactive mode (see above).
