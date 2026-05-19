<!-- codex:instruction-stamp aa8722d4946c445a5e8571b47b400a5932c144e9a10c76b11e057770e25f2de1 -->
# Codex-Orchestrator Agent Handbook (Template)

Use this repository as the wrapper that coordinates multiple Codex-driven projects. After cloning, replace placeholder metadata (task IDs, documents, SOPs) with values for each downstream initiative while keeping these shared guardrails in place.

## Execution Modes & Approvals
- Default execution mode is `mcp`.
- Switch to cloud mode only if your task plan explicitly allows it and the reviewer records the override in the active run manifest.
- Prefer cloud mode when work is long-running, highly parallel, or blocked by local resource constraints.
- Before cloud mode, run a quick preflight: remote branch exists, setup commands are non-interactive, and required secrets/variables are available.
- If cloud preflight fails (for example, missing cloud environment wiring), continue in local `mcp` mode and record the fallback reason in checklist/manifests; for strict cloud lanes, set `CODEX_ORCHESTRATOR_CLOUD_FALLBACK=deny` to fail fast instead of falling back.
- Keep mode semantics explicit and orthogonal: `executionMode=mcp|cloud` and `runtimeMode=cli|appserver` are separate controls.
- Local default runtime remains `appserver` (ChatGPT login-first / app-server path), with `--runtime-mode cli` preserved as break-glass.
- `executionMode=cloud` with explicit `runtimeMode=appserver` is unsupported and must fail fast with actionable errors.
- Feature posture: upstream `rust-v0.128.0` removed `js_repl` and `js_repl_tools_only`, and current local `0.130.0` still reports both as removed; do not set `CODEX_CLOUD_ENABLE_FEATURES` / `CODEX_CLOUD_DISABLE_FEATURES` to either `js_repl` or `js_repl_tools_only`, or run `codex features enable/disable js_repl` / `codex features enable/disable js_repl_tools_only`. Use `CODEX_CLOUD_ENABLE_FEATURES` / `CODEX_CLOUD_DISABLE_FEATURES` only for active non-removed feature names after checking `codex features list`. Keep `memories` scoped to explicit eval lanes (legacy alias `memory_tool` remains compatibility-only).
- Permission posture: Codex CLI `0.130.0` keeps the explicit permission-profile/trust-flow guidance; do not recommend `--full-auto` as normal flow. Use explicit permission profiles and trust flows, with built-in config profile ids `:read-only`, `:workspace`, and `:danger-no-sandbox`; treat `default_permissions = ":danger-no-sandbox"` as the profile-backed local-only no-sandbox advisory equivalent of top-level `sandbox_mode = "danger-full-access"`.
- Keep the safe approval profile (`read/edit/run/network`). Capture any escalation in `.runs/<task>/<timestamp>/manifest.json` under `approvals`.
- Run `node scripts/delegation-guard.mjs` before requesting review; if delegation is not possible, set `DELEGATION_GUARD_OVERRIDE_REASON` and record the rationale in the task checklist.
- Run `node scripts/spec-guard.mjs --dry-run` before requesting review. The guard fails when tracked implementation paths change without a spec update (`tasks/specs/**`, `docs/design/specs/**`, or `tasks/index.json`) or when any spec file in those directories has `last_review` older than 30 days.

## MCP vs Collab (Decision Rule)
- Default to MCP for approvals, tool routing, delegation, external integrations, and audit trails.
- Use collab only for intra-run brainstorming, role-split planning, or parallel subcalls.
- Collab means auxiliary assistant agents inside a run; enable it via `RLM_SYMBOLIC_MULTI_AGENT=1` (legacy alias: `RLM_SYMBOLIC_COLLAB=1`; see `docs/guides/collab-vs-mcp.md`).
- Terminology: `collab` is the workflow/tooling name, while Codex CLI feature gating uses `features.multi_agent=true` (legacy alias/names like `RLM_SYMBOLIC_COLLAB` and `manifest.collab_tool_calls` still use `collab`).
- The “top-level Codex” is the MCP-run agent the user is interacting with; collab agents are assistants and do not represent the run.

