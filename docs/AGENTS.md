<!-- codex:instruction-stamp a22ee0a978767f427ea6467d8e91827fa071a8087a3b3eb421bf8251b96475a8 -->
# Repository Agent Guidance

## Project 0303 — Codex Orchestrator Autonomy Enhancements
- Export `MCP_RUNNER_TASK_ID=0303-orchestrator-autonomy` so diagnostics land in `.runs/0303-orchestrator-autonomy/cli/` and mirrors sync across `/tasks`, `docs/`, and `.agent/`.
- Store evidence under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`, metrics in `.runs/0303-orchestrator-autonomy/metrics.json`, and summaries in `out/0303-orchestrator-autonomy/state.json`.
- Record any approval escalations in the manifest `approvals` array and cross-link when flipping checklist items.
- Run `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (if fixtures exist), and `node scripts/diff-budget.mjs` before reviewer hand-off; attach the manifest path documenting these runs.

## Project 0202 — Codex Orchestrator Resilience Hardening
- Existing manifests remain in `.runs/0202-orchestrator-hardening/cli/`; keep metrics/state snapshots in `.runs/0202-orchestrator-hardening/metrics.json` and `out/0202-orchestrator-hardening/state.json`.
- Maintain checklist mirrors across `tasks/tasks-0202-orchestrator-hardening.md`, `docs/TASKS.md`, and `.agent/task/0202-orchestrator-hardening.md` when updating evidence.

## Project 0506 — TF-GRPO Integration Foundations
- Export `MCP_RUNNER_TASK_ID=0506-tfgrpo-integration` so CLI manifests land in `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json` and mirror evidence across `/tasks`, `docs/`, and `.agent/`.
- Reference stamped prompt packs stored in `.agent/prompts/prompt-packs/` when wiring system/inject/summarize/extract/optimize prompts; their hashes surface in the CLI manifest `prompt_packs` array for each epoch.
- Persist experience, metrics, and OTEL artifacts under `.runs/0506-tfgrpo-integration/metrics.*` and `out/0506-tfgrpo-integration/` so reviewers can audit TF-GRPO loops end-to-end.
- Diagnostics reminder: leave `FEATURE_TFGRPO_GROUP`, `TFGRPO_GROUP_SIZE`, and related env vars unset when running the default diagnostics pipeline. Those commands run the full vitest suite (including the guardrail tests) and intentionally fail if grouped execution is forced. Use the `tfgrpo-learning` pipeline (or custom configs) for grouped TF-GRPO validation instead.

## Docs Review Gate (Pre-Implementation)
- Before implementation work, capture a docs-review manifest via `npx codex-orchestrator start docs-review --format json --no-interactive --task <task-id>` with `MCP_RUNNER_TASK_ID` set.
- Record the manifest path in the task checklists (`tasks/`, `.agent/task/`, `docs/TASKS.md`) and `tasks/index.json` for evidence.
- The docs-review pipeline runs `npm run docs:freshness` after `npm run docs:check` and emits `out/<task-id>/docs-freshness.json`.
- If `docs:check` fails with `tasks-file-too-large`, the tasks archive automation workflow will open a PR and sync payloads to `task-archives`; use `npm run docs:archive-tasks` for manual fallback.
- Implementation docs archiving follows `docs/implementation-docs-archive-policy.json`; the automation workflow syncs payloads to `doc-archives` and opens a PR with stubs. Use `npm run docs:archive-implementation` for manual fallback.

## Docs-First Requirement
- Before any repo edits (code, scripts, config, or docs), create or refresh PRD + TECH_SPEC + ACTION_PLAN + the task checklist.
- Link TECH_SPECs in `tasks/index.json` and update `last_review` dates before editing files.
- If docs are missing or stale, STOP and request approval before touching files.
- Use `.agent/task/templates/tech-spec-template.md` for TECH_SPECs and `.agent/task/templates/action-plan-template.md` for ACTION_PLANs.
- Prefer the global `docs-first` skill when installed; bundled skills ship for downstream release packaging.
- Translate the user request into the PRD and update it as you learn new constraints or scope changes.

