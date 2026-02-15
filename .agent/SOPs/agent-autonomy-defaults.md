# SOP — Agent Autonomy Defaults

## Scope
Applies to lead orchestrator runs in this repo and defines default decision policy, subagent coordination, and custom use-case intake.

## Default Decisions
- Proceed without asking when requirements are clear, changes are low-risk, and no external approvals are needed.
- Prefer the smallest change; open a PR for any code/config change; merge via GitHub after the monitoring window when checks are green and feedback is quiet.
- Use review agents or subagents to resolve ambiguity; infer requirements from user intent and propose options. Ask the user only when truly blocked or the risk is high.

## Orchestrator-First Workflow
- Use `codex-orchestrator` pipelines for planning, implementation, validation, and review work that touches the repo.
- Default to `docs-review` before implementation and `implementation-gate` after code changes (set `CODEX_REVIEW_DEVTOOLS=1` when DevTools are required).
- Use direct shell commands only for lightweight discovery or targeted one-off checks that do not need manifest evidence.
- Record exceptions in the task checklist and include rationale in review NOTES if guardrail evidence is skipped.

## When to Ask the User
- Ambiguous goals or multiple acceptable approaches that materially affect UX, behavior, or policy (if subagent inference cannot narrow it).
- Destructive actions (deletes, data loss, history rewrites), security/permissions changes, or secrets.
- Scope expansions beyond the request or missing/stale specs (see `.agent/SOPs/specs-and-research.md`).

## Subagent Collaboration
- Delegation is mandatory for top-level tasks: spawn at least one subagent for scoped investigation, cross-cutting analysis, or specialized skills to conserve context.
- Use a distinct task id and prefer a separate worktree; link runs with `--parent-run <run-id>`.
- Provide a narrow prompt, constraints, and explicit deliverables.
- Summarize the result in the primary run with manifest paths; proceed unless it conflicts with user requirements.
- If delegation is impossible, set `DELEGATION_GUARD_OVERRIDE_REASON` and record the justification in the task checklist.

## Subagent Request Template
- Use `.agent/task/templates/subagent-request-template.md` to standardize prompts, deliverables, and evidence.
- Require subagents to return manifest paths, findings, and explicit go/no-go guidance.

## Custom Use-Case Intake
- If a workflow is not defined in the repo, run a discovery pass (diagnostics or a minimal pipeline) under a new task id to generate evidence.
- Capture the use case in PRD + TECH_SPEC + ACTION_PLAN + the task checklist when it touches the repo; use `docs/guides/<slug>.md` only for supplemental, non-task guidance and link back to the PRD.
- Add new pipelines/CLI entrypoints only after documenting acceptance criteria and guardrails; update `codex.orchestrator.json` and mirror evidence in tasks/docs.

## Custom Use-Case Intake Checklist
- Define the goal, user impact, and constraints (security, privacy, approvals).
- Capture a minimal run manifest as evidence and list required assets.
- Write acceptance criteria and guardrails before adding pipelines or commands.
- Decide any supplemental `docs/guides/` doc only after PRD/TECH_SPEC/ACTION_PLAN + tasks exist.
- Add tests or smoke checks if the use case will recur.

## Review & Evidence Defaults
- Run the standard guardrails for code changes; record manifest evidence in checklists as required.
- If reviewer feedback is clean, proceed without additional user confirmation; if feedback conflicts with requirements, ask once with options.

## PR Monitoring & Auto-Merge
- Monitor PRs you open until checks complete and reviewers finish.
- Prefer shipped `codex-orchestrator pr watch-merge --pr <number> --quiet-minutes <window>` so polling, quiet-window resets, and merge gating stay consistent.
- Fallback (repo script): `npm run pr:watch-merge -- --pr <number> --quiet-minutes <window>`.
- Start a 10–20 minute quiet window once all required checks turn green; reset the window if checks restart or new feedback arrives.
- If checks remain green and no new feedback arrives during the window, merge via GitHub and delete the branch.
- Do not auto-merge if the PR is draft, has a "do not merge" label, or has unresolved review feedback.
- Merge via GitHub, delete the branch, and summarize the outcome in the main run.

## Communication Style
- State the decision, evidence, and next steps; minimize questions unless required by the rules above.
