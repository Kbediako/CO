<!-- codex:instruction-stamp c55a57c808a1e4014d53fc2eb715eff796e44625b15474f04c7e2f93a20960e2 -->
# Repository Agent Guidance

Task-specific historical project blocks were removed from this file in `CO-88`. Use the active task packet under `.agent/task/**` for lane-scoped instructions instead of treating old project ids as repo-wide defaults.

## Docs Review Gate (Pre-Implementation)
- Before implementation work, capture a docs-review manifest via `npx codex-orchestrator start docs-review --format json --no-interactive --task <task-id>` with `MCP_RUNNER_TASK_ID` set.
- Record the manifest path in the task checklists (`tasks/`, `.agent/task/`, `docs/TASKS.md`) and `tasks/index.json` for evidence.
- The docs-review pipeline runs `npm run docs:freshness` after `npm run docs:check` and emits a class-separated `out/<task-id>/docs-freshness.json`.
- If `docs:check` fails with `tasks-file-too-large`, the repo has reached zero headroom or overflow in `docs/TASKS.md`; the tasks archive automation workflow will open a PR and sync payloads to `task-archives`, and `npm run docs:archive-tasks` remains the manual fallback.
- Implementation docs archiving follows `docs/implementation-docs-archive-policy.json`; the automation workflow syncs payloads to `doc-archives` and opens a PR with stubs. Use `npm run docs:archive-implementation` for manual fallback.

## Docs-First Requirement
- Before any repo edits (code, scripts, config, or docs), create or refresh PRD + TECH_SPEC + ACTION_PLAN + the task checklist.
- Link TECH_SPECs in `tasks/index.json` and update `last_review` dates before editing files; task registration is canonical under `items[]` (legacy top-level `tasks[]` is non-canonical).
- If docs are missing or stale, STOP and request approval before touching files.
- Use `.agent/task/templates/tech-spec-template.md` for TECH_SPECs and `.agent/task/templates/action-plan-template.md` for ACTION_PLANs.
- Prefer the global `docs-first` skill when installed; bundled skills ship for downstream release packaging.
- Translate the user request into the PRD and update it as you learn new constraints or scope changes.
- For autonomy-facing backlog or follow-up lanes, capture the issue-shaping contract before implementation starts: user-request translation, protected terms / exact artifact and surface names, nearby wrong interpretations to reject, explicit non-goals, `Not done if`, and a current/reference/target parity matrix when the lane is about parity or alignment.
- Record a lightweight issue-quality review in the spec/task notes before implementation so work does not start while the issue is still plausibly narrower than the user request.
- Do not use the micro-task shortcut for parity/alignment lanes or work whose correctness depends on exact naming, exact surfaces, or protected wording.
- For low-risk tiny changes, apply the bounded micro-task path in `docs/micro-task-path.md` instead of full-length collateral rewrites (still requires task/spec evidence).

## Orchestrator-First Default
- Use `codex-orchestrator` pipelines for planning, implementation, validation, and review work that touches the repo.
- Avoid ad-hoc command chains unless the work is a lightweight discovery step that does not require manifest evidence.
- Use cloud mode when work is long-running/parallel and cloud prerequisites are ready; otherwise stay in local `mcp` mode.
- Cloud preflight: confirm remote branch availability, non-interactive setup commands, and required cloud secrets/variables; if missing under `auto` fallback, record the selected policy, original target, fallback target, and blocking reason in checklist/manifests.
- For strict cloud lanes, set `CODEX_ORCHESTRATOR_CLOUD_FALLBACK=strict` so preflight failures fail fast instead of rerouting.
- Keep mode semantics explicit and orthogonal: `executionMode=mcp|cloud` and `runtimeMode=cli|appserver` are separate controls.
- Local default runtime remains `appserver`, with `--runtime-mode cli` preserved as break-glass.
- `executionMode=cloud` with explicit `runtimeMode=appserver` is unsupported and must fail fast with actionable errors.
- Upstream `rust-v0.128.0` removed `js_repl` and `js_repl_tools_only`, and current local `0.135.0` still reports both as removed; do not set `CODEX_CLOUD_ENABLE_FEATURES` / `CODEX_CLOUD_DISABLE_FEATURES` to either `js_repl` or `js_repl_tools_only`, or run `codex features enable/disable js_repl` / `codex features enable/disable js_repl_tools_only`. Use `CODEX_CLOUD_ENABLE_FEATURES` / `CODEX_CLOUD_DISABLE_FEATURES` only for active non-removed feature names after checking `codex features list`. `goals` is stable on current local `0.135.0`.
- Keep `memories` scoped to explicit eval lanes until promoted by evidence (legacy alias `memory_tool` is compatibility-only).
- Before implementation, run a standalone review of the task/spec against the user’s intent and record the approval in the spec + checklist notes. If anything is vague, infer with a subagent and self-approve or offer options; only ask the user when truly blocked.
- Delegation is mandatory for top-level tasks once a task id exists: spawn at least one subagent run using `MCP_RUNNER_TASK_ID=<task-id>-<stream>`, capture manifest evidence, and summarize in the main run. Use `DELEGATION_GUARD_OVERRIDE_REASON` only when delegation is impossible and record the justification.
- Once a task id exists, prefer delegation for research, review, and planning work. Use `codex exec` only for pre-task triage (no task id yet) or when delegation is genuinely unavailable (technical/blocking limitation or explicit operational block), and set `DELEGATION_GUARD_OVERRIDE_REASON` with a clear justification.
- Keep delegation MCP enabled by default (only MCP on by default). Enable other MCPs only when relevant to the task.
- For Playwright-heavy browser work, use a dedicated subagent stream and keep parent context compact: store raw browser output in artifacts and return only a short summary plus evidence paths.
- Avoid hard dependencies on a specific MCP server; use whatever MCPs are available and relevant to the specific task.
- Follow `.agent/SOPs/oracle-usage.md` for Oracle runs (tool cap: 11 attachments; unique basenames; attachments-first workflow).

