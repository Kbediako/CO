<!-- codex:instruction-stamp bbd439be415d8b218cbb78e28176375c21f7ab83c9c0866cdea439ca8c50ebfc -->
# Codex-Orchestrator Agent Handbook (Template)

Use this repository as the wrapper that coordinates multiple Codex-driven projects. After cloning, replace placeholder metadata (task IDs, documents, SOPs) with values for each downstream initiative while keeping these shared guardrails in place.

## Execution Modes & Approvals
- Default execution mode is `mcp`.
- Switch to cloud mode only if your task plan explicitly allows it and the reviewer records the override in the active run manifest.
- Prefer cloud mode when work is long-running, highly parallel, or blocked by local resource constraints.
- Before cloud mode, run a quick preflight: remote branch exists, setup commands are non-interactive, and required secrets/variables are available.
- If cloud preflight fails (for example, missing cloud environment wiring), continue in local `mcp` mode and record the fallback reason in checklist/manifests.
- Keep the safe approval profile (`read/edit/run/network`). Capture any escalation in `.runs/<task>/<timestamp>/manifest.json` under `approvals`.
- Run `node scripts/delegation-guard.mjs` before requesting review; if delegation is not possible, set `DELEGATION_GUARD_OVERRIDE_REASON` and record the rationale in the task checklist.
- Run `node scripts/spec-guard.mjs --dry-run` before requesting review. Update specs or refresh approvals when the guard fails.

## MCP vs Collab (Decision Rule)
- Default to MCP for approvals, tool routing, delegation, external integrations, and audit trails.
- Use collab only for intra-run brainstorming, role-split planning, or parallel subcalls.
- Collab means auxiliary assistant agents inside a run; enable it via `RLM_SYMBOLIC_MULTI_AGENT=1` (legacy alias: `RLM_SYMBOLIC_COLLAB=1`; see `docs/guides/collab-vs-mcp.md`).
- Terminology: `collab` is the workflow/tooling name, while Codex CLI feature gating uses `features.multi_agent=true` (legacy alias/names like `RLM_SYMBOLIC_COLLAB` and `manifest.collab_tool_calls` still use `collab`).
- The “top-level Codex” is the MCP-run agent the user is interacting with; collab agents are assistants and do not represent the run.

## Agent Role Baseline
- Built-in roles are `default`, `explorer`, and `worker`; `researcher` is user-defined.
- `spawn_agent` defaults to `default` when `agent_type` is omitted; always set `agent_type` explicitly.
- For symbolic collab runs, prefix spawned prompts with `[agent_type:<role>]` on line one so role intent is auditable from JSONL/manifests.
- Keep top-level defaults on latest codex by setting `model = "gpt-5.3-codex"` in `~/.codex/config.toml`.
- Define a user `agents.explorer` role without `config_file` so built-in explorer inherits your top-level model defaults instead of older built-in profiles.
- Caveat: spark models are text-only; use non-spark roles when image inputs are required.
- Set `[agents] max_threads = 8` as the standard baseline; only move to `12` after validating stability under your MCP/tool workload.
- Use an explicit `worker_complex` role (for example `gpt-5.3-codex`, `xhigh`) for high-risk implementation streams.

## Deliberation Default (Agent-First)
- Deliberation is the default for high-ambiguity or high-impact work. Keep MCP as the top-level control plane and use collab/delegated subagents to explore options.
- Run **full deliberation** when any hard-stop trigger is true:
  - Irreversible/destructive change with unclear rollback.
  - Auth/secrets/PII boundary touched.
  - Direct production customer/financial/legal impact.
  - Conflicting intent on a high-impact change.
- Otherwise, score these criteria `0..2` each: reversibility, external impact, security/privacy boundary, blast radius, requirement clarity, verification strength, time pressure.
- Run **full deliberation** when risk score is `>=7` or at least two criteria score `2`.
- Deliberation time budgets (soft/hard cap):
  - `T0` quick (`<=15m`): `5s / 12s`
  - `T1` standard (`15m..2h`): `20s / 45s`
  - `T2` complex (`2h..8h`): `60s / 120s`
  - `T3` long-horizon (`>8h`): `120s / 300s`
