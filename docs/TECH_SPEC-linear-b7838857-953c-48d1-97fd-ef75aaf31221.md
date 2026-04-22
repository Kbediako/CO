---
id: 20260422-linear-b7838857-953c-48d1-97fd-ef75aaf31221
owners: [Codex]
last_review: 2026-04-22
---
Spec: `tasks/specs/linear-b7838857-953c-48d1-97fd-ef75aaf31221.md`. Seams: primary `orchestrator/src/cli/providerLinearChildLaneRunner.ts`; nearby `providerLinearChildLaneShell.ts`, `providerLinearWorkerRunner.ts`, `controlHostCliShell.ts`, `utils/codexPaths.ts`. Validation: child lane stays docs-only (`tasks/index.json`, `docs/TASKS.md`, scoped diff checks); parent lane lands the bounded fix, adds focused regressions, runs full validation, and hands off only after a clean review drain.
