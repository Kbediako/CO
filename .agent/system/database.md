# Database Practices

Codex Orchestrator does **not** require a traditional database for core operation. Persistence is file-based and scoped per task id so runs are auditable and easy to clean up.

## Primary “data stores” in this repo
- **Run artifacts:** `.runs/<task-id>/cli/<run-id>/manifest.json` plus run logs under `.runs/<task-id>/cli/<run-id>/`.
  - Layout and file meanings are documented in `.runs/README.md`.
- **Task-level metrics:** `.runs/<task-id>/metrics.json` (append-only JSONL stream) and `.runs/<task-id>/metrics-summary.json` (aggregates).
- **Human-readable state snapshots:** `out/<task-id>/state.json` and `out/<task-id>/runs.json`.
- **Docs/checklists:** `tasks/**`, `docs/**`, `.agent/task/**` (these are the human-facing “control plane” for work planning and evidence linking).

## Safety & hygiene
- `.runs/` and `out/` are git-ignored; keep them as local evidence and do not rely on them as versioned source of truth.
- Store only **references** to run artifacts in the repo (manifest paths in checklists, plus links to specs/docs).
- If a task produces heavy artifacts, keep them under `.runs/<task-id>/` (or `archives/<task-id>/...`) and document where they live in the relevant checklist entry.

## When a real database appears
Some downstream projects under `packages/<project>/` may introduce a database. If your change includes schema/migration work, follow `.agent/SOPs/db-migration.md` (expand/contract, verification, rollback) and ensure spec requirements are met per `.agent/SOPs/specs-and-research.md`.
