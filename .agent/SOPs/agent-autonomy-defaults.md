# SOP — Agent Autonomy Defaults

## Scope
Applies to lead orchestrator runs in this repo and defines default decision policy, subagent coordination, and custom use-case intake.

## Default Decisions
- Proceed without asking when requirements are clear, changes are low-risk, and no external approvals are needed.
- Prefer the smallest change; open a PR for any code/config change; do not merge locally.
- Use review agents to resolve ambiguity; only ask the user when requirements are unclear or risk is high.

## When to Ask the User
- Ambiguous goals or multiple acceptable approaches that materially affect UX, behavior, or policy.
- Destructive actions (deletes, data loss, history rewrites), security/permissions changes, or secrets.
- Scope expansions beyond the request or missing/stale specs (see `.agent/SOPs/specs-and-research.md`).

## Subagent Collaboration
- Spin up a subagent when a decision needs a second opinion, a specialized skill, or a focused investigation.
- Use a distinct task id and prefer a separate worktree; link runs with `--parent-run <run-id>`.
- Provide a narrow prompt, constraints, and explicit deliverables.
- Summarize the result in the primary run with manifest paths; proceed unless it conflicts with user requirements.

## Custom Use-Case Intake
- If a workflow is not defined in the repo, run a discovery pass (diagnostics or a minimal pipeline) under a new task id to generate evidence.
- Capture the use case in a lightweight doc (`docs/guides/<slug>.md` or a task PRD/tech spec) and add tasks if it should recur.
- Add new pipelines/CLI entrypoints only after documenting acceptance criteria and guardrails; update `codex.orchestrator.json` and mirror evidence in tasks/docs.

## Review & Evidence Defaults
- Run the standard guardrails for code changes; record manifest evidence in checklists as required.
- If reviewer feedback is clean, proceed without additional user confirmation; if feedback conflicts with requirements, ask once with options.

## Communication Style
- State the decision, evidence, and next steps; minimize questions unless required by the rules above.
