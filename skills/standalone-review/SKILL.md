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
- You are about to report completion, propose merge, or answer "what's next?" with recommendations.
- You addressed external feedback (PR reviews, bot comments, or CI-fix patches).
- 45 minutes of active implementation elapsed without a standalone review.

If review execution is blocked, record why in task notes, then do manual diff review plus targeted tests before proceeding.

## Quick start

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
- Prefer targeted focus prompts for WIP reviews.

3) Capture actionable output
- Prioritize correctness, regressions, and missing tests.
- Separate confirmed issues from hypotheses to verify.
- Log key findings in the PRD/TECH_SPEC or task notes so intent survives context compaction.
- For pre-implementation approvals, note “Approved” (or issues to resolve) in the PRD/TECH_SPEC or task notes.

4) Escalate to manifest-backed review when needed
- If you need manifest evidence, use the review wrapper:
  `TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." MANIFEST=<path> npm run review -- --manifest <path>`
- In non-interactive environments, add `FORCE_CODEX_REVIEW=1` as needed.
- In non-interactive environments, prefer the wrapper over raw `codex review`; it enforces `CODEX_REVIEW_TIMEOUT_SECONDS` and `CODEX_REVIEW_STALL_TIMEOUT_SECONDS` guardrails.

## Expected outputs
- A prioritized list of findings.
- Pre-implementation approval recorded (or issues flagged) when used for task/spec review.
- No working tree edits.

## Related docs
- `docs/standalone-review-guide.md`