- On soft cap: stop branching and move to execution with the best current plan. On hard cap: disable auto-deliberation for the current stage and continue execution.
- Review-signal policy:
  - `P0` critical findings are hard-stop.
  - `P1` high findings are hard-stop only when high-signal (clear evidence or corroboration).
  - `P2/P3` findings are tracked follow-ups, not hard-stop.
- If you bypass mandatory deliberation, record a reason in checklist/manifests using the same evidence discipline as other guardrail overrides.

## Orchestrator-First Workflow
- Use `codex-orchestrator` pipelines for planning, implementation, validation, and review work that touches the repo.
- Default to `docs-review` before implementation and `implementation-gate` after code changes (set `CODEX_REVIEW_DEVTOOLS=1` when DevTools are required).
- Before implementation, run a standalone review of the task/spec against the user’s intent and record the approval in the spec + checklist notes. If anything is vague, infer with a subagent and self-approve or offer options; only ask the user when truly blocked.
- Reserve direct shell commands for lightweight discovery or one-off checks that do not require manifest evidence.
- Delegation is mandatory for top-level tasks once a task id exists: spawn at least one subagent run using `MCP_RUNNER_TASK_ID=<task-id>-<stream>`, capture manifest evidence, and summarize in the main run. Use `DELEGATION_GUARD_OVERRIDE_REASON` only when delegation is impossible and record the justification.
- Once a task id exists, prefer delegation for research, review, and planning work. Use `codex exec` only for pre-task triage (no task id yet) or when delegation is genuinely unavailable (technical/blocking limitation or explicit operational block), and set `DELEGATION_GUARD_OVERRIDE_REASON` with a clear justification.
- In shared checkouts, treat in-scope edits from active write-enabled subagent streams as expected delegated output.
- Escalate "unexpected local edits" only when files are out of all declared stream scopes, ownership collides, or no active stream owner exists.
- Keep delegation MCP enabled by default (only MCP on by default). Enable other MCPs only when relevant to the task.
- Avoid hard dependencies on a specific MCP server; use whatever MCPs are available and relevant to the specific task.
- Bundled skills under `skills/` ship to downstream users; agents should prefer global skills (if installed) and fall back to bundled skills. Example: use `$CODEX_HOME/skills/docs-first` when present, otherwise use `skills/docs-first/SKILL.md`.

## Docs-First (Spec-Driven)
- Before any repo edits (code, scripts, config, or docs), create or refresh PRD + TECH_SPEC + ACTION_PLAN + the task checklist.
- Link TECH_SPECs in `tasks/index.json` and update `last_review` dates as part of the docs-first step.
- If docs are missing or stale, STOP and request approval before editing files.
- Use `.agent/task/templates/tech-spec-template.md` for TECH_SPECs and `.agent/task/templates/action-plan-template.md` for ACTION_PLANs.
- Prefer the bundled `docs-first` skill for consistent steps.
- Translate the user request into the PRD and update it as you learn new constraints or scope changes.
- For low-risk tiny changes, use the bounded micro-task path in `docs/micro-task-path.md` (still requires task/spec evidence).

## Standalone Reviews (Ad-hoc)
- Use `codex review` for quick reviews during implementation.
- Current Codex CLI behavior: do not combine prompt arguments with `--uncommitted`, `--base`, or `--commit`; use either diff-scoped review (no prompt) or prompt-only review.
- When you need manifest-backed review evidence, run `TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ..." MANIFEST=<path> npm run review -- --manifest <path>`.
- See `docs/standalone-review-guide.md` for the canonical workflow.
- Prefer the bundled `standalone-review` skill for ad-hoc review steps.
- Prefer the bundled `elegance-review` skill for the required post-implementation minimality pass.
- During active non-trivial implementation, run standalone review at implementation checkpoints (after coding bursts/sub-goals/feedback batches) and pair with an elegance pass before handoff/merge.

