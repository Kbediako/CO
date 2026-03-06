<!-- codex:instruction-stamp 94c865b40e35a3d952175ca24cdf4c2caec066a97ae844c4dc62c898c87668f8 -->
# Agent Instructions (Template)

## Orchestrator-first workflow
- Use `codex-orchestrator` pipelines for planning, implementation, validation, and review.
- Default to `docs-review` before implementation and `implementation-gate` after code changes.
- Use `docs-relevance-advisory` when you need semantic docs relevance signal without hard-gate behavior.
- Prefer cloud mode when runs are long-running/parallel and cloud prerequisites are ready.
- Before cloud mode, verify branch availability, non-interactive setup commands, and required secrets/variables; if missing, run in local `mcp` mode and record why.
- Before implementation, run a standalone review of the task/spec against the user’s intent and record the approval in the spec + checklist notes.
- Delegation is mandatory for top-level tasks once a task id exists: spawn at least one subagent run using `MCP_RUNNER_TASK_ID=<task-id>-<stream>`, capture manifest evidence, and summarize in the main run. Use `DELEGATION_GUARD_OVERRIDE_REASON` only when delegation is impossible (technical/blocking limitation or explicit operational block) and record the justification.
- Once a task id exists, prefer delegation for research, review, and planning work. Use `codex exec` only for pre-task triage (no task id yet) or when delegation is genuinely unavailable (technical/blocking limitation or explicit operational block), and set `DELEGATION_GUARD_OVERRIDE_REASON` with a clear justification.
- Keep delegation MCP enabled by default (only MCP on by default). Enable other MCPs only when relevant to the task.

## Docs-first (spec-driven)
- Create or refresh PRD + TECH_SPEC + ACTION_PLAN + the task checklist before edits.
- Link TECH_SPECs in `tasks/index.json` and update `last_review` dates.
- Translate the user request into the PRD and update it as you learn new constraints or scope changes.

## Standalone reviews (ad-hoc)
- Use `codex review` for quick checks during implementation.
- Capture standalone review approval in the spec/task notes before implementation begins.
- When you need manifest-backed review evidence, run `npm run review` with the manifest path.
- Before merge for non-trivial changes, run one explicit elegance/minimality review pass and simplify avoidable complexity.

## Delegation (recommended)
- For non-trivial work, spawn at least one subagent run using `MCP_RUNNER_TASK_ID=<task-id>-<stream>`.
- If delegation is not possible, record the reason in the task checklist.

## Deliberation Default (agent-first)
- Keep MCP as the lead control plane. Use collab/delegated subagents for deliberation when ambiguity or impact is high.
- Terminology: `collab` is the workflow/tooling name, while Codex CLI feature gating uses `features.multi_agent=true` (legacy alias/names like `RLM_SYMBOLIC_COLLAB` and `manifest.collab_tool_calls` still use `collab`).
- Run full deliberation on any hard-stop trigger:
  - Irreversible/destructive changes with unclear rollback.
  - Auth/secrets/PII boundary changes.
  - Direct production customer/financial/legal impact.
  - Conflicting intent on high-impact changes.
- Otherwise, use a simple risk score (`0..2` each): reversibility, external impact, security/privacy boundary, blast radius, requirement clarity, verification strength, time pressure.
- Require full deliberation when score `>=7` or two or more criteria score `2`.
- Time budgets for auto-deliberation:
  - `T0` quick: `5s / 12s` (soft/hard)
  - `T1` standard: `20s / 45s`
  - `T2` complex: `60s / 120s`
  - `T3` long-horizon: `120s / 300s`
- On soft cap: stop branching and execute the best current plan.
- On hard cap: disable auto-deliberation for that stage and continue execution.
- Review-signal policy:
  - `P0` critical findings are hard-stop.
  - `P1` high findings are hard-stop only when high-signal (clear evidence or corroboration).
  - `P2/P3` findings are tracked follow-ups.

## Agent role baseline
- Built-in roles are `default`, `explorer`, `worker`, and `awaiter`; `researcher` is user-defined.
- `spawn_agent` defaults to `default` when `agent_type` is omitted; always set `agent_type` explicitly.
- For symbolic collab runs, prefix spawned prompts with `[agent_type:<role>]` on line one so role intent is auditable from JSONL/manifests.
- Keep top-level defaults on the current CO target by setting `model = "gpt-5.4"` in `~/.codex/config.toml`.
- Keep delegated subagent and review surfaces on `gpt-5.4` as well when using ChatGPT auth; `gpt-5.4-codex` is currently unsupported there.
- Set `model_reasoning_effort` to at least `high` (CO default: `xhigh`) so spawned agents inherit high reasoning unless role overrides change it.
- Built-in `explorer` inherits top-level model defaults unless you attach a `config_file`; keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception.
- Spark caveat: `gpt-5.3-codex-spark` is text-only.
- Keep RLM/collab built-ins-first by default; add custom specialist roles only when there is measured value, clear ownership, and validation evidence.
- Use `[agents] max_threads = 12` as the seeded baseline. Keep explicit `max_depth = 4` / `max_spawn_depth = 4` only when your local Codex parser accepts them; preserve any intentional constrained caps instead of resetting them.
- Keep fallback usage explicit and rare: `8/2/2` for constrained/high-risk lanes, `6/1/1` only as break-glass.
- Add an explicit `worker_complex` role (`gpt-5.4`, `xhigh`) for high-risk implementation streams.
- Use `codex-orchestrator doctor` as an advisory drift check for Codex defaults; remediate additively via `codex-orchestrator codex defaults --yes`.

## Completion discipline (patience-first)
- Wait/poll for terminal state on long-running operations (CI checks, reviews, cloud jobs, orchestrator runs) before reporting completion.
- Reset waiting windows when checks restart or new feedback appears.
- Do not hand off mid-flight work unless the user explicitly asks to stop.
- Awaiter triage: treat long waits as expected unless progress is flat across multiple polling windows; increase timeouts before declaring a stall.

## Instruction stamp
- If you edit this file, refresh the instruction stamp.
- One-liner:
  `node -e "const fs=require('fs');const crypto=require('crypto');const p=fs.existsSync('templates/codex/AGENTS.md')?'templates/codex/AGENTS.md':'AGENTS.md';const raw=fs.readFileSync(p,'utf8');const body=raw.replace(/^<!--\\s*codex:instruction-stamp\\s+[a-f0-9]{64}\\s*-->\\r?\\n?/i,'');const hash=crypto.createHash('sha256').update(body,'utf8').digest('hex');fs.writeFileSync(p,'<!-- codex:instruction-stamp '+hash+' -->\\n'+body);"`
