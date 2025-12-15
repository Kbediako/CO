# Generate Tasks (checklists + mirrors)

After a PRD is written (and ideally approved), turn it into an executable checklist that the orchestrator can produce evidence for.

## 1) Create the canonical checklist under `tasks/`
Create `tasks/tasks-<id>-<slug>.md`. For recent examples, see:
- `tasks/tasks-0904-readme-codebase-alignment.md`
- `tasks/tasks-0905-agentic-coding-readiness.md`

Checklist requirements in this repo:
- Every item starts as `[ ]` and flips to `[x]` only when complete.
- Evidence is a concrete manifest path: `.runs/<task-id>/cli/<run-id>/manifest.json`.
- Include a “Foundation” section (manifest + metrics/state + mirror updates) and a “Guardrails” section (build/lint/test/spec-guard).

## 2) Create the agent-facing mirror under `.agent/task/`
Create `.agent/task/<id>-<slug>.md` as a lightweight mirror of the canonical checklist (same checkboxes, same evidence paths).
Example mirror format:
- `.agent/task/0904-readme-codebase-alignment.md`
- `.agent/task/0905-agentic-coding-readiness.md`

## 3) Add the snapshot mirror in `docs/TASKS.md`
Add a `# Task List Snapshot — <title> (<id>)` section with the same checklist items so reviewers can scan progress without leaving `docs/`.

## 4) Update `tasks/index.json`
Ensure the `0905`-style entry exists:
- `path` points at `tasks/tasks-<id>-<slug>.md`
- `status`/`gate.status` are `in-progress` until your first diagnostics manifest is captured
- once you have a manifest, populate `gate.log` and `gate.run_id` with the run evidence

## 5) (Optional) Add a mini-spec when required
If any trigger in `.agent/SOPs/specs-and-research.md` applies (cross-module work, migrations, security, external API changes), add a mini-spec under `tasks/specs/` and link it from the PRD + checklist before implementation.