## Completion Discipline (Patience-First)
- For CI checks, review agents, cloud jobs, and orchestrator runs, wait/poll until terminal state before reporting completion.
- Keep polling windows active after green checks and reset the window if checks restart or new feedback arrives.
- Do not hand off an in-progress workflow unless the user explicitly asks to stop early.

## Oracle (External Assistant)
- Oracle bundles a prompt plus the right files so another AI (GPT 5 Pro + more) can answer. Use when stuck/bugs/reviewing.
- Run `${ORACLE_LOCAL_PATH:-/path/to/oracle/scripts/oracle-local.sh} --help` once per session before first use. Set `ORACLE_LOCAL_PATH` to your local Oracle repo (e.g., `/path/to/oracle/scripts/oracle-local.sh`).
- Use browser mode only (`--engine browser`). Do not use API runs.
- If browser mode fails due to missing ChatGPT cookies, approve the macOS Keychain prompt and ensure ChatGPT is signed in for the active Chrome profile; retry with `--browser-cookie-wait 5` or `--browser-manual-login`.

## Meta-Orchestration & Parallel Runs
- **Definition:** “Parallel runs” means launching multiple `codex-orchestrator start ...` runs at the same time (separate processes). A single orchestrator run executes its pipeline stages serially.
- **Primary safety rule:** run parallel work in separate worktrees/clones so builds/tests don’t fight over `node_modules/`, `dist/`, or uncommitted edits. See `.agent/SOPs/git-management.md`.
- **Task routing:** use a distinct `MCP_RUNNER_TASK_ID` per parallel workstream so `.runs/<task-id>/` and `out/<task-id>/` remain isolated. For scripted runs, prefer `codex-orchestrator start diagnostics --task <id> --format json` (or the equivalent pipeline you need).
- **Run lineage (optional):** pass `--parent-run <run-id>` to link related runs for later auditing; record the resulting manifest paths when you flip checklist items.
- **Advanced isolation (when worktrees aren’t possible):** `CODEX_ORCHESTRATOR_ROOT` is an optional repo-root override (defaults to the current working directory). `CODEX_ORCHESTRATOR_RUNS_DIR` and `CODEX_ORCHESTRATOR_OUT_DIR` are optional directory overrides (defaults under the repo root). Even with these set, avoid running write-heavy pipelines concurrently in the same working tree.

## Non-interactive Commands
- Agents do not have an interactive TTY; every command must be non-interactive or pre-seeded.
- Prefer native no-prompt flags/env vars (`--yes/-y/--force`, `DEBIAN_FRONTEND=noninteractive`, `AWS_PAGER=`); if a tool still prompts, pipe explicit input (`printf 'y\n' | cmd`, `yes n | cmd`) or feed a here-doc for multi-step answers.
- When a tool insists on a TTY, wrap it with `expect`/`pexpect` and script each `expect`/`send` pair; do not launch unscripted interactive sessions.
- If prompts are unknown, run a dry-run or list-questions mode first, then rerun with scripted responses. Never leave a command waiting for input.

## Scope & Simplicity (anti-overengineering)
- Default to the smallest change that solves the asked problem.
- Prefer editing existing code over adding new abstractions, frameworks, or dependency layers.
- Avoid broad refactors, “nice-to-have” improvements, or fixes for unrelated issues unless explicitly requested.
- If requirements are ambiguous, stop and ask before expanding scope.
- Keep diffs reviewable: split oversized changes, or (when unavoidable) record a justification via `DIFF_BUDGET_OVERRIDE_REASON` so reviewers can audit why the budget was exceeded.

