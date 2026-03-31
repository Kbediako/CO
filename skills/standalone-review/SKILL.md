---
name: standalone-review
description: Use for required periodic cross-check reviews during implementation and before handoff using `codex review`.
---

# Standalone Review

## Overview

Use this skill when you need a fast, ad-hoc review without running a pipeline or collecting a manifest. It is ideal during implementation or for quick pre-flight checks.
Before implementation, use it to review the task/spec against the user’s intent and record the approval in the PRD/TECH_SPEC or task notes.

## Auto-trigger policy (required)

Run this skill automatically whenever any condition is true:
- You made code/config/script/test edits since the last standalone review.
- You finished a meaningful chunk of work (default: behavior change or about 2+ files touched).
- You finished a coding burst for a sub-goal and are about to validate, summarize, or switch streams.
- You are about to report completion, propose merge, or answer "what's next?" with recommendations.
- You addressed external feedback (PR reviews, bot comments, or CI-fix patches).
- A non-trivial open diff (about 2+ files or 40+ changed lines) has not had an elegance pass in the current cycle.

If review execution is blocked, record why in task notes, then do manual diff review plus targeted tests before proceeding.

## Quick start

Compatibility guard (current Codex CLI behavior):
- Do not combine `--uncommitted`, `--base`, or `--commit` with a custom prompt argument.
- Use diff-scoped review without prompt, or prompt-only review without scope flags.
- Wrapper note: `codex-orchestrator review` / `npm run review` still saves the full review prompt artifact for scoped runs, but explicit wrapper scope flags launch `codex review` without any prompt argument because current Codex CLI still treats stdin (`-`) as `[PROMPT]`; reviewer-visible scoped context rides on bounded `--title` transport instead.
- Scoped surface limit: explicit wrapper scope flags support only the default `diff` surface at the actual Codex layer; `--surface audit|architecture` requires an unscoped prompt-capable review.

Uncommitted diff:
```
codex review --uncommitted
```

Compare to a base branch:
```
codex review --base <branch>
```

Specific commit:
```
codex review --commit <sha>
```

Custom focus (no diff flags):
```
codex review "Focus on correctness, regressions, edge cases; list missing tests."
```

## Workflow

1) Define the review goal and scope
- State what changed and what success looks like.
- Keep prompts short, specific, and test-oriented.

2) Run the review often
- Follow the auto-trigger policy above (not optional).
- Run after each meaningful chunk of work.
- Prefer targeted focus prompts for WIP reviews (prompt-only invocation).
- For non-trivial diffs, pair this with `elegance-review` in the same cycle before handoff/merge.

3) Capture actionable output
- Prioritize correctness, regressions, and missing tests.
- Separate confirmed issues from hypotheses to verify.
- Log key findings in the PRD/TECH_SPEC or task notes so intent survives context compaction.
- For pre-implementation approvals, note “Approved” (or issues to resolve) in the PRD/TECH_SPEC or task notes.

4) Escalate to manifest-backed review when needed
- If you need manifest evidence, use the review wrapper command:
  `TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." codex-orchestrator review --manifest <path>`
- Repo alias (same behavior in this repo): `npm run review -- --manifest <path>`
- In non-interactive environments, direct/manual wrapper runs stay handoff-only unless you add `FORCE_CODEX_REVIEW=1`.
- `docs-review` and `implementation-gate` already set `FORCE_CODEX_REVIEW=1`; `docs-relevance-advisory` intentionally keeps it cleared; the `provider-linear-worker` pipeline exports `CODEX_REVIEW_NON_INTERACTIVE=1` and `FORCE_CODEX_REVIEW=1`, so its closeout review executes before `Human Review` / `In Review`.
- In non-interactive environments, prefer the wrapper over raw `codex review`; it preserves evidence paths, delegation toggles, and optional runtime guardrails (`CODEX_REVIEW_TIMEOUT_SECONDS`, `CODEX_REVIEW_STALL_TIMEOUT_SECONDS`).
- For explicit wrapper scope flags (`--uncommitted`, `--base`, `--commit`), the saved prompt artifact remains available under `review/prompt.txt`, but the actual Codex launch still omits any prompt argument because current Codex CLI treats stdin (`-`) as `[PROMPT]`; reviewer-visible scoped context therefore rides on bounded `--title` transport.
- For those explicit scoped runs, `--surface audit` and `--surface architecture` must fail fast and be rerun without explicit scope flags, because the requested full prompt context cannot reach Codex.

## Expected outputs
- A prioritized list of findings.
- Pre-implementation approval recorded (or issues flagged) when used for task/spec review.
- No working tree edits.

## Related docs
- `docs/standalone-review-guide.md`

## Related skills
- `docs-first`: run pre-implementation task/spec approval before coding.
- `elegance-review`: run immediately after non-trivial standalone findings are addressed.
- `long-poll-wait`: use when a deep review run is intentionally long-running and needs patience-first monitoring.
