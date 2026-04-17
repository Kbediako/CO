# Task Checklist - linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5

- Linear Issue: `CO-224` / `4e728e48-ac37-4a1f-aea7-61b6bf7464f5`
- MCP Task ID: `linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5`
- Primary PRD: `docs/PRD-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`
- Canonical implementation spec: `tasks/specs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`
- Parent source anchor: `ctx:sha256:0b36c871114971bb4edb7ab967a3809194daffdf41ac793d950a8af385cae861#chunk:c000001`
- Docs child-lane manifest: `.runs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5-docs-packet/cli/2026-04-17T18-52-06-926Z-75ac64a4/manifest.json`

## Docs-First
- [x] PRD drafted for the pre-startup appserver child-lane stall seam. Evidence: `docs/PRD-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`.
- [x] TECH_SPEC mirror and canonical implementation spec drafted. Evidence: `docs/TECH_SPEC-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`, `tasks/specs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`.
- [x] ACTION_PLAN drafted for bounded implementation and validation. Evidence: `docs/ACTION_PLAN-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`.
- [x] Task checklist and `.agent` mirror created. Evidence: `tasks/tasks-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`, `.agent/task/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`.
- [x] Canonical task and docs-freshness registries updated. Evidence: `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] Active `docs/TASKS.md` snapshot added. Evidence: `docs/TASKS.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`.

## Reproduction / Scope
- [x] The live seam was reproduced as an appserver child lane that emitted only runtime-selection truth before a no-startup stall window. Evidence: workpad notes plus `.runs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5-docs-packet/cli/2026-04-17T18-52-06-926Z-75ac64a4/manifest.json`.
- [x] Parent blockage on the synthetic launching reservation was kept explicit rather than reinterpreted as a started child lane. Evidence: issue wording, workpad notes, and failure-path tests.
- [x] Adjacent issue boundaries stayed intact for `CO-210`, `CO-211`, and `CO-218`. Evidence: packet docs plus `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts` and `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`.

## Implementation Acceptance
- [x] Appserver child lanes fail fast when startup evidence never materializes after runtime selection. Evidence: `orchestrator/src/cli/providerLinearChildLaneRunner.ts`.
- [x] Parent failure truth includes actionable child-proof detail instead of a generic blocked-launch summary. Evidence: `orchestrator/src/cli/providerLinearChildLaneShell.ts`.
- [x] The invalidate + CLI relaunch workaround remains available in failure messaging until appserver startup is reliable. Evidence: `orchestrator/src/cli/providerLinearChildLaneRunner.ts`, `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`.
- [x] Abort handling was added without broad runtime-provider redesign. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.

## Validation
- [x] `node scripts/delegation-guard.mjs` passes. Evidence: terminal output `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run` passes. Evidence: terminal output `Spec guard: OK`.
- [x] Focused provider-child-lane tests pass. Evidence: `npm test -- ProviderLinearChildLaneRunner.test.ts ProviderLinearChildLaneShell.test.ts`.
- [x] `npm run build`, `npm run lint`, `npm run test`, and `npm run docs:check` pass. Evidence: terminal output from the current workspace validation run (`344` files / `4107` tests passed).
- [x] `npm run docs:freshness` passes after the packet registry/mirror repair. Evidence: `docs:freshness OK` with refreshed output at `out/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5/docs-freshness.json`.
- [x] `npm run repo:stewardship` passes. Evidence: terminal output `repo:stewardship OK - 5137 tracked files, 0 action-required`.
- [x] `node scripts/diff-budget.mjs` passes with an explicit justification recorded. Evidence: `Diff budget override accepted: CO-224 requires the docs-first packet, task mirrors, appserver startup recovery, and bounded regression coverage in one auditable change; the branch now exceeds budget because it includes the required post-review watchdog fixes and packet mirrors on top of current origin/main.`
- [x] `npm run pack:smoke` passes. Evidence: terminal output `Pack smoke passed in temp mock repo`.
- [x] Manifest-backed standalone review attempt is recorded with full evidence. Evidence: `.runs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5/cli/2026-04-17T18-48-42-429Z-40aec176/manifest.json` plus `.runs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5/cli/2026-04-17T18-48-42-429Z-40aec176/review/telemetry.json`, where the wrapper now reports `status: failed`, `review_outcome: failed-boundary`, and `termination_boundary.kind: startup-anchor`; the final closeout therefore uses the manual fallback captured at `out/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5/manual/standalone-review-fallback.md`.
- [x] Explicit elegance review completes. Evidence: `out/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5/manual/elegance-review.md` records the retained minimal shape: local 90s startup watchdog, no broader runtime-provider abstraction, and preserved fail-closed parent semantics.

## Progress Log
- 2026-04-17: moved `CO-224` from `Ready` to `In Progress`, created the required single workpad comment, and recorded the pre-turn decomposition matrix plus `parallelize_now`.
- 2026-04-17: launched the docs-only `docs-packet` child lane, observed the live runtime-selection-only stall shape during its early appserver startup window, then accepted the completed docs patch once the lane eventually produced a patch artifact.
- 2026-04-17: parent added the appserver startup watchdog, abort path, actionable parent failure detail, focused regressions, and the missing docs mirrors/registry entries.

## Notes
- Keep the fix local to the child-lane startup seam; do not reopen generic runtime redesign.
- Do not weaken child-lane ownership, fail-closed decision semantics, or proof truthfulness.