## Multi-project Layout
- Place downstream codebases or adapters under `packages/<project>` (or another top-level directory agreed upon by the team).
- Store manifests, metrics, and state snapshots in `.runs/<task-id>/` and `out/<task-id>/` so each project keeps an isolated run history.
- Set `MCP_RUNNER_TASK_ID=<task-id>` before launching orchestrator commands; this routes artifacts to the correct project directory.
- Subagent task IDs must use the `<task-id>-<stream>` prefix so delegation evidence can be audited.
- Log escalations and guardrail outcomes for each project run inside the associated manifest so reviewers can audit approvals per downstream codebase.

## Checklist Convention
- Track every task and subtask with `[ ]` until complete, then flip to `[x]` while linking the manifest path that proves the outcome.
- Mirror the same status across `/tasks`, `docs/`, and `.agent/` for the active project so reviewers and automation see a single source of truth.

## Repository Hygiene & Artifacts
- Land improvements (code/docs/config) in the repo as soon as a run validates them, so `main` is always safe to clone. Heavy artifacts belong in `.runs/<task>/` and `archives/<task>/<timestamp>/`; only check in the references (manifest paths, README instructions, learnings) needed for future agents.
- Use throwaway working directories or branches for exploratory runs. After validation, copy the relevant outputs into `reference/<slug>/` or `archives/` (with README + manifest pointer) and prune bulky `.runs/.../artifacts` that aren’t referenced ensuring any relevant learnings have been extracted.
- Before opening/updating a PR, validate in a clean worktree/clone (no untracked files) so local-only directories don’t mask CI failures (e.g., `docs:check` only sees tracked paths). Quick pattern: `git worktree add ../CO-ci HEAD` then run the core lane commands in `../CO-ci/`.
- When writing PR summaries, avoid literal `\n` sequences; use `gh pr create --body-file` or a here-doc so line breaks render correctly in GitHub.
- Git workflow details: `.agent/SOPs/git-management.md`.
- Keep `docs/TASKS.md` under the line threshold in `docs/tasks-archive-policy.json`; the tasks archive automation workflow opens a PR and updates the `task-archives` branch when the limit is exceeded. Use `npm run docs:archive-tasks` for manual fallback.
- Archive implementation docs (PRD/TECH_SPEC/ACTION_PLAN, task checklists, mirrors) using `docs/implementation-docs-archive-policy.json`; the automation workflow syncs payloads to `doc-archives` and opens a PR with stubs. Use `npm run docs:archive-implementation` for manual fallback.
- Keep `reference/` lean by storing only the active snapshot plus the automation scripts (loader macros, serve README). Serve-from-archive instructions should point to the canonical timestamped folder so reviewers can reproduce results without keeping every raw asset in the repo.
- Before new iterations, run the cleanup script (or manually remove stray `.runs`/`archives` folders) so the working tree returns to a clean state while leaving committed improvements intact.

## PR Lifecycle (Top-Level Agents)
- Open PRs for code/config changes and keep the scope tied to the active task.
- Monitor PR checks and review feedback for 10–20 minutes after all required checks turn green (use a background loop when possible).
- If checks remain green and no new feedback arrives during the window, merge via GitHub and delete the branch.
- Reset the window if checks restart or feedback arrives; do not merge draft PRs or PRs labeled "do not merge."

## GitHub Agent Review Replies
- Always reply directly in the original review discussion thread (line comment), not just top-level PR comments.
- For agents that require explicit mention (for example `@coderabbitai`), tag the agent and mention what changed plus the commit SHA.
- For Codex (`chatgpt-codex-connector`), do not tag per-thread for routine re-review because Codex automatically re-reviews on each push; tag only when a manual Codex pass is explicitly needed.
- CLI/API example for replying to a review comment:
```bash
gh api -X POST repos/<org>/<repo>/pulls/<pr>/comments \
  -f body='@coderabbitai Fixed … (commit abc123). Please re-review/resolve.' \
  -F in_reply_to=<comment_id>
```
- If a thread reply via API fails due to permissions, fall back to a line comment on the same diff hunk, still tagging the agent.
- After replying, check `gh pr view <pr> --json reviewDecision` and wait for it to flip to `APPROVED` before merging.

