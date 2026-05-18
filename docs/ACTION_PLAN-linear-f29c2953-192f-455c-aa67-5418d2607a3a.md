# ACTION_PLAN - Control host: stabilize Doctor.test.ts full-suite timeout cluster under suite load

## Summary
- Goal: give the parent lane a bounded implementation plan to reproduce and fix the `Doctor.test.ts` full-suite timeout cluster under suite load while preserving isolated doctor-file success.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned timeout reproduction, parent-owned bounded doctor/test stabilization, and parent-owned focused validation.
- Assumptions:
  - the exact `CO-229` issue body is authoritative for this lane
  - `CO-216` operator-autopilot logic stays out of scope
  - isolated `Doctor.test.ts` success suggests a load-sensitive suite interaction rather than a simple always-failing doctor logic defect

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Doctor.test.ts`
  - `full-suite`
  - `suite load`
  - `passes in isolation`
  - `timeouts`
  - `orchestrator/tests/Doctor.test.ts`
  - `npm run test`
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts`
  - `reports direct-dist delegation readiness and initialize latency`
  - `keeps top-level doctor status ok when delegation is advisory but the rest of the install is healthy`
  - `keeps overall doctor status at warning when providers are incomplete`
  - `reports provider readiness when the repo is seeded and env is configured`
  - `resolves provider readiness from the repo root when doctor runs in a nested directory`
- Not done if:
  - `npm run test` still times out in the same `Doctor.test.ts` readiness cases under full-suite load
  - the investigation cannot explain why isolated doctor coverage passes while the full suite times out
  - the fix relies only on raising global timeouts without understanding or containing the suite-load behavior
  - the follow-up leaves provider-worker validation blocked in the same way for unrelated issue lanes
- Pre-implementation issue-quality review:
  - 2026-04-18: accepted framing is a bounded doctor suite-load timeout cluster. Rejected framings are another `CO-216` operator-autopilot bug, isolated `Doctor.test.ts` failure, backlog-promotion/manual-demotion follow-up, and generic doctor/docs work.

## Milestones & Sequencing
1. Create the docs-first packet and bounded registry mirrors for `CO-229` within the declared docs scope.
2. Parent reproduces the `npm run test` timeout cluster and captures timing/probe evidence for the five named `Doctor.test.ts` cases beside the passing isolated doctor-file run.
3. Parent isolates the load-sensitive seam inside doctor command logic, readiness helpers, or doctor test harness behavior instead of raising global timeouts blindly.
4. Parent applies the smallest bounded fix so `npm run test` no longer times out in the affected doctor cases while `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts` still passes in isolation.
5. Parent confirms the follow-up remains scoped to doctor-suite validation behavior and does not reopen `CO-216` backlog-promotion or manual-demotion policy logic.

## Dependencies
- Shared source anchor: `ctx:sha256:ce8d79c8861c039782f62f47ed8c1e50aaa5e0c89390d66072caab9ae13d8df4#chunk:c000001`
- Origin manifest: `.runs/linear-f29c2953-192f-455c-aa67-5418d2607a3a-docs-packet/cli/2026-04-18T00-31-50-715Z-81077b6b/manifest.json`
- Source issue: `CO-216` / `8578d3d3-adc7-4391-8d69-0a0fa5e6e378`
- Primary surfaces:
  - `orchestrator/tests/Doctor.test.ts`
  - `orchestrator/src/cli/doctor.ts`
  - `orchestrator/src/cli/utils/delegationMcpHealth.ts`
  - `orchestrator/src/cli/utils/codexCli.ts`
  - `orchestrator/src/cli/utils/optionalDeps.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`

## Validation
- Checks / tests:
  - child lane: `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - child lane: protected-term grep across the packet and mirrors
  - child lane: `git diff --check` plus `git status --short` over the touched docs/task files
  - parent lane: `npm run test`
  - parent lane: `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts`
  - parent lane: focused reruns for the five named `Doctor.test.ts` cases after the fix
- Rollback plan:
  - revert the bounded doctor/test stabilization if it masks real failures, broadens into generic doctor work, or reopens `CO-216` autopilot logic

## Risks & Mitigations
- Risk: suite-load reproduction is intermittent or noisy.
  - Mitigation: capture concrete timing/probe evidence during the first parent reproduction and keep the acceptance contract tied to the five named cases.
- Risk: the easiest-looking change is a broad timeout increase.
  - Mitigation: keep the issue-quality gate explicit that timeout increases alone are insufficient without understanding or containing the suite-load behavior.
- Risk: scope drifts into `CO-216` logic or generic doctor feature work.
  - Mitigation: keep the protected terms and rejected interpretations visible in the packet, checklist, and registry mirrors.

## Approvals
- Reviewer: docs child lane self-review for packet completeness.
- Date: 2026-04-18
