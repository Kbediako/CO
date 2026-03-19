# Task Checklist - 1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications

- MCP Task ID: `1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications`
- Primary PRD: `docs/PRD-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`
- TECH_SPEC: `tasks/specs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`

> This lane adds the live advisory/event flow on top of the `1015` shared selected-run projection: Linear ingress in, Telegram deltas out.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`, `docs/TECH_SPEC-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`, `docs/ACTION_PLAN-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`, `tasks/specs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`, `tasks/tasks-1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`, `.agent/task/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1016-live-linear-ingress-and-telegram-delta-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`, `docs/findings/1016-live-linear-ingress-and-telegram-delta-deliberation.md`, `.runs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications-scout/cli/2026-03-06T06-40-06-402Z-a23b3b4b/manifest.json`.
- [x] docs-review manifest captured for registered `1016`. Evidence: `.runs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/cli/2026-03-06T06-56-54-322Z-1d6ddbb7/manifest.json`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T070107Z-docs-review-override/00-summary.md`.

## Runtime Implementation
- [x] Fail-closed Linear ingress route implemented outside `/api/v1`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/05-targeted-tests.log`.
- [x] Run-local Linear delivery/advisory ledger implemented with replay rejection. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/05-targeted-tests.log`.
- [x] Accepted advisory state merged into the shared selected-run projection and relevant read surfaces. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/linearDispatchSource.ts`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/05-targeted-tests.log`.
- [x] Telegram push/delta notifications implemented from the shared projection without duplicating formatter logic. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/controlServer.ts`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/05-targeted-tests.log`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/11-live-telegram-question-push.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/05-targeted-tests.log`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/05-full-test.log`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `.runs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/cli/2026-03-06T06-56-54-322Z-1d6ddbb7/review/output.log`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/10-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for ingress/projection/Telegram coherence. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/09-manual-mock-and-live-evidence.md`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/05-targeted-tests.log`.
- [x] Live Linear and Telegram verification captured where the runtime environment allows. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/09-manual-mock-and-live-evidence.md`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/11-live-telegram-question-push.json`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/11-live-linear-verification.md`.
- [x] Explicit elegance review captured. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/12-elegance-review.md`.
- [x] Coherent `1016` commit recorded. Evidence: `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/00-summary.md`, git history for the 1016 closeout commit.
