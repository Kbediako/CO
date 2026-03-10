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
- [ ] docs-review approval/override captured for registered `1100`.

## Linear Webhook Branch Shell

- [ ] `controlServer.ts` delegates the `/integrations/linear/webhook` route shell through one controller-owned branch entrypoint.
- [ ] `linearWebhookController.ts` ownership and request-entry ordering remain unchanged.
- [ ] Focused regression coverage proves the new route-shell seam without reopening Linear advisory controller logic.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual Linear webhook route-shell evidence captured.
- [ ] Elegance review completed.
