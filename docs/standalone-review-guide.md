# Standalone Review (Agent-First)

This guide is the canonical reference for ad-hoc reviews outside pipelines. Use `npm run review` as the default path so runs inherit CO guardrails (task-scoped evidence, delegation MCP default-on with explicit opt-out controls, and optional auto issue logging).

## Default path (recommended): `npm run review`
- Manifest-backed review:
  `TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." MANIFEST=<path> npm run review -- --manifest <path>`
- Latest manifest for active task:
  `MCP_RUNNER_TASK_ID=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ..." npm run review`
- Optional automatic issue logging on review failure:
  - Env: `CODEX_REVIEW_AUTO_ISSUE_LOG=1`
  - Flag: `npm run review -- --auto-issue-log`

## Direct `codex review` (quick, best-effort)
- Uncommitted diff: `codex review --uncommitted`
- Base branch: `codex review --base <branch>`
- Commit: `codex review --commit <sha>`
- Custom focus (prompt-only): `codex review "<custom instructions>"`
- Compatibility guard: do not combine prompt arguments with `--uncommitted`, `--base`, or `--commit` (current Codex CLI rejects that combination).
- If direct review hangs in delegation startup, switch to `npm run review`, which keeps task-scoped evidence and supports explicit delegation disable controls plus optional issue-bundle capture.

## Use during implementation (recommended)
- Run a quick standalone review after each meaningful chunk of work to catch issues early.
- After each review run, append a short progress checkpoint in the active task checklist (what changed, evidence, next step).
- Use this default trigger heuristic so reviews stay useful (not noisy):
  - run when 2+ files changed since the previous review, or
  - run when about 40+ changed lines accumulate, or
  - run immediately for any workflow/security/release file touch.
- Also run at implementation checkpoints: after finishing a coding burst/sub-goal, after addressing a feedback batch, and before switching streams or handoff.
- Prefer a custom focus prompt for targeted checks, for example:
  `codex review "Focus on correctness, regressions, and edge cases in the files I just touched; ignore style; list missing tests."`
- WIP two-step pattern when you want both scope and focus:
  1. `codex review --uncommitted` (or `--base/--commit`)
  2. `codex review "<targeted focus prompt>"` (prompt-only)
- For non-trivial diffs (about 2+ files or 40+ changed lines), run an elegance/minimality pass in the same cycle before handoff/merge.
- Capture key findings in the PRD/TECH_SPEC or task notes so context survives compaction.
- Before implementation begins, run a standalone review of the task/spec against the user’s intent and record the approval (or issues) in the spec/task notes.

## Eval-driven mindset
- Define the review criteria up front (correctness, regressions, edge cases, missing tests).
- Keep prompts short and explicit; list the exact files or behaviors you want checked.
- When you need repeatable results, turn the review into a checklist or a small eval run and compare outcomes over time.

## Wrapper behavior notes
- Set `TASK` or `MCP_RUNNER_TASK_ID` so the review prompt includes task context instead of `unknown-task`.
- In CI or when `CODEX_REVIEW_NON_INTERACTIVE=1`/`CODEX_NON_INTERACTIVE=1` (or `CODEX_NO_INTERACTIVE=1`) is set, the wrapper prints a “review handoff” prompt and exits unless `FORCE_CODEX_REVIEW=1` is set.
- To force execution in those environments: `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 TASK=<task-id> NOTES="..." MANIFEST=<path> npm run review -- --manifest <path>`.
- `npm run review` keeps delegation MCP enabled by default; disable when needed with `CODEX_REVIEW_DISABLE_DELEGATION_MCP=1` or `--disable-delegation-mcp` (legacy control remains supported: `CODEX_REVIEW_ENABLE_DELEGATION_MCP=0` or `--enable-delegation-mcp=false`).
- `npm run review` does not enforce runtime limits by default (reviews can run as long as needed).
- `npm run review` emits patience-first runtime checkpoints every 60s by default (`elapsed` + `idle` visibility while waiting).
- `npm run review` auto-detects large uncommitted scopes and injects a prompt advisory to prioritize highest-risk findings early (helps CO-scale diffs where exhaustive traversal can take a long time).
- Optional timeout/stall/startup-loop guards:
  - `CODEX_REVIEW_TIMEOUT_SECONDS=<seconds>` (`0` disables when set)
  - `CODEX_REVIEW_STALL_TIMEOUT_SECONDS=<seconds>` (`0` disables when set)
  - `CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS=<seconds>` with optional `CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS` (default `8` when startup-loop timeout is set)
- Optional monitor tuning:
  - `CODEX_REVIEW_MONITOR_INTERVAL_SECONDS=<seconds>` (`0` disables checkpoints)
- Optional large-scope thresholds:
  - `CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD=<count>` (default `25`)
  - `CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD=<count>` (default `1200`)
- `npm run review` writes artifacts under `<runDir>/review/` (`runDir` is `CODEX_ORCHESTRATOR_RUN_DIR` when set; otherwise `dirname(MANIFEST)`).
- Prompt artifact: `<runDir>/review/prompt.txt` (always).
- Review transcript: `<runDir>/review/output.log` (when `codex review` runs, for example with `FORCE_CODEX_REVIEW=1`).

## Expected outputs
- `codex review`: prioritized findings; no working tree edits.
- `npm run review`: includes task-scoped manifest evidence in the review prompt, applies diff-budget checks, and may emit a handoff prompt in non-interactive mode (see above).
