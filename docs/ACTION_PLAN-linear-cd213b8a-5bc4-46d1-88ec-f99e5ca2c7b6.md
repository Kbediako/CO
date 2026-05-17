# ACTION_PLAN - CO-548 decouple targeted provider-worker nudge from broad dispatch pilot

## Traceability
- Linear issue: `CO-548` / `cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`
- PRD: `docs/PRD-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- TECH_SPEC: `tasks/specs/linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- Checklist: `tasks/tasks-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`

## Current Evidence
- Live `control-host recover --issue-id a08ba13b-1c9a-43ed-beec-f63a0547b721 --format json` skipped CO-543 with `dispatch_source_disabled`.
- Source inspection shows `createControlHostTrackedIssueResolvers.resolveTrackedIssue` uses `resolveLinearWebhookSourceSetup`, which requires `dispatch_pilot.enabled=true`.
- `resolveLinearConfiguredSourceSetup` already exists and honors source binding/kill-switch errors without requiring broad dispatch to be enabled.
- CO-546 already uses configured source binding for existing-claim revalidation; CO-548 owns explicit targeted recovery only.

## Plan
1. Register the CO-548 docs-first packet across task mirrors and freshness registry.
2. Add a recovery-specific resolver option to `ProviderIssueHandoff`.
3. Wire control-host recovery to configured Linear source binding while leaving broad dispatch/webhook paths on the enabled-pilot gate.
4. Add focused resolver and accepted/no-run recovery regressions.
5. Run focused validation, then broader gates as scope requires.
6. Update the Linear workpad with evidence and prepare PR/review handoff if clean.

## Validation
- `git diff --check`
- `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('node:fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"`
- Focused `ControlHostCliShell` resolver test.
- Focused `ProviderIssueHandoff` recovery test.
- `node scripts/spec-guard.mjs --dry-run`
- Build/lint/docs gates scaled to touched surfaces.

## Validation Results
- Focused resolver and recovery tests passed.
- Full affected `ControlHostCliShell` and `ProviderIssueHandoff` test files passed.
- Build, lint, default test, docs:check, repo:stewardship, diff-budget, delegation guard with desktop-subagent override, pack:smoke, JSON parse, and `git diff --check` passed.
- gpt-5.5/xhigh read-only reviewer and `codex-orchestrator review --uncommitted` found no actionable regressions.
- `docs:freshness` remains blocked by existing repo-wide stale-doc debt outside CO-548.
- `spec-guard --dry-run` exits 0 but still reports existing stale spec metadata outside CO-548.

## Risks
- Accidentally enabling broad dispatch would violate operator posture; tests must assert broad paths still skip.
- Launching without verified Linear source binding would fail closed safety; use the existing configured-source helper.
- Duplicating CO-546 revalidation could create drift; recovery gets its own resolver and revalidation stays unchanged.

## Fallback Decision Table
- Large-refactor decision: not required; existing source setup helpers already separate configured binding from enabled broad dispatch admission.
- Minor-seam decision: acceptable because the change narrows recovery authority by explicit action class and removes the operator workaround of enabling broad dispatch.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Targeted recovery source binding | Explicit recover/relaunch/nudge is blocked by broad `dispatch_pilot.enabled=false`. | `remove fallback` | CO-548 | Operator invokes targeted recovery for one Linear issue id. | Existing shared resolver wiring | 2026-05-17 | This issue | Recovery uses configured source binding while broad dispatch stays disabled. | ControlHostCliShell and ProviderIssueHandoff regression tests. |
| Broad dispatch disabled posture | Queue sweeps are disabled unless pilot is enabled. | `justify retaining fallback` | Control-host dispatch pilot | `dispatch_pilot.enabled=false`. | Existing dispatch-pilot safety contract | 2026-05-17 | Durable safety contract | Separate reviewed dispatch rollout enables broad admission. | Regression proves broad paths still skip. |

- Contract name: dispatch-pilot broad admission disabled posture.
- Owning surface: control-host dispatch pilot.
- Steady-state proof: broad issue discovery remains disabled unless the pilot is explicitly enabled.
- Tests/docs: focused resolver and recovery tests plus this docs packet.
- Non-expiring rationale: durable operator safety contract, not a temporary fallback.
