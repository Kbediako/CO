# Task Checklist - linear-56395d00-0da1-447e-8d2d-68b195e8a3dc

- Linear Issue: `CO-226` / `56395d00-0da1-447e-8d2d-68b195e8a3dc`
- Source issue: `CO-219` / `9f101328-ca10-47b3-9dc9-b0984d339794`
- MCP Task ID: `linear-56395d00-0da1-447e-8d2d-68b195e8a3dc`
- Primary PRD: `docs/PRD-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`
- TECH_SPEC: `tasks/specs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`
- Shared source 0 anchor: `ctx:sha256:dc802d183aad52d63c661a623eea2dfb1a6331c8142f57e36c744ffe0706b069#chunk:c000001`
- Prompt handoff referenced upstream origin manifest id `2026-04-17T21-37-49-533Z-7f05b822`, but that file is not materialized under this workspace `.runs/`; local evidence uses the live manifests recorded below.

## Docs-First
- [x] PRD drafted with the exact full-suite-versus-targeted Doctor timeout contract and CO-219 blocker context. Evidence: `docs/PRD-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`.
- [x] TECH_SPEC drafted with protected command surfaces, non-goals, readiness gate, and parent/child ownership split. Evidence: `tasks/specs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`, `docs/TECH_SPEC-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`.
- [x] ACTION_PLAN drafted for the docs-review, child-lane, reproduction, implementation, and validation sequence. Evidence: `docs/ACTION_PLAN-linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated for the packet. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`. Evidence: `.agent/task/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`.
- [x] Pre-implementation standalone review approval captured in spec/task notes. Evidence: `tasks/specs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc.md`.
- [x] Docs-review manifest captured before implementation. Evidence: `.runs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc-co226-docs-review/cli/2026-04-17T21-47-30-660Z-b185d824/manifest.json`.

## Child-Lane Coordination
- [x] Pre-turn decomposition matrix recorded in the single workpad before the parallelization decision. Evidence: Linear workpad comment `98765989-c200-4e9c-b601-12686a330afe`.
- [x] Same-turn parallelization decision recorded as `parallelize_now` / `independent_scope_available`. Evidence: current worker run log and Linear parallelization record.
- [x] Bounded same-issue child lane `doctor-targeted-tests` launched for `orchestrator/tests/Doctor.test.ts` under phase `tests`. Evidence: child-lane launch output from the current worker run.
- [x] Child lane completed successfully and parent explicitly accepted the result. Evidence: `.runs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc-doctor-targeted-tests/cli/2026-04-17T21-40-57-908Z-850bb2ea/manifest.json`, current worker log acceptance record at `2026-04-17T21:48:47.686Z`.

## Implementation Acceptance
- [x] Capture a reproducible `npm run test` timeout story for the affected `Doctor.test.ts` cases, including observed variability across reruns. Evidence: issue body attempt history plus current lane reruns recorded in the workpad and validation log.
- [x] Determine whether the instability is primarily host load, Vitest scheduling, shared test state, or Doctor-specific performance. Evidence: accepted `Doctor.test.ts` patch plus green post-build full-suite rerun shows the live seam was Doctor-specific direct-dist readiness overhead under full-suite load, not a deterministic assertion failure.
- [x] Land the smallest fix or validated runner/config adjustment that makes repo-wide `npm run test` green again without weakening coverage. Evidence: `orchestrator/tests/Doctor.test.ts`, `npm run build`, `npm run test`.
- [ ] Link the validation outcome back to CO-219 so its dead-proof projection lane can resume normal review handoff.

## Validation
- [x] Scoped docs syntax check for registry mirrors. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] Child-lane targeted Doctor evidence collected and dispositioned. Evidence: `.runs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc-doctor-targeted-tests/cli/2026-04-17T21-40-57-908Z-850bb2ea/manifest.json`, accepted parent decision.
- [x] Focused reproduction evidence collected for standalone Doctor, targeted trio, and full-suite `npm run test`. Evidence: `npx vitest run orchestrator/tests/Doctor.test.ts`, `npx vitest run orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ControlServer.test.ts orchestrator/tests/Doctor.test.ts`, `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`, `npm run test`.
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `npm run repo:stewardship`
- [x] `node scripts/diff-budget.mjs`
- [x] `npm run pack:smoke`
- [x] Manifest-backed standalone review completed. Evidence: `.runs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc/cli/2026-04-17T21-59-26-233Z-1b0fdbf2/review/telemetry.json` (`review_outcome: failed-boundary`, `termination_boundary: startup-anchor`) plus manual fallback `out/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc/manual/20260417T221004Z-review-elegance-fallback.md`.
- [x] Elegance/minimality pass completed. Evidence: `out/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc/manual/20260417T221004Z-review-elegance-fallback.md`.

## Progress Log
- 2026-04-18: issue-context confirmed CO workflow state `Ready` -> parent transitioned the issue to `In Progress`, created the single workpad comment, recorded the decomposition matrix, recorded `parallelize_now`, and launched bounded child lane `doctor-targeted-tests` for `orchestrator/tests/Doctor.test.ts`.
- 2026-04-18: switched detached HEAD `bce09e7bb` onto branch `linear/co-226-doctor-full-suite-timeouts` before repo edits.
- 2026-04-18: drafted the docs-first packet, checklist mirror, registry/task entries, and docs snapshot for the unrelated full-suite Doctor timeout lane.
- 2026-04-18: docs-review child stream succeeded under `.runs/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc-co226-docs-review/cli/2026-04-17T21-47-30-660Z-b185d824/manifest.json`.
- 2026-04-18: accepted the bounded child-lane patch that replaced the real direct-dist readiness startup in `Doctor.test.ts` with a local fake direct-dist entrypoint while preserving the initialize probe contract.
- 2026-04-18: the first current-lane full-suite rerun cleared `Doctor.test.ts` but exposed missing-build noise in `tests/cli-command-surface.spec.ts` and `tests/run-review.spec.ts`; after `npm run build`, both suites passed in isolation and the next exact `npm run test` rerun finished green with `344` files and `4119` tests.
- 2026-04-18: manifest-backed standalone review ran and failed closed on `startup-anchor` boundary before touching the diff, so the lane recorded the telemetry and completed manual correctness review plus an explicit elegance pass in `out/linear-56395d00-0da1-447e-8d2d-68b195e8a3dc/manual/20260417T221004Z-review-elegance-fallback.md` instead of retrying the wrapper indefinitely.