## Build & Test Commands (defaults)
Implementation work is not “complete” until you run (in order):
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`

| Command | When to use | Notes |
| --- | --- | --- |
| `node scripts/delegation-guard.mjs` | Delegation enforcement | Requires at least one subagent manifest for top-level tasks; set `DELEGATION_GUARD_OVERRIDE_REASON` to bypass. |
| `node scripts/spec-guard.mjs --dry-run` | Spec freshness validation | Blocks merges when touched specs are older than 30 days. |
| `npm run build` | Build output | Compiles TypeScript to `dist/` (required by `docs:check`, `review`, and other wrappers). |
| `npm run lint` | Pre-commit / review gates | Executes `npm run build:patterns` first so codemods compile. |
| `npm run test` | Unit + integration checks | Vitest harness covering orchestrator + patterns. |
| `npm run docs:check` | Docs hygiene gate | Deterministically validates scripts/pipelines/paths referenced in agent-facing docs. |
| `npm run docs:freshness` | Docs freshness gate | Validates registry coverage + review recency and emits `out/<task-id>/docs-freshness.json`. |
| `node scripts/diff-budget.mjs` | Review scope guard | Fails when diffs exceed the configured budget unless `DIFF_BUDGET_OVERRIDE_REASON` is set. |
| `npm run eval:test` | Evaluation harness smoke tests | Requires fixtures in `evaluation/fixtures/**`; optional, enable when evaluation scope exists. |
| `npm run review` | Reviewer hand-off | Runs `codex review` with task/PRD context (when available) and the latest run manifest path included as evidence; `NOTES` is required and should include `<goal + summary + risks>` plus optional questions. |

Update the table once you wire different build pipelines or tooling.
For DevTools-enabled frontend review runs, use `CODEX_REVIEW_DEVTOOLS=1 npx codex-orchestrator start implementation-gate --format json --no-interactive --task <task-id>`.
Default to `implementation-gate` for general reviews; reserve DevTools only when review needs Chrome DevTools capabilities (visual/layout checks, network/perf diagnostics). After addressing review feedback, rerun the same review gate until no issues remain and include any follow-up questions in `NOTES`.
NOTES template: `Goal: ... | Summary: ... | Risks: ... | Questions (optional): ...`
Review-loop steps live in `.agent/SOPs/review-loop.md`.

## CLI Orchestrator Quick Start
1. Install and authenticate the Codex CLI.
2. Export `MCP_RUNNER_TASK_ID=<task-id>` for the project you are touching so manifests land under `.runs/<task-id>/cli/`.
3. Launch diagnostics with `npx codex-orchestrator start diagnostics --format json`; the command prints the run id, manifest path, and log location.
4. Monitor progress using `npx codex-orchestrator status --run <run-id> --watch --interval 10` or read `.runs/<task-id>/cli/<run-id>/manifest.json` directly.
5. Attach the manifest path when flipping checklist items; metrics aggregate in `.runs/<task-id>/metrics.json` and summaries in `out/<task-id>/state.json`.

## Customization Checklist for New Projects
- [ ] Duplicate `/tasks` files and rename them for the new PRD / task identifiers, updating links to `.runs/<task-id>/...` manifests.
- [ ] Refresh `docs/PRD-<slug>.md`, `tasks/specs/<id>-<slug>.md`, and `docs/ACTION_PLAN-<slug>.md` with project-specific content and manifest evidence.
- [ ] Update `.agent/` SOPs to describe project-specific guardrails, escalation paths, and run evidence locations.
- [ ] Remove placeholder references that remain in manifests or docs before committing so downstream teams only see active project data.

Once these items are complete you can treat the repo as the canonical workspace for the new project.
