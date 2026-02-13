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
- Capture key findings in the PRD/TECH_SPEC or task notes so context survives compaction.
- Before implementation begins, run a standalone review of the task/spec against the user’s intent and record the approval (or issues) in the spec/task notes.

## Eval-driven mindset
- Define the review criteria up front (correctness, regressions, edge cases, missing tests).
- Keep prompts short and explicit; list the exact files or behaviors you want checked.
- When you need repeatable results, turn the review into a checklist or a small eval run and compare outcomes over time.

## With manifest evidence (repo-only)
If you need the latest run manifest referenced in the review prompt, use the wrapper:

`TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." MANIFEST=<path> npm run review -- --manifest <path>`

Notes:
- Set `TASK` or `MCP_RUNNER_TASK_ID` so the review prompt includes task context instead of `unknown-task`.
- In CI or when `CODEX_REVIEW_NON_INTERACTIVE=1`/`CODEX_NON_INTERACTIVE=1` (or `CODEX_NO_INTERACTIVE=1`) is set, the wrapper prints a “review handoff” prompt and exits unless `FORCE_CODEX_REVIEW=1` is set.
- To force execution in those environments: `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 TASK=<task-id> NOTES="..." MANIFEST=<path> npm run review -- --manifest <path>`.
- Forced non-interactive runs enforce a timeout (`CODEX_REVIEW_TIMEOUT_SECONDS`, default `900`); set `CODEX_REVIEW_TIMEOUT_SECONDS=0` to disable.

## Expected outputs
- `codex review`: prioritized findings; no working tree edits.
- `npm run review`: includes the manifest path in the review prompt and applies diff-budget checks; may emit a handoff prompt in non-interactive mode (see above).