## Codex Version Policy (Execution)
- Current CO-local ChatGPT-auth/appserver model posture is `gpt-5.5` / `xhigh` on Codex CLI `0.135.0` when live access smoke passes; release-facing package/downstream-smoke pins intentionally hold at Codex CLI `0.125.0`, and `cloud-canary` intentionally holds at Codex CLI `0.124.0`, as recorded in `docs/guides/codex-version-policy.md`.
- Current `0.124.0` CO-local posture evidence confirmed `codex exec` prompt-plus-stdin support, `codex login --device-auth`, `codex review --help` exposing `[PROMPT]` alongside scoped review flags, live `gpt-5.5` `xhigh` availability, and a post-build runtime-mode canary pass (`20/20` per scenario, `ready_for_default_flip=true`).
- Release-facing downstream-smoke workflows intentionally pin `@openai/codex@0.125.0`, and `cloud-canary` intentionally pins `@openai/codex@0.124.0` until the required gates in `docs/guides/codex-version-policy.md` pass.
- Current model posture is `gpt-5.5` / `xhigh` when available in ChatGPT-auth Codex sessions; keep `explorer_fast` on `gpt-5.3-codex-spark` for file/codebase search only.
- Portable packaged/generated config still keeps `gpt-5.4` / `xhigh` as the fallback for unavailable `gpt-5.5`, API/cloud portability gaps, or unproven downstream/no-network contexts; use `gpt-5.5` for delegated/review surfaces after live access smoke unless a fresh provider lane validates a Codex-suffixed model variant.
- `codex-orchestrator doctor` treats `gpt-5.5` as non-drift when `codex debug models` verifies current model access; `codex-orchestrator codex defaults --yes` keeps fresh configs on portable fallback defaults, and `codex-orchestrator codex defaults --auth-scope chatgpt --yes` writes current ChatGPT-auth/appserver defaults after live access smoke without requiring extra marker metadata.
- Caveat: app-server `model/list` still reports `gpt-5.4` as `isDefault=true`; CO-341 live app-server `model/list` and live `codex exec` show `gpt-5.5` supports `xhigh` for explicit local configuration, and the bundled debug model catalog may lag the live catalog.
- CO-352 catalog caveat: local `0.125.0` live catalog lists `gpt-5.3-codex-spark`, but bundled `0.125.0` catalog does not, so downstream/no-network `explorer_fast` file/codebase-search-only posture remains unchanged.
- Treat residual plugin warnings from CO-341 as local temporary plugin cache warnings unless evidence maps them to CO-owned plugin manifests.
- CO may run newer stable/prerelease Codex builds in explicit task-scoped canary lanes only; do not treat them as automatic global defaults.
- App-server remains the normal local runtime path and provider-worker control authority when selected by the runtime provider. `codex exec` / `codex exec resume` are preserved as explicitly labeled break-glass or legacy CLI fallback when app-server authority is unavailable or intentionally bypassed.
- Required policy checks for newer-version lanes:
  - `scripts/runtime-mode-canary.mjs`
  - Required cloud contract run: `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`
  - Required fallback contract run: `CODEX_CLOUD_ENV_ID="" CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`
- If required checks fail, required cloud evidence is missing, or provider/model compatibility regresses, hold/revert only the affected surface and update decision evidence in `docs/TASKS.md`, `tasks/index.json`, and task checklist mirrors.
- Canonical policy/cadence guide: `docs/guides/codex-version-policy.md`.

