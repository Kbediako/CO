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
5. Check inline review comments/threads (not just review summaries). Use `gh pr view <number> --comments` or `gh api repos/<owner>/<repo>/pulls/<number>/comments` and ensure no unresolved items remain.
6. For GitHub agent review comments (CodeRabbit, Copilot, Codex connector), respond in-thread, react with 👍 once addressed, and resolve the review thread.
7. If the reviewer finds issues, fix them, update `NOTES` with follow-up questions (when needed), and rerun the same gate.
8. Repeat until the reviewer reports no findings.

## GitHub agent review replies
- Always reply directly in the original review discussion thread (line comment), not just top-level PR comments.
- Tag the agent explicitly (e.g., `@coderabbitai`) and mention what changed plus the commit SHA.
- CLI/API example for replying to a review comment:
```
gh api -X POST repos/<org>/<repo>/pulls/<pr>/comments \
  -f body='@coderabbitai Fixed … (commit abc123). Please re-review/resolve.' \
  -F in_reply_to=<comment_id>
```
- If thread reply via API fails due to permissions, fall back to a line comment on the same diff hunk, still tagging the agent.
- After replying, check `gh pr view <pr> --json reviewDecision` and wait for it to flip to `APPROVED` before merging.

## Notes
- Keep reviewer questions concise and specific to unblock decisions.
- Avoid switching gates mid-loop unless the reviewer explicitly requests a different toolset.
- Inline review comments live in review threads; use the API to list them when monitoring:
  - `gh api repos/<owner>/<repo>/pulls/<number>/comments`
  - Or GraphQL (reviewThreads) if you need thread context.
- Resolve threads via GraphQL: `resolveReviewThread` with the thread id from `reviewThreads`.

## Template
`NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..."`
