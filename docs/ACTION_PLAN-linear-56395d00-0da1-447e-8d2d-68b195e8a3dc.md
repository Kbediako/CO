# ACTION_PLAN - CO: Stabilize unrelated orchestrator/tests/Doctor.test.ts full-suite timeouts blocking CO-219 handoff

## Summary
- Goal: restore a green repo-wide `npm run test` by explaining and fixing the unrelated `Doctor.test.ts` full-suite timeout behavior without weakening coverage or widening back into CO-219.
- Scope: docs-first packet, audited docs-review, bounded same-issue tests child lane, parent-owned full-suite reproduction, smallest viable fix, required validation, and review/elegance evidence.
- Assumptions:
  - the issue body is authoritative for the failing command surfaces and protected wording
  - the active child lane can collect tests-phase evidence inside `Doctor.test.ts` while the parent stays off that file
  - the smallest correct fix may live in Doctor tests, shared test harness, or the repo’s Vitest execution contract, depending on evidence
- Latest status (2026-04-18): milestones 1 through 7 are complete for the Doctor timeout cluster, PR `#522` is attached, current `origin/main` is merged, and the latest exact full-suite rerun is green with `345` files and `4246` tests. CO-226 is no longer blocked by the historical CO-233 SelectedRunProjection timeout because that fix is now on the merged base.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `npm run test`
  - `orchestrator/tests/Doctor.test.ts`
  - unrelated full-suite timeouts versus standalone pass
  - `npx vitest run orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ControlServer.test.ts orchestrator/tests/Doctor.test.ts`
  - `prefers task roots over nested provider templates when both signals exist`
  - `resolves provider readiness from the repo root when doctor runs in a nested directory`
- Not done if:
  - `npm run test` still times out in `Doctor.test.ts`
  - the difference between targeted Doctor success and full-suite timeout behavior remains unexplained
  - the lane uses coverage weakening, targeted-only waiver logic, or speculative host-flake claims as the closeout path
- Pre-implementation issue-quality review:
  - 2026-04-18: scope remains the narrow repo-baseline timeout lane described in CO-226. CO-219 feature logic stays out of scope, and targeted Doctor success is treated as contrast evidence rather than a waiver.

## Milestones & Sequencing
1. Register the docs-first packet in `docs/`, `tasks/`, `.agent/task/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Run audited `docs-review` for `linear-56395d00-0da1-447e-8d2d-68b195e8a3dc` before any source edits.
3. Let the bounded child lane finish its `Doctor.test.ts` tests-phase investigation and integrate or reject the resulting patch/evidence explicitly.
4. Reproduce the repo-wide timeout path under `npm run test`, compare it with the known passing targeted commands, and classify the dominant mechanism.
5. Land the smallest evidence-backed fix in the correct seam.
6. Rerun focused targeted validation and the required repo validation floor, ending with a green `npm run test`.
7. Run manifest-backed standalone review plus an explicit elegance/minimality pass before any review handoff.

## Dependencies
- Linear issue context and current workpad state
- Active child lane: `doctor-targeted-tests`
- Prompt handoff referenced upstream origin manifest id `2026-04-17T21-37-49-533Z-7f05b822`, but that file is not materialized under this workspace `.runs/`; local evidence uses the manifests created during this run.
- Likely source/test seams:
  - `orchestrator/tests/Doctor.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ControlServer.test.ts`
  - repo `npm run test` / Vitest execution surfaces

## Validation
- Docs-first:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md docs/TECH_SPEC-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md docs/ACTION_PLAN-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md tasks/specs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md tasks/tasks-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md .agent/task/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task linear-56395d00-0da1-447e-8d2d-68b195e8a3dc`
- Parent implementation:
  - focused reruns based on the diagnosed seam
  - required validation floor:
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
    - `npm run repo:stewardship`
    - `node scripts/diff-budget.mjs`
    - `npm run pack:smoke` only when touching CLI/package/skills/review-wrapper downstream surfaces
  - manifest-backed standalone review
  - explicit elegance review
- Rollback plan:
  - revert the fix if it weakens Doctor coverage or fails to restore full-suite stability

## Risks & Mitigations
- Risk: the child lane and parent both edit `Doctor.test.ts`.
  - Mitigation: parent avoids that file while the child lane is active and explicitly accepts/rejects the child result before overlapping edits.
- Risk: the issue gets reframed as generic suite flakiness without proving the Doctor-specific contrast.
  - Mitigation: every validation note preserves the exact passing and failing command surfaces from the issue.
- Risk: the fastest apparent fix is a timeout increase that hides the root cause.
  - Mitigation: treat timeout-only changes as insufficient unless the evidence shows runner scheduling is the true seam and the adjustment is the smallest honest fix.

## Approvals
- Docs-review: succeeded under `.runs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc-co226-docs-review/cli/2026-04-17T21-47-30-660Z-b185d824/manifest.json`.
- Parent implementation/review: current validation floor is green through `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs`; manifest-backed standalone review completed with `review_outcome=bounded-success`, and the explicit elegance pass found no simplification patch needed.