## Agent Role Baseline
- Built-in roles are `default`, `explorer`, `worker`, and `awaiter`; `researcher` is user-defined.
- `spawn_agent` defaults to `default` when `agent_type` is omitted; always set `agent_type` explicitly.
- For symbolic collab runs, prefix spawned prompts with `[agent_type:<role>]` on line one so role intent is auditable from JSONL/manifests.
- For spawned subagents, default to bounded prompts without inherited context; use `fork_context=true` only when a stream explicitly needs prior thread history to avoid prompt bloat/redundancy.
- Use `gpt-5.5` / `xhigh` as the current operator posture when available in ChatGPT-auth Codex sessions.
- Portable packaged/generated config still keeps `model = "gpt-5.4"` and `model_reasoning_effort = "xhigh"` as fallback values when `gpt-5.5`, API, or cloud portability is unavailable.
- CO-local `gpt-5.5` / `xhigh` is the current ChatGPT-auth/appserver posture after CO-352 evidence; use `gpt-5.4` only as a concrete fallback for access failure, cloud/API portability gaps, or downstream/no-network surfaces.
- CO-352 evaluated the `0.125.0` model-catalog posture and adopted `gpt-5.5` / `xhigh` for validated CO-local appserver surfaces; required cloud execution and bundled/no-network catalog divergence keep only cloud/release pins and the `explorer_fast` file/codebase search only role gated.
- Set `model_reasoning_effort` to at least `high` (CO default: `xhigh`) so spawned agents inherit high-reasoning behavior unless role overrides change it.
- Built-in `explorer` now inherits top-level model defaults unless you attach a custom `config_file`; keep an explicit `agents.explorer` entry only when you want a custom description/override, and keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.
- Caveat: spark roles are file/codebase search only; use non-spark roles when image inputs are required.
- Prefer built-ins-first for RLM/collab flows; add custom specialist roles only with a measured benefit, explicit owner, and validation evidence.
- For normal `features.multi_agent=true` and older Codex behavior, set `[agents] max_threads = 12` as the seeded baseline. For Codex CLI `0.125+` with `features.multi_agent_v2=true`, do not write or recommend `agents.max_threads`; upstream rejects the key, so doctor/default setup must omit it. For Codex CLI `0.128+`, the v2-specific cap `features.multi_agent_v2.max_concurrent_threads_per_session` is user-owned tuning and CO does not seed it by default. Keep explicit `max_depth = 4` only when your local Codex parser accepts it; do not treat `max_spawn_depth` as a current CO baseline recommendation.
- Fallback policy is contingency-only (not routine) and applies only to v1/older configs that still accept thread/depth caps: use `max_threads = 8` and `max_depth = 2` for constrained/high-risk lanes; use legacy `6/1/1` only as a break-glass profile when an older local parser/runtime still consumes spawn-depth caps.
- Use an explicit `worker_complex` role (`gpt-5.5`, `xhigh` for current CO-local ChatGPT-auth/appserver work; `gpt-5.4`, `xhigh` only for portable fallback surfaces) for high-risk implementation streams.
- Use `codex-orchestrator doctor` as an advisory drift check for Codex defaults (model/reasoning/agent baseline); remediation is additive via `codex-orchestrator codex defaults --yes` for portable fallback defaults or `codex-orchestrator codex defaults --auth-scope chatgpt --yes` after live access smoke, with exact prior CO-managed role baselines auto-migrated to the access-verified current ChatGPT-auth posture while preserving unrelated local customization and the `multi_agent_v2` rule that omits `agents.max_threads`.

