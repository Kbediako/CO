# ACTION_PLAN - CO Add Audited Provider-Worker Child-Stream Support for Bounded Multi-Agent Work

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-13` / `488135bf-954e-4bd9-be7a-ad09d75f5f29`
- Linear URL: https://linear.app/asabeko/issue/CO-13/co-add-audited-provider-worker-child-stream-support-for-bounded-multi

## Summary
- Goal: finish Linear issue `CO-13` by adding a bounded, audited provider-worker child-stream path that satisfies current CO guardrails and current Symphony-informed constraints.
- Scope: docs-first packet, one persistent Linear workpad, pre-implementation docs-review, narrow provider-worker child-stream launch/audit changes, focused tests, required validation, PR prep, and review handoff.
- Assumptions:
  - the live team review handoff state is `In Review`
  - the current provider-worker manifest env is truthful and can be used as the parent-run authority baseline
  - `delegation-guard` already contains the sanctioned provider-child authorization contract, so the implementation can reuse it rather than widening policy

## Milestones & Sequencing
1) Register the docs-first packet for `linear-488135bf-954e-4bd9-be7a-ad09d75f5f29`, update `tasks/index.json`, update `docs/TASKS.md`, capture the baseline audit, and refresh the persistent `## Codex Workpad`.
2) Run docs-review on the registered packet before touching implementation code.
3) Implement a bounded provider-worker child-stream launcher that validates the active provider-worker parent run, launches a sanctioned child task/run in the same workspace, and records truthful lineage.
4) Patch provider-worker proof/read-model surfaces so child-stream use is auditable without weakening current authority boundaries.
5) Patch scheduler/provider discovery so nested provider-worker child manifests cannot masquerade as scheduler-owned provider runs.
6) Add focused regressions, run the required validation sequence, refresh the docs packet/workpad, attach the PR, and stop coding at the live review handoff state.

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/README.md`
- `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
- `AGENTS.md`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `scripts/delegation-guard.mjs`
- `codex.orchestrator.json`

## Validation
- Checks / tests:
  - `node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-488135bf-954e-4bd9-be7a-ad09d75f5f29`
  - `node scripts/delegation-guard.mjs`
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
  - revert the child-stream launcher/proof/discovery changes if they break current single-stream provider-worker execution or make provider discovery ambiguous
  - keep the issue active until proof/manifests and validation are truthful

## Risks & Mitigations
- Risk: nested provider-worker child manifests get mistaken for scheduler-owned provider runs.
  - Mitigation: explicitly exclude manifests carrying provider-worker child lineage from scheduler-owned provider discovery and add focused regressions.
- Risk: child-stream lineage written by the worker is not durable enough for later audit.
  - Mitigation: record lineage in a file under the parent run directory and surface it through the provider proof path.
- Risk: a too-broad launcher allowlist widens authority beyond review/planning use cases.
  - Mitigation: start with the smallest useful allowlist and fail closed on anything else.

## Approvals
- Reviewer: docs-review override captured after sanctioned provider-child run reached review-stage stall
- Date: 2026-03-27

## Manifest Evidence
- Current provider-worker manifest: `.runs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/cli/2026-03-26T14-32-37-352Z-eda5d760/manifest.json`
- Baseline audit: `out/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/manual/20260326T144912Z-baseline-audit.md`
- Docs-review override: `out/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/manual/20260326T150716Z-docs-review-override.md`
