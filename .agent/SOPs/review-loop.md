# Review Loop SOP

Use this playbook whenever handing off a review (`npm run review` or an implementation gate) so feedback is captured and resolved until clean.

## Steps
1. Draft `NOTES` with goal, summary, risks, and optional reviewer questions (one line each when possible). `NOTES` is required for review runs.
2. Run the appropriate gate:
   - Default: `implementation-gate` for general reviews.
   - Enable DevTools by setting `CODEX_REVIEW_DEVTOOLS=1` only when Chrome DevTools capabilities are required.
3. Record the manifest path in the relevant checklists (`tasks/`, `docs/`, `.agent/task/`).
4. Monitor checks and reviewer feedback for 10–20 minutes after checks go green. Review both issue comments and inline review threads (review comments do not appear in `gh pr view --comments`).
5. If the reviewer finds issues, fix them, update `NOTES` with follow-up questions (when needed), and rerun the same gate.
6. Repeat until the reviewer reports no findings.

## Notes
- Keep reviewer questions concise and specific to unblock decisions.
- Avoid switching gates mid-loop unless the reviewer explicitly requests a different toolset.
- Inline review comments live in review threads; use the API to list them when monitoring:
  - `gh api repos/<owner>/<repo>/pulls/<number>/comments`
  - Or GraphQL (reviewThreads) if you need thread context.

## Template
`NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..."`
