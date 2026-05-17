# Task Checklist - CO-548 decouple targeted provider-worker nudge from broad dispatch pilot

- Linear Issue: `CO-548` / `cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`
- Task registry id: `20260517-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`
- PRD: `docs/PRD-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- TECH_SPEC: `tasks/specs/linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`

## Current Scope
- Decouple explicit provider-worker `recover`, `relaunch`, and `nudge` issue-by-id resolution from broad dispatch-pilot admission.
- Keep broad dispatch/webhook/queue sweep paths disabled when `dispatch_pilot.enabled=false`.
- Preserve Linear source binding, workspace/team/project filtering, and kill-switch safety.
- Add focused regressions for disabled broad dispatch with targeted recovery.

## Status
- [x] Live control-host failure evidence captured by parent orchestration.
- [x] Workpad created with serial parallelization decision.
- [x] Read-only gpt-5.5/xhigh explorer mapped the failure path.
- [x] Docs-first packet created.
- [x] Focused regression added.
- [x] Implementation complete.
- [x] Focused validation passing.
- [x] Broader validation passing.
- [ ] Workpad updated with evidence.
- [ ] PR/review handoff complete.

## Validation Evidence
- `npm run test:core -- orchestrator/tests/ControlHostCliShell.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "configured source binding|recovery resolver"` passed.
- `npm run test:core -- orchestrator/tests/ControlHostCliShell.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts` passed.
- `npm run build` passed.
- `npm run lint` passed with existing `orchestrator/tests/DelegationMcpHealth.test.ts` warnings only.
- `node scripts/spec-guard.mjs --dry-run` exited 0; output still reported the existing stale-spec baseline outside CO-548.
- `npm run docs:check` passed.
- `npm run docs:freshness` failed on existing repo-wide freshness debt outside CO-548 (`5417` docs / `5420` registry entries, `556` stale docs).
- `git diff --check` passed.
- `npm run test` passed.
- `npm run repo:stewardship` passed.
- `node scripts/diff-budget.mjs` passed.
- `DELEGATION_GUARD_OVERRIDE_REASON='Desktop gpt-5.5/xhigh read-only review subagent completed in the parent Codex session; MCP runner manifest is unavailable for desktop spawn_agent evidence in this lane.' node scripts/delegation-guard.mjs` passed.
- `npm run pack:smoke` passed.
- Desktop gpt-5.5/xhigh read-only reviewer reported no actionable findings.
- `codex-orchestrator review --uncommitted` with gpt-5.5/xhigh completed as bounded success with no actionable regressions.
- A follow-on standalone `codex review --uncommitted -c model="gpt-5.5" -c model_reasoning_effort="xhigh"` completed; the subsequent process sweep found no leftover review, delegate, or Vitest processes.

## Known Baseline Blockers
- `npm run docs:freshness` remains blocked by existing repo-wide stale-doc debt, not by the new CO-548 registry rows.
- `node scripts/spec-guard.mjs --dry-run` still surfaces existing stale spec metadata; CO-548 did not refresh unrelated specs.

## Fallback Decision Table
- Large-refactor decision: not required; use existing configured-source helper for targeted recovery.
- Minor-seam decision: acceptable because the change removes a broader operational workaround and keeps authority separated by action class.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Targeted recovery source binding | Explicit recover/relaunch/nudge is blocked by broad `dispatch_pilot.enabled=false`. | `remove fallback` | CO-548 | Operator invokes targeted recovery for one Linear issue id. | Existing shared resolver wiring | 2026-05-17 | This issue | Recovery uses configured source binding while broad dispatch stays disabled. | ControlHostCliShell and ProviderIssueHandoff regression tests. |
| Broad dispatch disabled posture | Queue sweeps are disabled unless pilot is enabled. | `justify retaining fallback` | Control-host dispatch pilot | `dispatch_pilot.enabled=false`. | Existing dispatch-pilot safety contract | 2026-05-17 | Durable safety contract | Separate reviewed dispatch rollout enables broad admission. | Regression proves broad paths still skip. |

- Contract name: dispatch-pilot broad admission disabled posture.
- Owning surface: control-host dispatch pilot.
- Steady-state proof: broad issue discovery remains disabled unless the pilot is explicitly enabled.
- Tests/docs: focused resolver and recovery tests plus this docs packet.
- Non-expiring rationale: durable operator safety contract, not a temporary fallback.

## Not Done If
- `control-host recover` still returns `dispatch_source_disabled` for one explicitly requested runnable issue solely because broad dispatch is disabled.
- Broad queue sweeps begin running while `dispatch_pilot.enabled=false`.
- Targeted recovery bypasses kill switch or Linear source binding errors.
- CO-546 revalidation behavior is changed instead of leaving revalidation separate.
