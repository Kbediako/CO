# Instruction Stamp SOP

## Purpose
Keep `codex:instruction-stamp` headers in AGENTS files aligned with their content, so instruction loading stays consistent and warnings do not appear in manifests.

## When to run
- Any time you edit `AGENTS.md`, `docs/AGENTS.md`, or `.agent/AGENTS.md`.

## Commands
Update stamps (default set):
```bash
node scripts/update-instruction-stamp.mjs
```

Update a specific file:
```bash
node scripts/update-instruction-stamp.mjs .agent/AGENTS.md
```

Check-only mode (no writes; exits non-zero on mismatch):
```bash
node scripts/update-instruction-stamp.mjs --check .agent/AGENTS.md
```

## Notes
- Commit stamp updates in the same PR as the content change.
- After updating stamps, run `docs-review` and `implementation-gate` (when code/scripts changed).

## Escalation
- If `--check` fails in CI, run the update locally and commit the corrected stamp.
- If mismatches persist across worktrees or branches, pause merges and coordinate with the reviewer to pick a single source of truth.

## Evidence
- When stamp updates are part of a task, reference the manifest path in the checklist (e.g., `.runs/<task-id>/cli/<run-id>/manifest.json`).

## Guardrails
- Do not update stamps during active merge conflicts; resolve conflicts first, then refresh.
- In parallel worktree scenarios, ensure only one worktree updates shared AGENTS.md files at a time.
