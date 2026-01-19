<!-- codex:instruction-stamp 7130bddb0376a4ca793e03628cd8f5d8a5f4a30b63662cda1e71aad2dea67a22 -->
# Agent Instructions (Template)

## Orchestrator-first workflow
- Use `codex-orchestrator` pipelines for planning, implementation, validation, and review.
- Default to `docs-review` before implementation and `implementation-gate` after code changes.
- Before implementation, run a standalone review of the task/spec against the user’s intent and record the approval in the spec + checklist notes.
- Delegation is mandatory for top-level tasks: spawn at least one subagent run using `MCP_RUNNER_TASK_ID=<task-id>-<stream>`, capture manifest evidence, and summarize in the main run. Use `DELEGATION_GUARD_OVERRIDE_REASON` only when delegation is impossible and record the justification.
- Prefer delegation for research, review, and planning work once a task id exists.
- Use `codex exec` only for pre-task triage (no task id yet) or when delegation is unavailable.
- Keep delegation MCP enabled by default (only MCP on by default). Enable other MCPs only when relevant to the task.

## Docs-first (spec-driven)
- Create or refresh PRD + TECH_SPEC + ACTION_PLAN + the task checklist before edits.
- Link TECH_SPECs in `tasks/index.json` and update `last_review` dates.
- Translate the user request into the PRD and update it as you learn new constraints or scope changes.

## Standalone reviews (ad-hoc)
- Use `codex review` for quick checks during implementation.
- Capture standalone review approval in the spec/task notes before implementation begins.
- When you need manifest-backed review evidence, run `npm run review` with the manifest path.

## Delegation (recommended)
- For non-trivial work, spawn at least one subagent run using `MCP_RUNNER_TASK_ID=<task-id>-<stream>`.
- If delegation is not possible, record the reason in the task checklist.

## Instruction stamp
- If you edit this file, refresh the instruction stamp.
- One-liner:
  `node -e "const fs=require('fs');const crypto=require('crypto');const p='AGENTS.md';const raw=fs.readFileSync(p,'utf8');const body=raw.replace(/^<!--\\s*codex:instruction-stamp\\s+[a-f0-9]{64}\\s*-->\\r?\\n?/i,'');const hash=crypto.createHash('sha256').update(body,'utf8').digest('hex');fs.writeFileSync(p,'<!-- codex:instruction-stamp '+hash+' -->\\n'+body);"`
