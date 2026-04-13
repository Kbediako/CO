# Generate Tasks (checklists + mirrors)

After the PRD / TECH_SPEC / ACTION_PLAN exist, turn them into the executable checklist and mirror set.

## 1) Create the canonical checklist under `tasks/`
Use the current template:
```bash
cp .agent/task/templates/tasks-template.md tasks/tasks-<task-id>.md
```

Checklist requirements in this repo:
- every item starts as `[ ]` and flips to `[x]` only with concrete evidence
- evidence should point at a manifest path, review artifact, or other truthful, checkable proof suitable for the action; for non-manifest steps, command output, source-file paths, or `out/...` summaries are acceptable
- validation should match the lane’s real guardrails (`spec-guard`, build/lint/test, docs gates, review, and any required extras)

## 2) Mirror the checklist under `.agent/task/`
Keep `.agent/task/<task-id>.md` synchronized with the canonical checklist:
```bash
cp tasks/tasks-<task-id>.md .agent/task/<task-id>.md
```

## 3) Refresh the registry and snapshot mirrors
- Keep `docs/TECH_SPEC-<task-id>.md` synchronized with `tasks/specs/<task-id>.md`.
- Update `tasks/index.json` under `items[]`, including `paths.spec`, `paths.docs`, and the current gate status.
- Refresh the single-line snapshot entry in `docs/TASKS.md`.
- Register or refresh the packet docs in `docs/docs-freshness-registry.json`.

If `npm run docs:check` reports `tasks-file-too-large`, use the supported trim:
```bash
npm run docs:archive-tasks
```

If the helper displaces a still-needed snapshot, restore that snapshot into the tracked yearly archive file such as `docs/TASKS-archive-2026.md`.

## 4) Keep spec policy current
If the work crosses the repo spec threshold, refresh `tasks/specs/<task-id>.md`, `docs/TECH_SPEC-<task-id>.md`, and the linked `last_review` metadata before implementation continues.
