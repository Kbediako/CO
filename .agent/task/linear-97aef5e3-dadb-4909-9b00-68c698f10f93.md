# Task Checklist - linear-97aef5e3-dadb-4909-9b00-68c698f10f93

- Linear Issue: `CO-37` / `97aef5e3-dadb-4909-9b00-68c698f10f93`
- MCP Task ID: `linear-97aef5e3-dadb-4909-9b00-68c698f10f93`
- Primary PRD: `docs/PRD-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`
- TECH_SPEC: `tasks/specs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`

## Docs-First
- [x] PRD drafted for the `CO-37` child-stream prelude-log parsing issue. Evidence: `docs/PRD-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`, `docs/TECH_SPEC-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`. Evidence: `.agent/task/linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`.
- [x] Standalone pre-implementation review approval captured in the spec/checklist notes for the narrow child-stream parse repair. Evidence: `tasks/specs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`.
- [x] docs-review approved the `CO-37` packet for implementation. Evidence: `.runs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93-docs-review/cli/2026-03-30T06-50-00-271Z-a27a59eb/manifest.json`, `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T065459Z-docs-review-override.md`.

## Investigation
- [x] Live Linear workflow states and the current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id 97aef5e3-dadb-4909-9b00-68c698f10f93`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id 97aef5e3-dadb-4909-9b00-68c698f10f93 --state "In Progress" --format json`.
- [x] The single active `## Codex Workpad` comment was created and aligned with the issue scope before implementation work. Evidence: Linear comment `9d235b9c-e73c-4e99-9f19-c1f3bb30917c`.
- [x] The detached workspace was moved onto branch `co-37-child-stream-json-prelude` before repo edits. Evidence: `git checkout -b co-37-child-stream-json-prelude`.
- [x] Baseline audit captured the failing child-stream parse seam and bounded fix target before implementation. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T064305Z-baseline-audit.md`.

## Implementation
- [x] Update the child-stream parser so valid final JSON objects still parse when wrapper logs precede them. Evidence: `orchestrator/src/cli/providerLinearChildStreamShell.ts`.
- [x] Keep the returned success payload contract and downstream path validation unchanged. Evidence: `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] Add focused contract coverage for leading-prelude success and malformed-output failure in `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`. Evidence: `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`, `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.

## Validation
- [x] `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`. Evidence: `.runs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93-docs-review/cli/2026-03-30T06-50-00-271Z-a27a59eb/manifest.json`, `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T065459Z-docs-review-override.md`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] `npm run build`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] `npm run lint`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] `npm run test` attempted; the suite reached late visible passes before a non-authoritative quiet-tail stall and is recorded explicitly as an override. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] Focused `vitest` coverage for `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] Manifest-backed standalone review attempted; wrapper drifted without a concrete verdict, so the documented manual review fallback plus explicit elegance review were completed instead. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T071219Z-validation-review-notes.md`.

## Delivery
- [ ] Open or update the PR for `CO-37`, attach it to Linear, and handle automated or human feedback.
- [ ] Verify required validation is green, actionable review threads are handled, and the latest `origin/main` is merged before review handoff.
- [ ] Refresh the workpad to match the final review-ready state and stop coding once the issue reaches `In Review` or `Human Review`.
