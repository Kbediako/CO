# Task Checklist - linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6

- Linear Issue: `CO-26` / `a861c0fe-0db2-4c2b-a62a-c2010b5cbed6`
- MCP Task ID: `linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6`
- Primary PRD: `docs/PRD-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`
- TECH_SPEC: `tasks/specs/linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`

## Docs-First
- [x] PRD drafted for the terminal-first `CO STATUS` issue. Evidence: `docs/PRD-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`.
- [x] TECH_SPEC drafted with the shared presenter/read-model baseline and the control-host shell seam. Evidence: `tasks/specs/linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`, `docs/TECH_SPEC-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, tests, and handoff. Evidence: `docs/ACTION_PLAN-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`. Evidence: `.agent/task/linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`.
- [x] Standalone pre-implementation self-review captured in the spec review notes. Evidence: `tasks/specs/linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`.
- [ ] docs-review approval captured for `linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6`. Evidence: pending child-stream manifest.

## Implementation
- [ ] Add a control-host terminal dashboard renderer headed exactly `CO STATUS` over the existing operator dashboard dataset. Evidence: pending implementation.
- [ ] Wire `controlHostCliShell.ts` to start and stop the terminal dashboard for interactive text-mode usage. Evidence: pending implementation.
- [ ] Preserve machine-readable `--format json` output and safe non-TTY behavior. Evidence: pending implementation.
- [ ] Show running sessions, retry queue, totals, rate limits, poll health, and per-issue/session rows without duplicating observability logic. Evidence: pending implementation.
- [ ] Preserve the thin presenter/controller split and avoid introducing a second observability truth path. Evidence: pending implementation.

## Validation
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] `npm run pack:smoke`. Evidence: pending.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `c4e73b54-5a56-4f5e-b120-b7b4bb06e43c`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
