# ACTION_PLAN - CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: remove or reconcile the named stale compatibility, placeholder, and contradictory surfaces so the repo tells one truthful current story again.
- Scope:
  - register the CO-88 docs packet, task mirrors, and workpad mirror
  - run audited docs-review before implementation
  - audit the named cleanup clusters and decide remove vs retain-with-rationale
  - implement the cleanup pass across code plus the touched docs/specs/tasks/instructions
  - run focused tests plus the normal validation/review gates
- Assumptions:
  - the issue description already names the primary seams, so the first implementation pass can stay bounded to those clusters and directly adjacent truth surfaces instead of broad repo refactoring

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `repo-wide cleanup`, `stale compatibility debt`, `contradictory docs`, `placeholder surfaces`, `truthfulness lane`, `prefer deletion/collapse`, legacy selected-run presenter module, `scripts/lib/review-launch-attempt.ts`, `packages/sdk-node`, `packages/design-system`, `CO-82`, `CO-83`
- Not done if:
  - touched code is cleaned up but docs/specs/tasks/instructions still describe the stale surfaces as active
  - contradictory design-system or SDK claims remain
  - compatibility leftovers remain ambiguous
  - the lane broadens into `CO-82` or `CO-83`
- Pre-implementation issue-quality review:
  - current repo truth confirms this is not a docs-only wording lane. The active contradictions are spread across runtime seams, task registry surfaces, package contracts, and stale historical instructions, so one integrated cleanup pass is the smallest truthful scope.

## Milestones & Sequencing
1) Register the `linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0` docs packet, workpad mirror, and registry entries, then run the audited `docs-review` child stream and fold back any packet-only fixes.
2) Audit the named cleanup targets and classify them as remove now, retain with rationale, or follow-up, with explicit carve-outs for `CO-82` and `CO-83`.
3) Implement the cleanup pass across code plus touched docs/specs/tasks/instructions, preferring deletion or canonical-reference rewrites over duplicate compatibility or placeholder surfaces.
4) Add focused regressions, run the ordered validation floor, complete standalone review plus an explicit elegance pass, refresh the workpad, and prepare PR handoff only after the repo tells a coherent truthful story.

## Dependencies
- `orchestrator/src/cli/control/**`
- `orchestrator/src/persistence/**`
- `orchestrator/src/cli/services/pipelineResolver.ts`
  - `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
- `orchestrator/src/types.ts`
- `scripts/lib/review-launch-attempt.ts`
- `scripts/run-review.ts`
- `packages/sdk-node/src/orchestrator.ts`
- `packages/design-system/**`
- `packages/orchestrator-status-ui/app.js`
- `docs/AGENTS.md`
- `.agent/AGENTS.md`
- `tasks/design-reference-pipeline.md`
- `tasks/hi-fi-design-toolkit.md`
- stale MCP code-mode report archive

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused tests for touched runtime/package/review seams
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke` when downstream-facing surfaces change
- Rollback plan:
  - keep each cleanup cluster as a bounded removal or canonical-reference rewrite so any mistaken deletion can be reverted without reintroducing broader contradictory surface changes

## Risks & Mitigations
- Some compatibility seams may still have a narrow live consumer.
  - Mitigation: audit call sites and docs/task references before deletion; keep only seams with explicit rationale.
- The cleanup may uncover more stale surfaces than the current lane can absorb truthfully.
  - Mitigation: file follow-up issues for genuinely new bounded work instead of expanding scope silently.
- `docs/TASKS.md` is already at the line cap before the CO-88 snapshot.
  - Mitigation: run the repo-supported archive fallback immediately after packet registration if the new snapshot pushes it over budget.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-09
