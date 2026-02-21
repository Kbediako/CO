---
id: 20260221-0977-shipped-feature-adoption-guidance
title: Shipped Feature Adoption Guidance Hardening
relates_to: tasks/tasks-0977-shipped-feature-adoption-guidance.md
risk: medium
owners:
  - Codex
last_review: 2026-02-21
---

## Summary
- Objective: increase effective use of shipped CO capabilities (flow/cloud/RLM) through low-noise guidance integrated into command help, runtime text output, and shipped skill instructions.
- Scope: help quickstart guidance, runtime adoption hints on `start`/`flow` text mode, `doctor --usage` recommendation de-duplication, and shipped skills alignment.
- Constraints: additive-only behavior, preserve JSON contracts, no execution-semantics changes for cloud/RLM engines.

## Decision and Success Criteria
- Decision: ship a minimal option set from delegated research/review:
  1) help quickstart blocks;
  2) runtime hints for `start`/`flow` text mode only;
  3) cloud recommendation de-duplication in `doctor --usage`;
  4) shared guidance snippet in shipped skills.
- Success criteria:
  - Help output includes explicit quickstart usage path.
  - Text-mode `start`/`flow` can emit at most one hint when relevant.
  - JSON/JSONL outputs remain unchanged (no hint leakage).
  - Mock simulation demonstrates stable hint precision and no output-contract regressions.

## Technical Requirements
- Functional requirements:
  - Add a concise quickstart block in `printHelp`, `printStartHelp`, and `printFlowHelp` covering:
    - docs-first flow command
    - usage posture check command
    - RLM multi-agent command
    - cloud readiness command
  - Introduce a shared hint emitter for runtime run commands:
    - source from `runDoctorUsage({ windowDays: 7, taskFilter })`
    - emit only first recommendation
    - emit only for text mode and only when status is non-terminal success path for `start`/`flow`
    - fail-open on scanner/hinting errors
  - De-duplicate cloud recommendation messages in `orchestrator/src/cli/doctorUsage.ts` so `cloud configured + zero cloud runs` does not produce redundant near-duplicate messages.
  - Update shipped skills (`docs-first`, `delegation-usage`, `collab-subagents-first`) with a shared "global adoption defaults" snippet.
- Non-functional requirements:
  - No measurable command latency regression beyond lightweight usage scan in eligible paths.
  - Preserve deterministic recommendation ordering.
  - Keep added help/hint messaging concise.
- Interfaces / contracts:
  - No changes to JSON schemas in CLI command outputs.
  - No breaking flag or command surface changes.

## Architecture & Data
- Architecture / design adjustments:
  - `bin/codex-orchestrator.ts`: new reusable adoption hint helper for run commands and help text additions.
  - `orchestrator/src/cli/doctorUsage.ts`: recommendation hygiene adjustment.
  - `skills/*/SKILL.md`: guidance alignment.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - None.

## Simulation-First Validation Requirements
- Use isolated dummy repos/workdirs only (no production path mutations).
- Scenario matrix must include:
  - low adoption (no cloud/RLM runs)
  - mixed adoption (some cloud, no RLM)
  - high adoption (hints should be suppressed)
  - JSON output invocations (no hint leakage)
- Collect measurable outcomes:
  - hint emission rate (eligible text runs)
  - false hint rate (hints emitted when posture already healthy)
  - JSON contamination rate (must be 0)
  - incremental latency overhead (target low; no user-visible regression)

## Rollout and Rollback
- Rollout phases:
  1) docs + simulation proof
  2) minimal implementation + tests
  3) dogfood on CO and at least one non-CO local codebase snapshot
- Stop/rollback conditions:
  - any JSON output regression
  - hint spam (more than one hint per eligible run)
  - failing required validation chain

## Validation Plan
- Tests / checks:
  - update `tests/cli-command-surface.spec.ts` for:
    - root help quickstart coverage
    - start/flow help quickstart coverage
    - unknown-command help fallback
    - JSON-mode no-hint contract
    - text-mode hint emission behavior
  - add/adjust `orchestrator/tests/DoctorUsage.test.ts` for dedupe behavior.
  - run required repo validation sequence.
- Rollout verification:
  - run simulation scripts/commands in dummy repos and archive evidence under `out/0977-shipped-feature-adoption-guidance/manual/`.
- Monitoring / alerts:
  - rely on `doctor --usage` output and simulation artifacts for this slice.

## Dogfood Outcomes (2026-02-21)
- `tower-defence` usage (30d): runs=96, cloud=0, rlm=0, advanced_share=0%.
- `CO-0958-ui` usage (30d): runs=9, cloud=0, rlm=0, advanced_share=0%.
- `CO` usage (30d): runs=258, cloud=8, rlm=26, advanced_share=16.3%.
- Interpretation: non-CO repos remain under-adopted for cloud/RLM; shipped guidance changes in this task target exactly this gap.

## Post-Dogfood Next Steps
1. Continue dogfood for 1-2 weeks on `tower-defence` and `CO-0958-ui`.
2. Re-run `doctor --usage` (14d and 30d windows) and compare cloud/RLM deltas.
3. If adoption remains flat, queue small guidance-only follow-up examples; keep Option 3 implementation out of scope.

## Open Questions
- Should hint emission be extended to `resume` in a follow-up task if dogfood shows positive signal?

## Approvals
- Reviewer: user
- Date: 2026-02-21