## Orchestrator-First Default
- Use `codex-orchestrator` pipelines for planning, implementation, validation, and review work that touches the repo.
- Avoid ad-hoc command chains unless the work is a lightweight discovery step that does not require manifest evidence.
- Before implementation, run a standalone review of the task/spec against the user’s intent and record the approval in the spec + checklist notes. If anything is vague, infer with a subagent and self-approve or offer options; only ask the user when truly blocked.
- Delegation is mandatory for top-level tasks: spawn at least one subagent run using `MCP_RUNNER_TASK_ID=<task-id>-<stream>`, capture manifest evidence, and summarize in the main run. Use `DELEGATION_GUARD_OVERRIDE_REASON` only when delegation is impossible and record the justification.
- Prefer delegation for research, review, and planning work once a task id exists; use `codex exec` only for pre-task triage (no task id yet) or when delegation is unavailable.
- Keep delegation MCP enabled by default (only MCP on by default). Enable other MCPs only when relevant to the task.
- Avoid hard dependencies on a specific MCP server; use whatever MCPs are available and relevant to the specific task.
- Follow `.agent/SOPs/oracle-usage.md` for Oracle runs (tool cap: 11 attachments; unique basenames; attachments-first workflow).

## Standalone Reviews (Ad-hoc)
- Use `codex review` for fast checks during implementation; prefer a targeted prompt.
- Capture the standalone review approval (even if “no issues”) in the spec/task notes before implementation begins.
- For manifest-backed review evidence, run `npm run review` with the manifest path.
- See `docs/standalone-review-guide.md` for the canonical workflow.
- Prefer the global `standalone-review` skill when installed; bundled skills ship for downstream release packaging.

## PR Lifecycle (Top-Level Agents)
- Open PRs for code/config changes and keep the scope tied to the active task.
- Monitor PR checks and review feedback for 10–20 minutes after all required checks turn green.
- If checks remain green and no new feedback arrives during the window, merge via GitHub and delete the branch.
- Reset the window if checks restart or feedback arrives; do not merge draft PRs or PRs labeled "do not merge."

## GitHub Agent Review Replies
- Always reply directly in the original review discussion thread (line comment), not just top-level PR comments.
- Tag the agent explicitly (e.g., `@coderabbitai`), and mention what changed plus the commit SHA.
- CLI/API example for replying to a review comment:
```bash
gh api -X POST repos/<org>/<repo>/pulls/<pr>/comments \
  -f body='@coderabbitai Fixed … (commit abc123). Please re-review/resolve.' \
  -F in_reply_to=<comment_id>
```
- If a thread reply via API fails due to permissions, fall back to a line comment on the same diff hunk, still tagging the agent.
- After replying, check `gh pr view <pr> --json reviewDecision` and wait for it to flip to `APPROVED` before merging.

## DevTools Review Gate (Optional)
- For frontend QA/visual review runs that need Chrome DevTools, use `CODEX_REVIEW_DEVTOOLS=1 npx codex-orchestrator start implementation-gate --format json --no-interactive --task <task-id>` so only the review handoff enables DevTools.
- Default to `implementation-gate` for general reviews; reserve DevTools only for cases that need Chrome DevTools capabilities (visual/layout checks, network/perf diagnostics). After addressing review feedback, rerun the same gate until no issues remain and include any follow-up questions in `NOTES`.
- NOTES template: `Goal: ... | Summary: ... | Risks: ... | Questions (optional): ...`
- Review-loop steps live in `.agent/SOPs/review-loop.md`.
- When writing PR summaries, avoid literal `\n` sequences; use `gh pr create --body-file` or a here-doc so line breaks render correctly in GitHub.

## Frontend Testing Pipeline (Core)
Note: pipelines already set `CODEX_NON_INTERACTIVE=1`; keep it for shortcut runs and other automation.
- Default-off DevTools: `CODEX_NON_INTERACTIVE=1 npx codex-orchestrator start frontend-testing --format json --no-interactive --task <task-id>`.
- DevTools-enabled: `CODEX_NON_INTERACTIVE=1 CODEX_REVIEW_DEVTOOLS=1 npx codex-orchestrator start frontend-testing --format json --no-interactive --task <task-id>` or `CODEX_NON_INTERACTIVE=1 codex-orchestrator frontend-test --devtools`.
- Shortcut: `CODEX_NON_INTERACTIVE=1 codex-orchestrator frontend-test` runs the `frontend-testing` pipeline with DevTools off unless `--devtools` is set.
- Readiness check: `codex-orchestrator doctor --format json` reports DevTools skill + MCP config availability.
- Setup helper: `codex-orchestrator devtools setup` prints setup steps (`--yes` to apply).

## Parallel Runs (Meta-Orchestration)
- When coordinating multiple workstreams, prefer one worktree per stream and route manifests with unique `MCP_RUNNER_TASK_ID` values; see `AGENTS.md` and `.agent/SOPs/meta-orchestration.md`.

## Instruction Chain
- Global defaults live in `AGENTS.md`.
- Repository-level specifics (this file) describe project directories and guardrails.
- Project SOPs and task detail live under `.agent/AGENTS.md` and `.agent/task/**`.
