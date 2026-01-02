# Review Loop SOP

Use this playbook whenever handing off a review (`npm run review` or an implementation gate) so feedback is captured and resolved until clean.

## Steps
1. Draft `NOTES` with goal, summary, risks, and optional reviewer questions (one line each when possible). `NOTES` is required for review runs.
2. Run the appropriate gate:
   - Default: `implementation-gate` for general reviews.
   - Enable DevTools by setting `CODEX_REVIEW_DEVTOOLS=1` only when Chrome DevTools capabilities are required.
3. Record the manifest path in the relevant checklists (`tasks/`, `docs/`, `.agent/task/`).
4. Monitor checks and reviewer feedback for at least 10 minutes after checks go green. Scale the watch window based on PR complexity because the Codex connector can lag:
   - Small: ≤50 LOC net, ≤3 files, no pipeline/guardrail changes → 10 min.
   - Medium: 51–200 LOC or 4–10 files, touches scripts/docs/pipelines → 15–20 min.
   - Large: >200 LOC, >10 files, touches CI/guardrails/release paths or adds deps → 25–30 min.
5. For Codex connector review comments, respond in-thread (not a top-level PR comment), react with 👍 once addressed, and resolve the review thread.
6. If the reviewer finds issues, fix them, update `NOTES` with follow-up questions (when needed), and rerun the same gate.
7. Repeat until the reviewer reports no findings.

## Notes
- Keep reviewer questions concise and specific to unblock decisions.
- Avoid switching gates mid-loop unless the reviewer explicitly requests a different toolset.
- Inline review comments live in review threads; use the API to list them when monitoring:
  - `gh api repos/<owner>/<repo>/pulls/<number>/comments`
  - Or GraphQL (reviewThreads) if you need thread context.
- Reply to an inline comment with `gh api -X POST repos/<owner>/<repo>/pulls/<number>/comments/<comment_id>/replies -f body='...'`.
- Resolve threads via GraphQL: `resolveReviewThread` with the thread id from `reviewThreads`.

## Template
`NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..."`
