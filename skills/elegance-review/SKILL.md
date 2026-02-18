---
name: elegance-review
description: Run an explicit post-implementation elegance/minimality pass to keep the smallest correct solution and remove avoidable complexity before handoff.
---

# Elegance Review

## Overview

Use this skill after non-trivial edits to verify the implementation is minimal, coherent, and easy to maintain. This is a simplification pass, not a feature-expansion pass.

## Auto-trigger policy (required)

Run this skill whenever any condition is true:
- You changed behavior across about 2+ files.
- You added a new helper/module/pathway and could possibly collapse it.
- You finished writing code for a non-trivial sub-goal and are about to lock the checkpoint.
- You finished addressing review feedback and are preparing to hand off.
- You are about to recommend merge/release.
- The user explicitly asks for elegance/minimality/overengineering checks.
- A standalone review just completed for a non-trivial diff.

## Quick start

Compatibility guard (current Codex CLI behavior):
- Do not combine `--uncommitted`, `--base`, or `--commit` with a custom prompt argument.
- Use diff-scoped review without prompt, or prompt-only review without scope flags.

Uncommitted diff:
```bash
codex review --uncommitted
```

Diff-vs-base review:
```bash
codex review --base <branch>
```

Prompt-only pass (no diff flags):
```bash
codex review "Find avoidable complexity, duplicate abstractions, and unnecessary indirection. Prioritize simplifications that preserve behavior."
```

## Workflow

1) Lock invariants first
- State what behavior cannot change.
- Keep tests/acceptance criteria as the guardrail.

2) Identify complexity hotspots
- Unused abstractions, wrappers, or config layers.
- Duplicate logic that can be consolidated safely.
- Over-generalized interfaces used in one place only.
- Extra branching/state that can be simplified.

3) Simplify in smallest safe steps
- Prefer deleting code over adding knobs.
- Collapse one-off abstractions into local logic when clearer.
- Keep naming and control flow direct.

4) Re-validate
- Run targeted tests/lint for touched areas.
- Confirm no behavior regressions.

5) Record result
- Report what was simplified.
- Report residual complexity that is intentionally kept and why.

## Guardrails

- Do not broaden scope into unrelated refactors.
- Do not trade readability for cleverness.
- If `codex review` is unavailable, run a manual checklist using the same criteria and note that fallback.
