# Task Checklist - linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d

- Linear Issue: `CO-39` / `ea3ee445-72d1-4c3d-90cc-1673c714eb2d`
- MCP Task ID: `linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d`
- Primary PRD: `docs/PRD-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`
- TECH_SPEC: `tasks/specs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`

## Docs-First
- [x] PRD drafted for the `CO-39` scoped standalone-review launch issue. Evidence: `docs/PRD-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`, `docs/TECH_SPEC-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`. Evidence: `.agent/task/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`.
- [x] Standalone pre-implementation review approval captured in spec/checklist notes for the narrow scoped-launch repair. Evidence: `tasks/specs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`.
- [x] docs-review approved the `CO-39` packet for implementation. Evidence: `.runs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d-docs-review/cli/2026-03-30T00-48-51-127Z-e10216d7/manifest.json`, `out/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d/manual/20260330T005237Z-docs-review-override.md`.

## Investigation
- [x] Live Linear workflow states and the current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id ea3ee445-72d1-4c3d-90cc-1673c714eb2d`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id ea3ee445-72d1-4c3d-90cc-1673c714eb2d --state "In Progress" --format json`.
- [x] The single active `## Codex Workpad` comment was created and aligned with the issue scope before implementation work. Evidence: Linear comment `e7a1695e-222b-45b2-83c0-054e4407770c`.
- [x] The detached workspace was moved onto branch `co-39-fix-scoped-review-launch` before repo edits. Evidence: `git checkout -b co-39-fix-scoped-review-launch`.
- [x] Baseline audit captured the failing scoped-launch seam and bounded fix target before implementation. Evidence: `out/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d/manual/20260330T004235Z-baseline-audit.md`.

## Implementation
- [ ] Update the review launch builder so explicit commit/base/uncommitted scoped Codex review runs do not pass an unsupported prompt argument.
- [ ] Keep prompt/context artifacts and any persisted evidence truthful for scoped launch modes.
- [ ] Update standalone-review guidance/help to describe scoped launch behavior truthfully.
- [ ] Add focused contract coverage for scoped launch behavior in wrapper unit/end-to-end tests.

## Validation
- [ ] `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test` (unit + integration harness covering orchestrator + patterns; includes `tests/run-review.spec.ts`).
- [ ] Focused `vitest` coverage for the scoped review launch seam.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Manifest-backed standalone review plus explicit elegance review before handoff.
- [ ] `npm run pack:smoke`.

## Delivery
- [ ] Open or update the PR for `CO-39`, attach it to Linear, and handle automated or human feedback.
- [ ] Verify required validation is green, actionable review threads are handled, and the latest `origin/main` is merged before review handoff.
- [ ] Refresh the workpad to match the final review-ready state and stop coding once the issue reaches `In Review` or `Human Review`.
