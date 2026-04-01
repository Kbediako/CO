# Task Checklist - linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612

- Linear Issue: `CO-43` / `9ff97d4a-dead-4bbf-b6e8-ee9423fa1612`
- MCP Task ID: `linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612`
- Primary PRD: `docs/PRD-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`
- TECH_SPEC: `tasks/specs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`

## Docs-First
- [x] PRD drafted for the `CO-43` scoped standalone-review context issue. Evidence: `docs/PRD-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`, `docs/TECH_SPEC-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`. Evidence: `.agent/task/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`.
- [x] Standalone pre-implementation review approval captured in spec/checklist notes for the bounded scoped-context transport repair. Evidence: `tasks/specs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`.
- [x] docs-review approved the `CO-43` packet for implementation. Evidence: `.runs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612-docs-review/cli/2026-03-30T06-52-40-070Z-7b90108a/manifest.json`, `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T070418Z-docs-review-fallback.md`.

## Investigation
- [x] Live Linear workflow states and the current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id 9ff97d4a-dead-4bbf-b6e8-ee9423fa1612`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id 9ff97d4a-dead-4bbf-b6e8-ee9423fa1612 --state "In Progress" --format json`.
- [x] The single active `## Codex Workpad` comment was created and aligned with the issue scope before implementation work. Evidence: Linear comment `24f742f4-23e5-42a2-81d9-332064744d23`.
- [x] The detached workspace was moved onto branch `co-43-preserve-scoped-review-context` before repo edits. Evidence: `git switch -c co-43-preserve-scoped-review-context`.
- [x] Baseline audit captured the scoped-context gap, local `--title` capability, and bounded transport target before implementation. Evidence: `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T064502Z-baseline-audit.md`.

## Implementation
- [ ] Generate bounded reviewer-visible scoped title context from resolved `NOTES` plus review surface when explicit scoped review lacks `--title`.
- [ ] Preserve explicit user-provided `--title` handling while keeping scope flags exact and prompt delivery artifact-only.
- [ ] Extend persisted launch-context evidence so scoped reviewer-visible transport is explicit and auditable.
- [ ] Update standalone-review guidance/help to describe the scoped title-plus-artifact contract truthfully.
- [ ] Add focused contract coverage for scoped context transport in wrapper unit/end-to-end tests.

## Validation
- [x] `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`. Evidence: `.runs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612-docs-review/cli/2026-03-30T06-52-40-070Z-7b90108a/manifest.json`, `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T070418Z-docs-review-fallback.md`.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] Focused `vitest` coverage for the scoped review context transport seam.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Manifest-backed standalone review plus explicit elegance review before handoff.
- [ ] `npm run pack:smoke`.

## Delivery
- [ ] Open or update the PR for `CO-43`, attach it to Linear, and handle automated or human feedback.
- [ ] Verify required validation is green, actionable review threads are handled, and the latest `origin/main` is merged before review handoff.
- [ ] Refresh the workpad to match the final review-ready state and stop coding once the issue reaches `In Review` or `Human Review`.