## MCP vs Collab (Decision Rule)
- Default to MCP for approvals, tool routing, delegation, external integrations, and audit trails.
- Use collab only for intra-run brainstorming, role-split planning, or parallel subcalls.
- Collab means auxiliary assistant agents inside a run; enable it via `RLM_SYMBOLIC_MULTI_AGENT=1` (legacy alias: `RLM_SYMBOLIC_COLLAB=1`; see `docs/guides/collab-vs-mcp.md`).
- For collab `spawn_agent`, always set explicit `agent_type` (omission defaults to `default`) and prefix prompts with `[agent_type:<role>]`; use `fork_context=true` only when a stream explicitly needs prior thread history.
- The “top-level Codex” is the MCP-run agent the user is interacting with; collab agents are assistants and do not represent the run.

## Standalone Reviews (Ad-hoc)
- Prefer `npm run review` for ad-hoc reviews in this repo so task-scoped evidence is captured and delegation MCP remains enabled by default.
- Use direct `codex review` only for quick best-effort checks when manifest-backed evidence is not needed.
- In non-interactive/CI runs (stdin is not a TTY, or `CODEX_REVIEW_NON_INTERACTIVE=1` / `CODEX_NON_INTERACTIVE=1` / `CODEX_NO_INTERACTIVE=1`), direct/manual `codex-orchestrator review`/`npm run review` prints the handoff prompt and exits unless `FORCE_CODEX_REVIEW=1` is set.
- Non-interactive lane policy: direct/manual wrapper runs stay handoff-only unless `FORCE_CODEX_REVIEW=1`; authoritative gate lanes set `CODEX_REVIEW_AUTHORITATIVE_GATE=1`, require `NOTES`, and fail closed instead of printing prompt-only handoff success; `docs-review` and `implementation-gate` explicitly force review execution; `docs-relevance-advisory` explicitly clears `FORCE_CODEX_REVIEW` and remains prompt-only/advisory; the `provider-linear-worker` pipeline exports `CODEX_REVIEW_NON_INTERACTIVE=1`, `FORCE_CODEX_REVIEW=1`, and `CODEX_REVIEW_AUTHORITATIVE_GATE=1`, so its pre-handoff standalone review executes before `Human Review` / `In Review`.
- Scoped wrapper policy: explicit `npm run review -- --uncommitted|--base|--commit` runs keep the full prompt/context in the saved `review/prompt.txt` and carry reviewer-visible scoped context via `--title` (user-provided when present, otherwise synthesized from `NOTES` + `--surface`).
- Wrapper truthfulness: `codex review --help` in `0.124.0` exposes `[PROMPT]` with scoped review flags, but CO continues to rely on saved prompt artifacts plus bounded `--title` transport for deterministic scoped runs; if Codex rejects a synthesized scoped `--title`, the wrapper retries the same explicit scope without `--title` and falls back to artifact-only reviewer-visible context.
- Scoped surface limit: explicit `--uncommitted|--base|--commit` wrapper runs support only the default `diff` surface at the actual Codex layer; `--surface audit|architecture` requires an unscoped prompt-capable review.
- Capture the standalone review approval (even if “no issues”) in the spec/task notes before implementation begins.
- For manifest-backed review evidence, run `TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ..." codex-orchestrator review --manifest <path>` (repo alias: `npm run review -- --manifest <path>`).
- For downstream simulation of review-wrapper or bundled-skill changes, run `npm run pack:smoke` (packaged CLI in a temp mock repo, review artifacts, and `long-poll-wait` install assertion). Core lane enforces this on downstream-facing diffs; `.github/workflows/pack-smoke-backstop.yml` runs a weekly `main` backstop.
- See `docs/standalone-review-guide.md` for the canonical workflow.
- Prefer the global `standalone-review` skill when installed; bundled skills ship for downstream release packaging.
- During active non-trivial implementation, run standalone review at implementation checkpoints (after coding bursts/sub-goals/feedback batches) and pair with an elegance pass before handoff/merge.

## PR Lifecycle (Top-Level Agents)
- Open PRs for code/config changes and keep the scope tied to the active task.
- Monitor PR checks and review feedback for 10–20 minutes after all required checks turn green.
- Maintain polling until checks and reviews reach terminal status; reset the waiting window if checks restart or new feedback appears.
- Before merge, verify unresolved actionable review threads are zero (replying is not the same as resolving); explicitly resolve each addressed thread or record a waiver with evidence in the task checklist.
- If Codex review is unavailable due to quota, merge requires an explicit waiver: required checks are green, unresolved actionable review threads are `0`, and the task checklist records quota evidence plus the waiver decision.
- If checks remain green and no new feedback arrives during the window, merge via GitHub and delete the branch.
- Reset the window if checks restart or feedback arrives; do not merge draft PRs or PRs labeled "do not merge."

## GitHub Agent Review Replies
- Always reply directly in the original review discussion thread (line comment), not just top-level PR comments.
- For agents that require explicit mention (for example `@coderabbitai`), tag the agent and mention what changed plus the commit SHA.
- For Codex (`chatgpt-codex-connector`), do not tag per-thread for routine re-review because Codex automatically re-reviews on each push; when a manual Codex pass is needed, send at most one `@codex` ping per PR head SHA and wait for a new head (new push) before pinging again.
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
