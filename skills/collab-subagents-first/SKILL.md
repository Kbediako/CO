---
name: collab-subagents-first
description: Manage non-trivial tasks via focused collab subagents to save context and improve throughput. Use when work spans multiple files/components, can be split into independent streams, needs separate validation/review, or risks context bloat. Favor direct execution for trivial one-shot tasks.
---

# Collab Subagents First

## Overview

Delegate as a manager, not as a pass-through. Split work into narrow streams, give each subagent a rich brief, and keep parent context lean by collecting short structured summaries plus evidence paths.

Note: If a global `collab-subagents-first` skill is installed, prefer that and fall back to this bundled skill.

## Terminology + feature gate

- Use "collab" as the workflow/tooling term for subagent calls (`spawn_agent` / `wait` / `close_agent`).
- Codex CLI enablement is `features.multi_agent=true`; `collab` remains as legacy naming in fields like `RLM_SYMBOLIC_COLLAB` and `manifest.collab_tool_calls`.
- Keep existing env/artifact key names as-is unless upstream explicitly changes those interfaces.

## Delegation gate

Use subagents when any condition is true:
- Task spans more than one subsystem or more than one file.
- Work naturally splits into independent streams (for example research + implementation + verification).
- Work likely exceeds about 5-10 minutes.
- Separate review/verification is required before handoff.
- Parent context is growing and summary compression is needed.
- You are unsure whether the task should be delegated.

Default rule:
- For any non-trivial task, spawn at least one subagent early (even if work is mostly single-stream) to offload execution and preserve parent context.

Skip subagents when all conditions are true:
- Single-file or tightly scoped change.
- No parallelizable stream exists.
- Execution and verification are straightforward in one pass.
- Expected duration is under about 5 minutes.

## Workflow

1) Define parent success criteria
- Write 3-6 acceptance bullets before spawning.
- Define "done" and required validation upfront.

2) Choose delegation shape
- Minimum for non-trivial work: 1 subagent (`implement` or `research`).
- Standard: 2 subagents (`implement` + `review/verify`).
- Complex/high-risk: 3-4 subagents (`research`, `implement`, `tests`, `review`).
- If uncertain, spawn a short-lived `scout` subagent first to propose decomposition and risks.

3) Split into narrow streams
- Prefer 1-4 streams based on the chosen shape.
- Assign one owner per stream and avoid overlapping file ownership.
- Good stream labels: `research`, `implement`, `tests`, `review`.

4) Send a rich brief to each subagent
- Use the required brief template from `references/subagent-brief-template.md`.
- Include objective, scope, constraints, acceptance criteria, and expected output format.
- Require concise summaries and evidence paths; avoid long logs in chat.

4a) Declare write policy and track ownership against git status
- Capture a baseline before spawning: `git status --porcelain`.
- Declare each stream as either:
  - `read-only` (research/scout/review), or
  - `write-enabled` (implementation/tests).
- For `read-only` streams, include an explicit "no file edits" constraint.
- After each `wait`, compare status against baseline and map changed files to stream ownership.
- Treat in-scope edits from active write-enabled streams as expected delegated output.
- Escalate only for out-of-scope changes, overlapping ownership collisions, or edits appearing without an active stream owner.
- If the agent surfaces a generic "unexpected local edits" pause prompt, treat it as a classification step: keep and continue when edits are in-scope; escalate only violations.
- Prefer the built-in helper when available (`node scripts/subagent-edit-guard.mjs ...`); canonical command examples live in `docs/delegation-runner-workflow.md` (section `3a`). If the helper is not present in the current repo, use the same baseline/scope logic manually.
- If `finish` exits non-zero, escalate only the reported `out_of_scope_paths` / `violations`.

5) Run streams in parallel when independent
- Spawn multiple subagents for independent streams.
- Wait for all subagents to finish before final synthesis.

6) Synthesize with context compression
- Merge only decisions, findings, and evidence links into parent context.
- Keep full details in artifacts/files instead of long conversation dumps.
- Force summary discipline: keep each subagent synthesis to a short block with outcome, files, validation, findings, and open questions only.

7) Verify before handoff
- Run parent-level validation/tests.
- Run standalone review on merged changes (see review loop below).

8) Re-check delegation need at checkpoints
- Re-evaluate delegation after major context growth (for example every 6-8 parent messages, or after crossing about 8 touched files, or when the plan changes materially).
- If parent context starts bloating, spawn/redirect subagents instead of continuing in parent.
- Keep the delegation tree shallow. Prefer parent fan-out over subagent-of-subagent chains.

## Spawn payload + labels (current behavior)

- `spawn_agent` accepts exactly one input style:
  - `message` (plain text), or
  - `items` (structured input).
- Do not send both `message` and `items` in one spawn call.
- `spawn_agent` falls back to `default` when `agent_type` is omitted; always set `agent_type` explicitly.
- Prefix spawned prompts with `[agent_type:<role>]` on line one so role intent is auditable from collab JSONL/manifests.
- Use `items` when you need explicit structured context (for example `mention` paths like `app://...` or selected `skill` entries) instead of flattening everything into one long string.
- Spawn returns an `agent_id` (thread id). Collab event rendering/picker labels are id-based today; do not depend on custom visible agent names.
- To keep operator readability high despite id labels, encode the role clearly in your stream labels and first-line task brief (for example `review`, `tests`, `research`).

## Collab lifecycle hygiene (required)

