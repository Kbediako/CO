# ACTION_PLAN - CO Add App-Runtime Proof Capture and PR Media Handoff Parity

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-8` / `e913b2ab-2be9-4891-bf54-0ac4642ba012`
- Linear URL: https://linear.app/asabeko/issue/CO-8/co-add-app-runtime-proof-capture-and-pr-media-handoff-parity

## Summary
- Goal: finish Linear issue `CO-8` by adding a permit-gated app-runtime proof helper and reviewer handoff contract for CO provider workers.
- Scope: docs-first packet, baseline audit note, one persistent Linear workpad, pre-implementation docs-review, bounded CLI/prompt/docs/test changes, full validation, PR prep, and review handoff.
- Assumptions:
  - the live team review handoff state is `In Review`
  - the new helper can remain bounded to the worker-visible CLI surface rather than a broader runtime system
  - subagent spawning remains unavailable in-session, so delegation must be explicitly overridden

## Milestones & Sequencing
1) Register the docs-first packet for `linear-e913b2ab-2be9-4891-bf54-0ac4642ba012`, update `tasks/index.json`, update `docs/TASKS.md`, create the baseline audit note, and create the persistent `## Codex Workpad` comment.
2) Run docs-review with an explicit delegation override for this worker run before touching implementation code.
3) Implement the bounded runtime-proof helper and permit policy translation for screenshot, external-link, and video modes.
4) Update provider-worker prompt/help/skill docs so app-touching lanes can discover the new helper path before review handoff.
5) Add focused regressions for allowed, blocked, and video-disabled behavior plus help/prompt coverage.
6) Run the required validation sequence, refresh the docs packet and workpad, then assess PR/review handoff readiness.

## Dependencies
- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
- `scripts/design/pipeline/permit.js`
- `skills/linear/SKILL.md`
- `tests/linear-cli-help.spec.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" start docs-review --format json --no-interactive --task linear-e913b2ab-2be9-4891-bf54-0ac4642ba012`
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the new proof-handoff helper and permit-surface changes if they misclassify allowed proof modes or weaken fail-closed behavior
  - keep the issue active until the proof contract or blocker is reflected truthfully in the workpad

## Risks & Mitigations
- Risk: permit fields are too vague to distinguish screenshot versus external-link handoff.
  - Mitigation: add the smallest explicit runtime-proof-specific fields or translation rules needed for truthful behavior and cover them with tests.
- Risk: workers treat local-only screenshots as review-ready proof.
  - Mitigation: make reviewer-usable handoff posture explicit in helper output and fail closed when required handoff data is missing.
- Risk: prompt/docs changes drift from actual CLI behavior.
  - Mitigation: add focused prompt/help tests alongside the implementation.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/cli/2026-03-27T04-05-05-788Z-e1ccb243/manifest.json`
- Date: 2026-03-27

## Manifest Evidence
- Baseline audit: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T035157Z-baseline-audit.md`
- Docs review: `.runs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/cli/2026-03-27T04-05-05-788Z-e1ccb243/manifest.json`
- Post-fix validation + review closeout: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`
