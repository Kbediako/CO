# Agent Task: CO-331 queue cap and follow-up admission truth

## Scope

- Task id: `linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Registry id: `20260423-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Linear issue: `CO-331`
- Issue id: `9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`

## Intent

Protect the control-host queue contract so helper-created follow-ups do not leave `Backlog` without deliberate sequencing, and resumable or queued retry work cannot let active issue identifiers exceed `max_allowed`.

## Protected Terms

- `Backlog`
- `Ready`
- `provider-intake-state.json`
- `co-status`
- `max_allowed`
- active issue identifiers
- resumable claims
- follow-up issue admission

## Checklist

- [x] Docs-first packet created.
- [x] Issue-quality review recorded in spec/task notes before implementation began.
- [x] Manual standalone task/spec review approval captured in spec/task notes before implementation.
- [x] Manifest-backed standalone review captured before review handoff.
- [x] Backlog follow-up hold implemented.
- [x] Retry/resumable admission capacity implemented.
- [x] Provider intake summary projection aligned.
- [x] Focused regressions added.
- [x] Full validation and review gates completed.

## Guardrails

- Do not weaken admission caps.
- Do not use manual state moves or host restarts as the primary fix.
- Do not conflate this lane with `CO-317`, `CO-329`, or `CO-330`.

## Review Notes

- 2026-04-23: Issue-quality review confirmed the lane covers both required drift modes: helper-created follow-ups leaving `Backlog` and retry/resumable claims exceeding `max_allowed`.
- 2026-04-23: Before implementation, the parent worker performed a standalone task/spec review of the docs packet against the Linear issue intent and approved the scope for implementation; this review is captured here and mirrored in the task spec notes.
- 2026-04-23: Manifest-backed standalone review completed with `review_outcome: bounded-success` after command-intent retry; explicit elegance/minimality pass found no avoidable complexity after the final main merge.