When you use collab tools (`spawn_agent` / `wait` / `close_agent`):
- Keep a local list of every returned `agent_id`.
- For every successful `spawn_agent`, run `wait` and then `close_agent` for that same id.
- Always close agents on error/timeout paths; do a final cleanup pass before finishing so no id is left unclosed.
- If spawn fails with `agent thread limit reached`, stop spawning immediately, close any known ids, then retry once. If you still cannot spawn, proceed without collab (solo or via delegation) and explicitly note the degraded mode.

## Required subagent contract

Require each subagent response to include:
- `Outcome`: done / blocked / partial.
- `Changes`: files touched or "none".
- `Validation`: commands run and pass/fail results.
- `Findings`: prioritized defects/risks (or "none found").
- `Evidence`: artifact paths, manifests, or command outputs summary.
- `Open questions`: only unresolved items that block correctness.

Reject and rerun when responses are:
- Missing validation evidence for code changes.
- Missing ownership/scope boundaries.
- Excessively verbose with no actionable summary.

## Execution constraints for subagents

- Subagents are spawned with approval policy effectively set to `never`.
- Design subagent tasks so they can complete without approval/escalation prompts.
- Keep privileged/high-risk operations in the parent thread when interactive approval is required.
- Subagents inherit core execution context (for example cwd/sandbox constraints), so include environment assumptions explicitly in each brief.

## Review loop (standalone-review pairing)

Use a two-layer review loop:

1) Subagent self-review (when possible)
- If `codex review` is available in the working repo, have the subagent run the repo's standalone-review flow (including hardened fallback rules) for:
  - `--uncommitted`, or
  - `--base <branch>` when branch comparison is clearer.
- Capture top findings and fixes in the subagent summary.
- If self-review cannot run (tool/policy/trust constraints), require a manual checklist summary: correctness, regressions, missing tests.

2) Parent independent review (required)
- After integrating subagent work, run a standalone review from the parent.
- Prefer the global `standalone-review` skill workflow for consistent checks.

Do not treat wrapper handoff-only output as a completed review.

## Orchestrator + RLM path (optional, recommended for deep loops)

- Prefer orchestrator RLM/delegation loops for long-horizon, recursive, or high-risk tasks when available.
- Keep this additive: still perform final parent synthesis and standalone review.
- If orchestrator is unavailable, continue with local subagent orchestration and standalone review.

## Compatibility guardrail (JSONL/collab drift)

- Symptoms: missing collab/delegate tool-call evidence, framing/parsing errors, or unstable collab behavior after CLI upgrades.
- Check versions first: `codex --version` and `codex-orchestrator --version`.
- Confirm feature readiness: `codex-orchestrator doctor` (checks collab/cloud/delegation readiness and prints enablement commands).
- CO repo refresh path (safe default): `scripts/codex-cli-refresh.sh --repo <codex-repo> --align-only`.
- Rebuild managed CLI only (optional): `codex-orchestrator codex setup --source <codex-repo> --yes --force`.
- Managed routing is explicit opt-in: `export CODEX_CLI_USE_MANAGED=1` (stock/global `codex` remains default otherwise).
- If local codex is materially behind upstream, sync before diagnosing collab behavior differences.
- Built-in `explorer` may map to an older model profile; set `[agents.explorer]` without `config_file` so it inherits top-level `gpt-5.3-codex`, and reserve spark for optional `[agents.explorer_fast]` (text-only caveat).
- If compatibility remains unstable, continue with non-collab execution path and document the degraded mode.

## High-output guardrail (Playwright/browser tools)

- Route Playwright-heavy work to a dedicated subagent stream so the parent thread does not absorb large browser logs/snapshots.
- Keep raw Playwright output in artifacts and return only concise summary + evidence paths to the parent.
- For these streams, explicitly close lifecycle loops (`spawn_agent` -> `wait` -> `close_agent`) before synthesis.

## Depth-limit guardrail

- Collab spawn depth is bounded. At max depth, `spawn_agent` will fail and the branch must execute directly.
- Near max depth, collab may be disabled for newly spawned children; plan for leaf execution.
- When depth errors appear, stop recursive delegation and switch to parent-driven execution.

## Anti-patterns

- Do not delegate one giant stream with vague ownership.
- Do not spawn subagents before acceptance criteria are defined.
- Do not merge subagent output without independent validation.
- Do not copy raw multi-hundred-line logs into parent context.
- Do not keep long single-agent execution in parent when a focused subagent can own it.
- Do not skip delegation solely because there is only one implementation stream; single-stream delegation is valid for context offload.
- Do not rely on human-readable agent names in TUI labels for control flow; use stream ownership and evidence paths as source of truth.
- Do not omit `agent_type` on `spawn_agent`; omission silently routes to `default`.
- Do not end the parent work with unclosed collab agent ids.
- Do not treat every delegated edit as "unexpected"; first verify whether the edit belongs to an active stream owner.

## Completion checklist

- At least one subagent was used for non-trivial work (or explicit reason documented for skipping).
- Streams defined with clear ownership and acceptance criteria.
- Subagent briefs include complete context and constraints.
- All subagents completed or explicitly closed as blocked.
- Parent synthesis includes concise decisions and evidence paths.
- Parent-level review completed (standalone review or equivalent).
- Collab lifecycle closed (`spawn_agent` -> `wait` -> `close_agent` per id) or degraded mode explicitly recorded.
