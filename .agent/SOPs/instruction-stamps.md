# Instruction Stamp SOP

## Purpose
Keep `codex:instruction-stamp` headers in AGENTS files aligned with their content so instruction loading stays consistent and warnings do not appear in manifests.

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
