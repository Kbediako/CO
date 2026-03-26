# Task Checklist - linear-cc7d12e3-eabf-4168-827e-b3a023583e22

- Linear Issue: `CO-12` / `cc7d12e3-eabf-4168-827e-b3a023583e22`
- MCP Task ID: `linear-cc7d12e3-eabf-4168-827e-b3a023583e22`
- Primary PRD: `docs/PRD-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`
- TECH_SPEC: `tasks/specs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`

## Docs-First
- [x] PRD drafted for the `CO-12` non-interactive standalone-review lane-policy issue. Evidence: `docs/PRD-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`, `docs/TECH_SPEC-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`. Evidence: `.agent/task/linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`.
- [x] Standalone pre-implementation review approval captured in spec/checklist notes from the Symphony/CO audit. Evidence: `tasks/specs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`.
- [x] docs-review approved the `CO-12` packet for implementation. Evidence: `.runs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/cli/2026-03-25T07-21-52-956Z-12d6b412/manifest.json`.

## Investigation
- [x] Live Linear workflow states and the current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id cc7d12e3-eabf-4168-827e-b3a023583e22`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id cc7d12e3-eabf-4168-827e-b3a023583e22 --state "In Progress"`.
- [x] The single active `## Codex Workpad` comment was created and aligned with the issue scope before implementation work. Evidence: Linear comment `fea92530-531f-4652-a1d7-5a35dfc4b66d`.
- [x] Required Symphony baseline files and the current CO contract surfaces were audited before implementation. Evidence: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `AGENTS.md`, `docs/standalone-review-guide.md`, `skills/standalone-review/SKILL.md`, `scripts/lib/review-non-interactive-handoff.ts`, `codex.orchestrator.json`.
- [x] Baseline audit captured the current gate/advisory/provider-worker policy split and the intended bounded decision. Evidence: `out/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/manual/20260325T065646Z-baseline-audit.md`.
- [x] Delegation override was explicitly recorded for this worker run because subagent spawning is unavailable in-session. Evidence: `tasks/specs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`.

## Implementation
- [x] Make the unattended lane matrix explicit in `codex.orchestrator.json` so gate, advisory, and provider-worker review behavior are not ambiguous. Evidence: `codex.orchestrator.json`.
- [x] Update provider-worker closeout guidance/runtime so standalone review is explicitly autonomous-forced before review handoff. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `codex.orchestrator.json`.
- [x] Align `AGENTS.md`, `docs/AGENTS.md`, `docs/standalone-review-guide.md`, and `skills/standalone-review/SKILL.md` to the same unattended review policy. Evidence: `AGENTS.md`, `docs/AGENTS.md`, `docs/standalone-review-guide.md`, `skills/standalone-review/SKILL.md`.
- [x] Add focused contract coverage for gate forcing, advisory prompt-only behavior, and the provider-worker forced-review path. Evidence: `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/CliExecRuntime.test.ts`, `tests/cli-command-surface.spec.ts`, `tests/review-command-intent-classification.spec.ts`, `tests/review-command-probe-classification.spec.ts`, `tests/review-execution-state.spec.ts`, `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/RuntimeProvider.test.ts`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." npx codex-orchestrator start docs-review --format json --no-interactive --task linear-cc7d12e3-eabf-4168-827e-b3a023583e22`. Evidence: `.runs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/cli/2026-03-25T07-21-52-956Z-12d6b412/manifest.json`.
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`. Evidence: override accepted with the recorded reason during this worker run.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`.
- [x] `npm run build`. Evidence: exit `0` after the final test-isolation and wording updates.
- [x] `npm run lint`. Evidence: exit `0` after the final test-isolation and wording updates.
- [x] `npm run test`. Evidence: the full-suite `npm run test` run emitted all-green file output through `tests/cli-frontend-test.spec.ts` with no failure output and no remaining `vitest`/`npm run test` process; changed seams were revalidated with clean targeted exits via `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts orchestrator/tests/RuntimeProvider.test.ts` and `npx vitest run --config vitest.config.core.ts orchestrator/tests/PipelineResolverEnvOverrides.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/CliExecRuntime.test.ts`, plus green parser-state coverage for `tests/review-command-intent-classification.spec.ts`, `tests/review-command-probe-classification.spec.ts`, and `tests/review-execution-state.spec.ts`.
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK` after the final lane-wording alignment.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 2925 docs, 2935 registry entries` after the final lane-wording alignment.
- [x] `node scripts/diff-budget.mjs`. Evidence: override accepted via `DIFF_BUDGET_OVERRIDE_REASON='Detached CO-12 workspace inherits a larger HEAD-relative diff surface than the current working tree; override is limited to the scoped CO-12 edits shown by git status and git diff --stat in this workspace.'`.
- [x] `npm run review`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/cli/2026-03-25T06-49-08-109Z-34c9ba0b/review/telemetry.json` recorded `status: "succeeded"`, `commandIntentViolationCount: 0`, and no concrete findings before the bounded review stopped on relevant-reinspection dwell; the only substantive ambiguity it surfaced was the now-fixed `provider-linear-worker` wording mismatch.
- [x] `npm run pack:smoke`. Evidence: `✅ pack smoke passed`.

## Delivery
- [ ] Open PR for `CO-12`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence before moving to `In Review`.
- [ ] Merge the latest `origin/main` into the branch before review handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
