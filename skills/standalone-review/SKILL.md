---
name: standalone-review
description: Use for ad-hoc/standalone reviews outside pipelines (fast checks during implementation or before handoff) using `codex review`.
---

# Standalone Review

## Overview

Use this skill when you need a fast, ad-hoc review without running a pipeline or collecting a manifest. It is ideal during implementation or for quick pre-flight checks.
Before implementation, use it to review the task/spec against the user’s intent and record the approval in the PRD/TECH_SPEC or task notes.

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

## Expected outputs
- A prioritized list of findings.
- Pre-implementation approval recorded (or issues flagged) when used for task/spec review.
- No working tree edits.

## Related docs
- `docs/standalone-review-guide.md`
