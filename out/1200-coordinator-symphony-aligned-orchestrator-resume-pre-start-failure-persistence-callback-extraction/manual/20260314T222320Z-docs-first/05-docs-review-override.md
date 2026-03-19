# 1200 Docs-Review Override

- Command: `npx codex-orchestrator start docs-review --format json --task 1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction`
- Recorded run: `2026-03-14T22-29-06-586Z-10f974b8`
- Result: the manifest-backed `docs-review` wrapper failed at `Run delegation guard` before producing a diff-local docs verdict.
- Guard logs for the docs-first registration remain green (`spec-guard`, `docs:check`, `docs:freshness`), so this is recorded as a docs-review wrapper stop rather than a `1200` docs defect.