## Codex Version Policy (CO Scope)
- Current CO-local ChatGPT-auth/appserver model posture is `gpt-5.5` / `xhigh` on Codex CLI `0.130.0` when live access smoke passes; release-facing package/downstream-smoke pins intentionally hold at Codex CLI `0.125.0`, and `cloud-canary` intentionally holds at Codex CLI `0.124.0`, as recorded in `docs/guides/codex-version-policy.md`.
- Current `0.124.0` CO-local posture evidence confirmed `codex exec` prompt-plus-stdin support, `codex login --device-auth`, `codex review --help` exposing `[PROMPT]` alongside scoped review flags, live `gpt-5.5` `xhigh` availability, and a post-build runtime-mode canary pass (`20/20` per scenario, `ready_for_default_flip=true`).
- CO-518 `0.130.0` release-intake adopts the local ChatGPT-auth/appserver CLI command/runtime posture while keeping the CO-352 `gpt-5.5` / `xhigh` model posture; required cloud execution still fails with the configured environment id not found, and fallback cloud evidence is currently blocked by unrelated `docs:freshness:maintain` owner debt, so cloud/release promotion stays blocked.
- CO-485 rebaselined current-facing permission posture for `0.128.0`; CO-518 confirms `0.130.0` keeps the explicit sandbox/profile and trust-flow posture: top-level `--full-auto` is not a normal path, durable config should prefer permission-profile evidence (`default_permissions` / active-profile metadata) over legacy sandbox shorthand, and provider-worker guidance must keep trust/cwd controls separate from permission profiles.
- Release-facing downstream-smoke workflows intentionally pin `@openai/codex@0.125.0`, and `cloud-canary` intentionally pins `@openai/codex@0.124.0` until the required gates in `docs/guides/codex-version-policy.md` pass.
- Current model posture is `gpt-5.5` / `xhigh` when available in ChatGPT-auth Codex sessions; keep `explorer_fast` on `gpt-5.3-codex-spark` for file/codebase search only.
- Portable packaged/generated config still keeps `gpt-5.4` / `xhigh` as the fallback for unavailable `gpt-5.5`, API/cloud portability gaps, or unproven downstream/no-network contexts; use `gpt-5.5` for delegated/review surfaces after live access smoke unless a fresh provider lane validates a Codex-suffixed model variant.
- Caveat: app-server `model/list` still reports `gpt-5.4` as `isDefault=true`; CO-341 live app-server `model/list` and live `codex exec` show `gpt-5.5` supports `xhigh` for explicit local configuration, and the bundled debug model catalog may lag the live catalog.
- Treat residual plugin warnings from CO-341 as local temporary plugin cache warnings unless evidence maps them to CO-owned plugin manifests.
- Evaluate newer stable/prerelease Codex builds only in explicit, task-scoped CO lanes where evidence is captured under `.runs/<task-id>/` and `out/<task-id>/manual/`.
- Newer-version cloud/release adoption remains evidence-gated: no P0/P1 regressions, runtime-mode canary pass, required cloud canary contract pass, and clean fallback cloud evidence.
- If any required lane fails (or provider/model compatibility regresses), hold/revert only the affected surface and record the decision in `docs/TASKS.md`, `tasks/index.json`, and task checklists.
- For policy details and cadence, follow `docs/guides/codex-version-policy.md`.
- App-server remains the normal local runtime path and is the provider-worker control authority when selected by the runtime provider. `codex exec` / `codex exec resume` are preserved as explicitly labeled break-glass or legacy CLI fallback when app-server authority is unavailable or intentionally bypassed.

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
- Use `docs-relevance-advisory` as a non-blocking semantic docs lane when you need relevance drift signal without deterministic gating.
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
- Link TECH_SPECs in `tasks/index.json` and update `last_review` dates as part of the docs-first step; task registration is canonical under `items[]` (legacy top-level `tasks[]` is non-canonical).
- If docs are missing or stale, STOP and request approval before editing files.
- Use `.agent/task/templates/tech-spec-template.md` for TECH_SPECs and `.agent/task/templates/action-plan-template.md` for ACTION_PLANs.
- Prefer the bundled `docs-first` skill for consistent steps.
- Translate the user request into the PRD and update it as you learn new constraints or scope changes.
- For autonomy-facing backlog or follow-up lanes, the docs packet must preserve the issue-shaping contract before implementation starts: user-request translation, protected terms / exact artifact and surface names, nearby wrong interpretations to reject, explicit non-goals, `Not done if`, and a current/reference/target parity matrix when the lane is about parity or alignment.
- Before implementation, record a lightweight issue-quality review in the spec/task notes confirming the issue is not still plausibly narrower than the user's request.
- The micro-task path is unavailable for parity/alignment lanes or work whose correctness depends on exact naming, exact surfaces, or protected wording.
- The micro-task path is also unavailable when a task adds, retains, or touches fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior anywhere in the repo.
- For low-risk tiny changes, use the bounded micro-task path in `docs/micro-task-path.md` (still requires task/spec evidence).

## Fallback Expiry & Large Refactors
- Follow `docs/guides/fallback-expiry-and-refactor-policy.md` whenever a task adds, retains, or touches fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior.
- Every touched fallback or seam in a fallback-facing task must choose one decision before implementation: `remove fallback`, `expire fallback`, or `justify retaining fallback`.
- Retained temporary fallbacks require an owner, trigger, introduced date, review date, allowed maximum lifetime, removal condition, and validation evidence.
- Default maximum lifetime is 60 days; named high-churn control surfaces (`provider workflow`, `review wrapper`, `runtime routing`, `docs freshness ownership`, and `control-host status surfaces`) are capped at 30 days; security, auth, PII, customer-impacting, financial, or production-impact fallbacks are capped at 14 days; approved external migration bridges may use the documented 90-day exception.
- Prefer a large refactor over another minor seam when authority is split across live/cached/legacy state, the same governed surface already carries two active fallbacks, the proposed branch spans multiple lifecycle phases, or the removal condition cannot be stated clearly.
- Do not hand off an expired fallback to review unless it is removed, refreshed by a new issue-quality review, or the issue is moved to a real blocked state with the dependency recorded.

