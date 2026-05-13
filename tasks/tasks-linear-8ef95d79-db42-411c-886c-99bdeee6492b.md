# Task Checklist - linear-8ef95d79-db42-411c-886c-99bdeee6492b

- Linear Issue: `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
- MCP Task ID: `linear-8ef95d79-db42-411c-886c-99bdeee6492b`
- Primary PRD: `docs/PRD-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`
- TECH_SPEC: `tasks/specs/linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`

## Docs-First
- [x] PRD drafted for the `CO-104` reopened merge-closeout PR attachment disambiguation lane. Evidence: `docs/PRD-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`.
- [x] TECH_SPEC drafted with the deterministic historical-versus-current PR disambiguation contract. Evidence: `tasks/specs/linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`, `docs/TECH_SPEC-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs and task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`. Evidence: `.agent/task/linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`.
- [x] Standalone pre-implementation self-review captured in the spec readiness gate. Evidence: `tasks/specs/linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`.
- [x] docs-review approval captured for `linear-8ef95d79-db42-411c-886c-99bdeee6492b`. Evidence: `.runs/linear-8ef95d79-db42-411c-886c-99bdeee6492b-co-104-docs-review/cli/2026-04-07T14-47-56-051Z-248c4f90/manifest.json`, `out/linear-8ef95d79-db42-411c-886c-99bdeee6492b/manual/20260407T144756Z-docs-review-fallback.md`.

## Implementation
- [ ] Disambiguate historical merged same-repo PR attachments from current merge candidates in deterministic merge closeout. Evidence: pending.
- [ ] Automatically select the one remaining current same-repo candidate after safe historical filtering. Evidence: pending.
- [ ] Persist selected, ignored historical, and conflicting attached PR URL truth in the merge-closeout record. Evidence: pending.
- [ ] Preserve unchanged repo-mismatch and no-attached-PR behavior. Evidence: pending.
- [ ] Preserve enriched merge-closeout record persistence through `ProviderIssueHandoff`. Evidence: pending.

## Validation
- [ ] Add focused regressions for the `CO-81` historical `#360` plus replacement `#372` shape, a true multi-candidate ambiguity shape, and unchanged repo-mismatch / no-attached-PR behavior. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] Manifest-backed standalone review wrapper executed truthfully. Evidence: pending.
- [ ] Explicit elegance review recorded after review findings were addressed. Evidence: pending.
- [ ] `npm run pack:smoke`. Evidence: pending.

## Handoff
- [ ] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] All actionable review threads resolved or waiver recorded before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
