# PRD - Delegation Guard Actionable Diagnostics (Task 0951)

## Summary
- Problem Statement: Delegation guard failures are currently terse and force operators to hunt for missing evidence, slowing reruns and creating avoidable back-and-forth.
- Problem Statement (related): Long-running delegated runs can fail because `delegate.spawn` blocks until child exit while tool calls timeout sooner, preventing long-lived RLM delegations.
- Problem Statement (related): Automated implementation docs archive PR #165 is failing Core Lane (diff budget) and has archive stubs that point to missing doc-archives payloads.
- Problem Statement (related): Current “RLM” is an iterative tool loop, not a true symbolic RLM that externalizes context and recurses over it; it cannot natively operate over massive prompts without pointer-based access.
- Desired Outcome: Delegation guard emits concise, actionable diagnostics that explain what’s missing, where to look, and how to fix it (with copy/pasteable guidance).
- Desired Outcome (related): Delegation supports long-running child runs via async spawn semantics, and docs archive automation produces valid stubs + passes Core Lane.
- Desired Outcome (related): True RLM behavior is supported via externalized context objects + symbolic recursion so delegated runs can process large prompts without the model enumerating O(N) tool calls.
- Rationale (related): The RLM paper notes small-context tradeoffs, so an `auto` mode with size thresholds is preferred for non-delegated runs.

## Goals
- Provide deterministic, structured failure output for `scripts/delegation-guard.mjs`.
- Reduce time-to-fix when subagent evidence or task IDs are missing.
- Standardize the guard’s guidance so it can be reused in checklists and review comments.
- Enable long-running delegated runs by removing the hard dependency on child process exit in `delegate.spawn`.
- Resolve PR #165 issues by ensuring doc-archives payloads are present and diff budget checks are satisfied.
- Enable true RLM behavior by externalizing context and enabling symbolic recursion/subcall scheduling in code (not by model-written tool calls).

## Acceptance Criteria
- Missing `MCP_RUNNER_TASK_ID` clearly reported with an export example.
- Unregistered task IDs (not in `tasks/index.json`) are called out explicitly.
- Unreadable `tasks/index.json` and unreadable runs directory produce actionable errors.
- No subagent manifests found → expected paths + fix guidance are shown.
- Detected candidate manifests (if any) are listed with short rejection reasons (cap 3).
- `DELEGATION_GUARD_OVERRIDE_REASON` is surfaced in diagnostics when set.
- `delegate.spawn` supports `start_only: boolean` (default `false`). When `start_only=true`, it requires `task_id` and returns `run_id` + `manifest_path` within tool-call limits (target < 10s) **after the child manifest exists** (no stdout parsing), even while the child continues running. When `start_only=false`, legacy wait-for-exit behavior is preserved.
- Delegation token is persisted early enough for question queue usage during long-running child execution.
- Implementation docs archive stubs in PR #165 resolve to actual files on `doc-archives` (or the archived content is restored inline when automation cannot run).
- Core Lane diff budget for PR #165 passes via a justified override or a smaller/split diff.
- Context externalization: RLM writes a context object under `.runs/<task>/cli/<run>/rlm/context/` containing `source.txt` + `index.json` with `object_id`, `chunk_size_bytes`, `overlap_bytes`, and chunk records (`chunk_id`, `start_byte`, `end_byte`, `sha256`).
- Pointer-only contract: the planner/root prompt never includes the full context. The runner logs `planner_prompt_bytes` per iteration in `rlm/state.json` with an upper bound of ≤ 32 KB (configurable).
- Bounded reads: each iteration enforces budgets (defaults): `RLM_MAX_CHUNK_READS_PER_ITERATION` ≤ 8, `RLM_MAX_BYTES_PER_CHUNK_READ` ≤ 8 KB, `RLM_MAX_SUBCALLS_PER_ITERATION` ≤ 4; runner clamps and logs any overages.
- Runner-scheduled subcalls: chunk processing happens via runner-created subcalls over pointer IDs; the model does not emit O(N) chunk reads.
- Symbolic recursion cycle demo: a synthetic context ≥ 50 MB completes **at least one** cycle (planner → ≥1 subcall → runner returns artifact refs → next planner step or `intent=final`). Evidence recorded in `rlm/state.json` with subcall artifact references.
- Defaulting: `RLM_MODE=auto` by default; `auto` resolves to `symbolic` when delegation is detected (`CODEX_DELEGATION_PARENT_MANIFEST_PATH`), or when `RLM_CONTEXT_PATH` is set, or when context size ≥ `RLM_SYMBOLIC_MIN_BYTES`; otherwise `iterative`. Override env remains available for debugging.

## Non-Goals
- Changing delegation policy or bypass rules.
- Relaxing guardrail requirements for top-level tasks.
- Adding new pipelines or automation beyond guard diagnostics.
- Rewriting the implementation docs archive policy; only fixing automation/outputs to comply.
- Full security hardening of RLM (security posture will be iterated after capability is proven).

## Stakeholders
- Product: Codex Orchestrator Platform
- Engineering: Orchestrator Core + Autonomy
- Review: Maintainers, delegated run operators

## Metrics & Guardrails
- Primary Success Metrics:
  - Median time from first guard failure to next successful run ≤ 2 hours (baseline TBD), measured via manifest timestamps across the last N tasks.
  - ≤1 clarification per task about missing delegation evidence in review notes.
  - ≥90% of delegation-guard failures include explicit next-step guidance (sampled over the last N tasks).
- Secondary Success Metrics:
  - ≥95% of delegated RLM runs complete without `delegate.spawn` timeout when runtime exceeds 60s.
  - PRs produced by implementation-docs archive automation pass diff-budget without manual rework.
- Guardrails:
  - Guard pass/fail semantics remain unchanged.
  - Output stays non-interactive and CI-friendly.
  - No network calls introduced.

## User Experience
- Personas:
  - Agents running top-level tasks and docs-review pipelines.
  - Reviewers validating evidence before approval.
- User Journeys:
  - Run docs-review → guard fails → read diagnostics → run subagent with correct task ID prefix → rerun pipeline successfully.

## Technical Considerations
- Emit clear headings + bullet lists for: missing env vars, expected paths, discovered manifests, and corrective steps.
- Provide explicit `MCP_RUNNER_TASK_ID` examples and subagent naming hints.
- Optional SOP note in `.agent/SOPs/review-loop.md` summarizing the troubleshooting path.
- Update delegation usage docs to clarify server vs child mode and recommended RLM depth/time defaults.
- Implement async/start-only `delegate.spawn` behavior and document it alongside the workaround.
- Capture PR #165 remediation steps (doc-archives payload validation, diff-budget strategy) in implementation guidance.
- Add a “true RLM” implementation plan: externalized context objects + symbolic recursion (runner‑scheduled subcalls), with guidance on delegation vs standalone usage.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-delegation-rlm-quick-wins.md`
- Action Plan: `docs/ACTION_PLAN-delegation-rlm-quick-wins.md`
- Task checklist: `tasks/tasks-0951-delegation-rlm-quick-wins.md`
- Run Manifest Link: (docs-review run recorded in task checklist)

## Open Questions
- None.

## Approvals
- Product: Pending
- Engineering: Pending
- Review: Pending