## Standalone Reviews (Ad-hoc)
- Prefer `codex-orchestrator review` for ad-hoc reviews in this repo so task-scoped evidence is captured, delegation MCP remains available by default, and optional runtime guards can be applied when needed (`npm run review` is the repo-local alias).
- `codex-orchestrator review` keeps runtime unbounded by default and emits patience-first monitor checkpoints while waiting; tune/disable via `CODEX_REVIEW_MONITOR_INTERVAL_SECONDS`.
- For large uncommitted diffs, `codex-orchestrator review` emits scope advisories and prompt shaping; tune thresholds via `CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD` / `CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD`.
- Use direct `codex review` only for quick best-effort checks when manifest-backed evidence is not needed; if it hangs in delegation startup, switch to `codex-orchestrator review`.
- In non-interactive/CI runs (stdin is not a TTY, or `CODEX_REVIEW_NON_INTERACTIVE=1` / `CODEX_NON_INTERACTIVE=1` / `CODEX_NO_INTERACTIVE=1`), `codex-orchestrator review` prints the handoff prompt and exits unless `FORCE_CODEX_REVIEW=1` is set.
- Non-interactive lane policy: direct/manual wrapper runs stay handoff-only unless `FORCE_CODEX_REVIEW=1`; `docs-review` and `implementation-gate` explicitly force review execution; `docs-relevance-advisory` explicitly clears `FORCE_CODEX_REVIEW` and remains prompt-only/advisory; the `provider-linear-worker` pipeline exports `CODEX_REVIEW_NON_INTERACTIVE=1` and `FORCE_CODEX_REVIEW=1`, so its pre-handoff standalone review executes before `Human Review` / `In Review`.
- Scoped wrapper policy: explicit `npm run review -- --uncommitted|--base|--commit` runs keep the full prompt/context in `review/prompt.txt` and carry reviewer-visible scoped context via `--title` (user-provided when present, otherwise synthesized from `NOTES` + `--surface`).
- Wrapper truthfulness: `codex review --help` in `0.124.0` exposes `[PROMPT]` with scoped review flags, but CO continues to rely on saved prompt artifacts plus bounded `--title` transport for deterministic scoped runs; if Codex rejects a synthesized scoped `--title`, the wrapper retries the same explicit scope without `--title` and falls back to artifact-only reviewer-visible context.
- Scoped surface limit: explicit `--uncommitted|--base|--commit` wrapper runs support only the default `diff` surface at the actual Codex layer; `--surface audit|architecture` requires an unscoped prompt-capable review.
- When you need manifest-backed review evidence, run `TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ..." MANIFEST=<path> codex-orchestrator review --manifest <path>` (`npm run review -- --manifest <path>` is equivalent in this repo). A `NOTES` entry is required for authoritative review gates; missing notes require an explicit break-glass waiver with owner, expiry, reason, and evidence.
- See `docs/standalone-review-guide.md` for the canonical workflow.
- Prefer the bundled `standalone-review` skill for ad-hoc review steps.
- Prefer the bundled `elegance-review` skill for the required post-implementation minimality pass.
- During active non-trivial implementation, run standalone review at implementation checkpoints (after coding bursts/sub-goals/feedback batches) and pair with an elegance pass before handoff/merge.

## Completion Discipline (Patience-First)
- For CI checks, review agents, cloud jobs, and orchestrator runs, wait/poll until terminal state before reporting completion.
- Keep polling windows active after green checks and reset the window if checks restart or new feedback arrives.
- Do not hand off an in-progress workflow unless the user explicitly asks to stop early.
- Awaiter triage: treat long waits as normal until objective evidence shows a stall (no status/heartbeat/progress movement across multiple polling windows); increase wait timeouts before intervening.

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
- Keep `docs/TASKS.md` under the hard limit and reserve target in `docs/tasks-archive-policy.json`; the tasks archive automation workflow opens a PR and updates the `task-archives` branch once reserve headroom is exhausted on `main`. Use `npm run docs:archive-tasks` for manual fallback.
- Archive implementation docs (PRD/TECH_SPEC/ACTION_PLAN, task checklists, mirrors) using `docs/implementation-docs-archive-policy.json`; the automation workflow syncs payloads to `doc-archives` and opens a PR with stubs. Use `npm run docs:archive-implementation` for manual fallback.
- Keep `reference/` lean by storing only the active snapshot plus the automation scripts (loader macros, serve README). Serve-from-archive instructions should point to the canonical timestamped folder so reviewers can reproduce results without keeping every raw asset in the repo.
- Before new iterations, run the cleanup script (or manually remove stray `.runs`/`archives` folders) so the working tree returns to a clean state while leaving committed improvements intact.

