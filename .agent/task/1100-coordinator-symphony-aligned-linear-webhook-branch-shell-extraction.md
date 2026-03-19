# Task Checklist - 1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction

- MCP Task ID: `1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`

> This lane resumes the next Symphony-aligned product seam after `1099` by extracting only the inline Linear webhook route shell from `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`, `tasks/specs/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`, `tasks/tasks-1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`, `.agent/task/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1100-linear-webhook-branch-shell-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md`, `docs/findings/1100-linear-webhook-branch-shell-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1100`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T014407Z-docs-first/05-docs-review-override.md`.

## Linear Webhook Branch Shell

- [x] `controlServer.ts` delegates the `/integrations/linear/webhook` route shell through the webhook controller boundary. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/11-manual-linear-webhook-branch-check.json`.
- [x] `linearWebhookController.ts` owns the route gate while deeper webhook behavior and request-entry ordering remain unchanged. Evidence: `orchestrator/src/cli/control/linearWebhookController.ts`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/11-manual-linear-webhook-branch-check.json`.
- [x] Focused regression coverage proves the new route-shell seam without reopening Linear advisory controller logic. Evidence: `orchestrator/tests/LinearWebhookController.test.ts`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/08-diff-budget.log`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/10-pack-smoke.log`.
- [x] Manual Linear webhook route-shell evidence captured. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/11-manual-linear-webhook-branch-check.json`.
- [x] Elegance review completed. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/12-elegance-review.md`.
