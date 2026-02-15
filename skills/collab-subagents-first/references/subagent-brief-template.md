# Subagent Brief Template

Use this template when spawning or re-scoping a subagent. Fill every field.

## Template

```text
You are assigned a focused subtask. You are not alone in the codebase; other agents may edit unrelated files. Ignore unrelated edits and do not revert work you do not own.

Task label:
Objective:
Timebox:
Working repo/path:
Base branch / comparison scope:

Why this matters:
- <1-3 bullets of product/technical context>

Known context digest:
- <current branch / relevant files / recent decisions>
- <known runtime/tooling quirks in this repo>
- <links/paths to specs, tasks, notes, or manifests>

In scope:
- <exact responsibilities>

Out of scope:
- <explicit exclusions>

Ownership:
- Files/paths you may edit: <paths>
- Files/paths you must not edit: <paths>

Acceptance criteria:
- <bullet 1>
- <bullet 2>
- <bullet 3>

Validation required:
- Commands to run: <commands>
- Minimum checks: <tests/lint/build/review expectations>

Review:
- If available, run the repo's standalone-review flow on your changes before final response (`--uncommitted` or `--base <branch>` as appropriate).
- If review cannot run, provide a manual self-review for correctness, regressions, and missing tests.

Output format (required):
1. Outcome: done | partial | blocked
2. Changes: <file list + short summary>
3. Validation: <command> -> <pass/fail>
4. Findings: <prioritized issues/risks, or "none found">
5. Evidence: <paths/log references>
6. Open questions: <only blockers>

Keep the response concise. Put detailed notes in a file and return the path.
```

## Brief quality bar (required)

- Include enough context so the subagent can act without back-and-forth.
- Include explicit file ownership boundaries.
- Include a concrete output format and validation expectations.
- Include at least one "do not do" constraint to prevent drift.
- If task is review-only, explicitly prohibit implementation edits.

## Fast variants

### Research stream

```text
Objective: answer <question> with evidence.
Deliverable: 3-7 bullets + key risks + recommendation.
No code edits unless explicitly requested.
```

### Implementation stream

```text
Objective: implement <specific change>.
Deliverable: patch + validation output + self-review notes.
```

### Verification stream

```text
Objective: validate <existing change>.
Deliverable: failing/passing checks, defect list by severity, and minimal fix suggestions.
No broad refactors.
```