## PR Lifecycle (Top-Level Agents)
- Open PRs for code/config changes and keep the scope tied to the active task.
- Monitor PR checks and review feedback for 10–20 minutes after all required checks turn green (use a background loop when possible).
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

## Build & Test Commands (defaults)
Implementation work is not “complete” until you run (in order):
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `npm run repo:stewardship`
9. `node scripts/diff-budget.mjs`
10. `codex-orchestrator review` (or `npm run review` in this repo)
11. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

| Command | When to use | Notes |
| --- | --- | --- |
| `node scripts/delegation-guard.mjs` | Delegation enforcement | Requires at least one subagent manifest for top-level tasks; set `DELEGATION_GUARD_OVERRIDE_REASON` to bypass. |
| `node scripts/spec-guard.mjs --dry-run` | Spec/codepath guard | Fails when tracked implementation paths change without a spec update, or when any spec under `tasks/specs/**` / `docs/design/specs/**` has `last_review` older than 30 days. |
| `npm run build` | Build output | Compiles TypeScript to `dist/` (required by `docs:check`, `review`, and other wrappers). |
| `npm run lint` | Pre-commit / review gates | Executes `npm run build:patterns` first so codemods compile. |
| `npm run test:core` | Core Lane / narrow core matrix | Runs `vitest.config.core.ts`; excludes `adapters/**` and `evaluation/tests/**`. |
| `npm run test` | Default repo validation alias | Alias to `test:core`; keeps the core-only validation surface explicit while broader adapter coverage stays under `npm run test:all`. |
| `npm run test:all` | Explicit broader matrix | Runs `test:core` plus `test:adapters` without silently pulling the opt-in evaluation lane into the default path. |
| `npm run docs:check` | Docs hygiene gate | Deterministically validates scripts/pipelines/paths referenced in agent-facing docs, current posture locks, bundled-skill roster parity, and the README front-door budget. |
| `npm run docs:freshness` | Docs freshness gate | Validates registry coverage plus docs-catalog class coverage and emits a class-separated `out/<task-id>/docs-freshness.json`. |
| `npm run repo:stewardship` | Repo stewardship audit | Inventories tracked files via `git ls-files`, classifies each surface as `validate`, `update`, `delete`, or `retain_with_rationale`, and emits `out/<task-id>/repo-stewardship.json`. |
| `node scripts/diff-budget.mjs` | Review scope guard | Fails when diffs exceed the configured budget unless `DIFF_BUDGET_OVERRIDE_REASON` is set. |
| `npm run eval:test` | Evaluation-only harness lane | Alias to `npm run test:evaluation`; optional, enable when `evaluation/fixtures/**` exists or evaluation scope is touched. |
| `codex-orchestrator review` (`npm run review` alias) | Reviewer hand-off | Writes task/PRD context plus manifest evidence into the saved review prompt artifact. Unscoped launches pass that prompt inline to `codex review`. Explicit `--uncommitted` / `--base` / `--commit` launches keep the full prompt in `review/prompt.txt` and carry reviewer-visible scoped context via `--title` (user-provided when present, otherwise synthesized from `NOTES` + `--surface`) so scoped runs stay deterministic across current Codex review behavior. Explicit scoped launches still support only the default `diff` surface at the actual Codex layer; `--surface audit` / `--surface architecture` must fail fast and be rerun without the explicit scope. In non-interactive/CI runs (stdin not TTY or `CODEX_REVIEW_NON_INTERACTIVE=1` / `CODEX_NON_INTERACTIVE=1` / `CODEX_NO_INTERACTIVE=1`) direct/manual runs print the handoff prompt and exit unless `FORCE_CODEX_REVIEW=1`; authoritative gate lanes set `CODEX_REVIEW_AUTHORITATIVE_GATE=1`, require `NOTES`, and fail closed instead of treating prompt-only output as success. `docs-review` / `implementation-gate` and the `provider-linear-worker` pipeline set the forcing env for executed unattended review, while `docs-relevance-advisory` keeps it cleared for prompt-only advisory behavior. |
| `npm run pack:smoke` | Downstream simulation gate | Packs + installs tarball in a temp mock repo, validates CLI behavior (`review` artifacts + delegate-server JSONL), and checks bundled skill install output. Core lane enforces it on downstream-facing diffs; `.github/workflows/pack-smoke-backstop.yml` runs a weekly main-branch backstop. |

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
