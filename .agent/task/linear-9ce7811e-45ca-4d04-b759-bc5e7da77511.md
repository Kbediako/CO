# Task Checklist - linear-9ce7811e-45ca-4d04-b759-bc5e7da77511

- Linear Issue: `CO-247` / `9ce7811e-45ca-4d04-b759-bc5e7da77511`
- MCP Task ID: `linear-9ce7811e-45ca-4d04-b759-bc5e7da77511`
- Primary PRD: `docs/PRD-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- Task spec: `tasks/specs/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- Source anchor: `ctx:sha256:435270084f0b1ce52333855ba3d994b5a40a6a98549a81c2fd69d7f806ba3dd0#chunk:c000001`

## Docs-First
- [x] PRD drafted for the current-head reclassification lane. Evidence: `docs/PRD-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`.
- [x] TECH_SPEC mirror and canonical task spec drafted with explicit blocker-vs-non-repro handling. Evidence: `docs/TECH_SPEC-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`, `tasks/specs/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`.
- [x] ACTION_PLAN drafted for the parent-owned reproduction and bounded follow-up path. Evidence: `docs/ACTION_PLAN-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`.
- [x] Task checklist and `.agent` mirror created. Evidence: `tasks/tasks-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`, `.agent/task/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`.
- [x] Parent updated `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` after manually landing the produced docs packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Pre-implementation issue-quality review recorded in the canonical task spec. Evidence: `tasks/specs/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`.

## Source / Scope
- [x] Shared source anchor recorded. Evidence: `ctx:sha256:435270084f0b1ce52333855ba3d994b5a40a6a98549a81c2fd69d7f806ba3dd0#chunk:c000001`.
- [x] Source packet anchors `CO-231` / `91749283-6dc8-4df8-aee3-5c9127c1200c` and blocked branch `linear/co-231-doctor-readiness-stability-r2` preserved in the packet. Evidence: PRD + TECH_SPEC + task spec.
- [x] Packet states that `docs/TASKS.md` zero-headroom and the `SelectedRunProjection` timeout may each be live blockers or non-repros on the current head. Evidence: PRD + TECH_SPEC + ACTION_PLAN.
- [x] Child-lane ownership stays bounded to the six packet files only. Evidence: task spec safeguard ownership split and this checklist.

## Parent Investigation Acceptance
- [x] Fresh current-head `docs/TASKS.md` evidence is captured and classified. Evidence: `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/docs-check-current-head.log`, `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/docs-check-after-packet.log`.
- [x] Fresh isolated rerun artifact for `refreshes projection proofs when child-lane reservation ledger placeholders exist` is captured. Evidence: `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/selected-run-projection-isolated.log`.
- [x] Full-suite vs isolated classification is recorded for the `SelectedRunProjection` surface if the exact rerun is not sufficient. Evidence: `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/npm-run-test-post-build.log`, `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/npm-run-test-post-fix.log`, `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/validation/05-test.log`.
- [x] Blocked `CO-231` handoff is updated to name the real remaining blocker, if any, or to record an explicit non-repro / dependency contract. Evidence: `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/post-merge-validation/16-co-231-handoff-status.md`.

## Parent Implementation Boundaries
- [x] If the docs surface is still red, parent-owned edits stay inside the supported docs headroom/archive surfaces. Evidence: current-head docs surface was a non-repro, so no docs-headroom remediation landed beyond the required packet and mirrors.
- [x] If the `SelectedRunProjection` surface is still red, parent-owned edits stay inside the narrow projection/test seam needed for current-head behavior. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] No speculative fix lands for a surface that current-head reruns classify as a non-repro. Evidence: docs blocker remained classification-only; no archive/mechanical docs expansion was introduced.

## Validation
- [x] Parent runs the reproduction/classification commands required by the packet. Evidence: `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/docs-check-current-head.log`, `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/selected-run-projection-isolated.log`, `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/npm-run-test-post-build.log`, `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/repro/npm-run-test-post-fix.log`.
- [x] Parent runs `node scripts/spec-guard.mjs --dry-run` after accepting the docs packet and any follow-up changes. Evidence: `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/validation/02-spec-guard.log`.
- [x] Parent completes standalone review and elegance review before any review handoff if a non-trivial diff lands. Evidence: `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/validation/10-review-fallback.md`, `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/manual/validation/11-elegance-review.md`.

## Progress Log
- 2026-04-18: live workpad recorded detached `HEAD` at `3d3d56959`, source packet anchors `CO-231` / `91749283-6dc8-4df8-aee3-5c9127c1200c`, and current `docs/TASKS.md` line count `446`, so the inherited `450/450 zero_headroom` blocker must be rechecked instead of assumed.
- 2026-04-18: same-turn child lane launched with docs-only ownership covering exactly the six packet files.
- 2026-04-18: packet drafted without touching registry mirrors, `docs/TASKS.md`, code, tests, workpad, or PR lifecycle surfaces.
- 2026-04-18: fresh current-head repro proved the docs blocker was stale (`docs:check` green before and after the packet) while the exact `SelectedRunProjection` case remained a post-build full-suite-only timeout until the bounded projection refresh fix landed.
- 2026-04-18: ordered validation completed through `delegation-guard`, `spec-guard`, `build`, `lint` (warnings only), `test`, `docs:check`, `docs:freshness`, `repo:stewardship`, `diff-budget` override, and `pack:smoke`.
- 2026-04-18: wrapper-led standalone review stalled without telemetry or verdict after low-signal temp-script exploration, so the lane closed with manual review fallback plus an explicit elegance pass.
- 2026-04-18: post-merge PR review feedback tightened the child-lane refresh shortcut so only `turn_completed` proofs with a complete session-log floor can skip hydration; merged-head reruns stayed green on the targeted `SelectedRunProjection` suite and full `npm run test`, and the CO-231 handoff artifact now records that the remaining dependency is PR `#536` review/drain rather than a validation-floor blocker.

## Notes
- Do not assume either inherited blocker outcome before fresh current-head evidence.
- Parent owns workpad, validation, implementation, review handoff, and final blocker classification.
- This child lane is complete once the six packet files are exported as a bounded patch.
