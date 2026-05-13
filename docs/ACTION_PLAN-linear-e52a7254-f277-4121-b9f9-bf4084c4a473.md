# ACTION_PLAN - Richer Operator Observability Surface

## Added by Bootstrap 2026-03-27

## Traceability
- Linear issue: `CO-7` / `e52a7254-f277-4121-b9f9-bf4084c4a473`
- Linear URL: https://linear.app/asabeko/issue/CO-7/co-add-richer-operator-observability-surface-aligned-with-symphony

## Summary
- Goal: finish `CO-7` by delivering a web-first richer operator dashboard for the control host that matches Symphony's current status/dashboard information density without reopening backend truth work.
- Scope: fresh docs-first packet, pre-implementation docs-review, one additive poll-health seam from the control-host lifecycle, one shared operator dashboard presenter over the compatibility projection, `/ui` frontend updates, focused tests, and review handoff.
- Assumptions:
  - the current authoritative runtime, retry, token, and rate-limit data in CO are already sufficient for this presentation lane
  - a web-first `/ui` implementation is acceptable for this packet
  - delegation-guard steps in this run require explicit override evidence because subagent spawning is unavailable in-session

## Milestones & Sequencing
1) Register the docs-first packet for `linear-e52a7254-f277-4121-b9f9-bf4084c4a473`, update `tasks/index.json`, update `docs/TASKS.md`, and mirror the checklist to `.agent/task/`.
2) Run docs-review for the new packet and capture the explicit override/evidence needed for this provider-worker run.
3) Add a narrow control-host poll-health reader in `controlServerPublicLifecycle.ts` and thread it into the presenter context used by the observability/UI controllers.
4) Add a shared operator dashboard presenter over the compatibility projection and issue payloads, keeping `/api/v1/*` read-side seams thin and reusing current compatibility payload builders.
5) Remap `/ui/data.json` to the richer operator dashboard payload and update `packages/orchestrator-status-ui` to render the new dashboard surface and issue drilldown.
6) Add focused tests for poll-health shaping, operator dashboard payload shaping, and control-server UI delivery, then run the required validation floor.
7) Refresh docs/workpad with final evidence, attach the PR, and stop coding at the team review state.

## Dependencies
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/controlRequestContext.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`
- `orchestrator/src/cli/control/uiDataController.ts`
- `packages/orchestrator-status-ui/`
- Symphony reference baseline under `/Users/kbediako/Code/symphony`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" npx codex-orchestrator start docs-review --format json --no-interactive --task linear-e52a7254-f277-4121-b9f9-bf4084c4a473`
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node scripts/delegation-guard.mjs`
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
  - revert the additive poll-health reader and `/ui` presenter remap if the packet leaks beyond read-only observability or destabilizes the existing authenticated route contract
  - keep the issue in an active state until the dashboard surface, validation, and review handoff are explicit

## Risks & Mitigations
- Risk: the UI packet widens into another control/runtime rewrite.
  - Mitigation: keep runtime ownership unchanged and build the dashboard over the existing compatibility projection and issue payloads.
- Risk: poll-health surfacing invents state that the current lifecycle does not actually own.
  - Mitigation: source poll-health from the public lifecycle refresh coordinator only and keep it additive/operational.
- Risk: rewriting the existing status-ui package breaks non-control consumers.
  - Mitigation: prefer payload-mode detection if preserving the older monitor mode is cheaper than a hard replacement.
- Risk: validation failures from older unrelated tests mask the real scope.
  - Mitigation: separate pre-existing noise from new presenter/UI regressions and do not overstate completion.

## Approvals
- Reviewer: standalone self-review approved after current CO + Symphony audit
- Date: 2026-03-27
