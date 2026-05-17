# Task Mirror - linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6

- Linear Issue: `CO-548` / `cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`
- Task registry id: `20260517-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`
- Primary checklist: `tasks/tasks-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- PRD: `docs/PRD-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- TECH_SPEC: `tasks/specs/linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6.md`

## Scope
- Explicit `recover`, `relaunch`, and `nudge` issue-by-id recovery.
- Control-host tracked issue resolver source binding.
- Disabled broad dispatch posture preservation.

## Current Notes
- Targeted recovery previously reached the same enabled-pilot source setup as broad dispatch and skipped with `dispatch_source_disabled`.
- CO-548 now uses configured source binding for explicit recovery only.
- CO-546 already owns existing-claim revalidation and must remain separate.

## Validation
- Focused resolver and recovery tests passed.
- Full affected `ControlHostCliShell` and `ProviderIssueHandoff` test files passed.
- Build, lint, docs:check, repo:stewardship, diff-budget, delegation guard with desktop-subagent override, pack:smoke, JSON parse, and `git diff --check` passed.
- Raw gpt-5.5/xhigh standalone `codex review --uncommitted` found no actionable regressions and reported full core passing.
- `docs:freshness` remains blocked by existing repo-wide stale-doc debt outside CO-548.

## Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Targeted recovery source binding | Explicit recover/relaunch/nudge is blocked by broad `dispatch_pilot.enabled=false`. | `remove fallback` | CO-548 | Operator invokes targeted recovery for one Linear issue id. | Existing shared resolver wiring | 2026-05-17 | This issue | Recovery uses configured source binding while broad dispatch stays disabled. | ControlHostCliShell and ProviderIssueHandoff regression tests. |
| Broad dispatch disabled posture | Queue sweeps are disabled unless pilot is enabled. | `justify retaining fallback` | Control-host dispatch pilot | `dispatch_pilot.enabled=false`. | Existing dispatch-pilot safety contract | 2026-05-17 | Durable safety contract | Separate reviewed dispatch rollout enables broad admission. | Regression proves broad paths still skip. |
