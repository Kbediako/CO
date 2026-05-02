# PRD - CO-473 review-wrapper command-surface authoritative-gate env isolation

## Traceability
- Linear issue: `CO-473` / `dc1c7783-0307-4a0a-8dcf-2ede6a889392`
- Linear URL: https://linear.app/asabeko/issue/CO-473
- Task registry id: `20260502-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392`
- MCP Task ID: `linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392`
- Canonical spec: `tasks/specs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`
- Task checklist: `tasks/tasks-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`
- Child lane manifest: `.runs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392-docs-packet/cli/2026-05-02T10-13-30-750Z-22643d24/manifest.json`
- Expected child patch: `.runs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392-docs-packet/cli/2026-05-02T10-13-30-750Z-22643d24/provider-linear-child-lane.patch`
- Source anchor: `ctx:sha256:8605482f091c307d8fc7505b7287a4a4315a06964f7bd7a1789d330806a70534#chunk:c000001`

## Summary
- Problem Statement: clean-main validation previously surfaced a `tests/cli-command-surface.spec.ts` command-surface regression when the provider-worker environment carried `CODEX_REVIEW_AUTHORITATIVE_GATE=1` into the review wrapper noninteractive handoff test. That test intentionally exercises prompt-only noninteractive review handoff with `FORCE_CODEX_REVIEW=0`, while the review wrapper authoritative gate must fail closed under `CODEX_REVIEW_AUTHORITATIVE_GATE=1` unless `FORCE_CODEX_REVIEW=1` executes the real review.
- Desired Outcome: the command-surface regression is isolated from inherited provider-worker environment variables while the review wrapper authoritative gate remains fail closed. Current-main evidence on 2026-05-02 shows the focused repro passes under ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1` because the test subprocess explicitly isolates the gate env.

## User Request Translation
- User intent / needs: create the CO-473 docs-first packet and registry mirrors only. The packet must preserve the exact review-wrapper command-surface contract and record the current-main focused pass evidence without changing CO-468 recovery behavior or weakening authoritative-gate semantics.
- Success criteria / acceptance:
  - `tests/cli-command-surface.spec.ts` preserves equivalent regression coverage for prompt-only noninteractive review handoff.
  - The focused repro passes when invoked with ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1` because the command-surface test isolates `CODEX_REVIEW_AUTHORITATIVE_GATE`, `FORCE_CODEX_REVIEW`, and noninteractive review env for the subprocess.
  - The review wrapper authoritative gate continues to reject prompt-only noninteractive review handoff under `CODEX_REVIEW_AUTHORITATIVE_GATE=1` unless `FORCE_CODEX_REVIEW=1` is set.
  - Provider-worker environment inheritance cannot make a test-local prompt-only handoff look like a production authoritative-gate success.
  - CO-468 recovery changes remain out of scope.
- Constraints / non-goals:
  - this child lane edits docs/task packet files and registry mirrors only
  - no CO-468 recovery changes
  - no weakened authoritative-gate fail-closed semantics
  - no treating prompt-only handoff as success under authoritative gate
  - no deletion of equivalent regression coverage
  - no Linear or GitHub lifecycle mutations from this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CODEX_REVIEW_AUTHORITATIVE_GATE=1`
  - `FORCE_CODEX_REVIEW=1`
  - `prompt-only noninteractive review handoff`
  - `command-surface regression`
  - `tests/cli-command-surface.spec.ts`
  - `review wrapper authoritative gate`
  - `provider-worker environment`
  - `clean-main repro`
- Protected artifact and surface names:
  - `CODEX_REVIEW_AUTHORITATIVE_GATE=1`
  - `FORCE_CODEX_REVIEW=1`
  - `prompt-only noninteractive review handoff`
  - `tests/cli-command-surface.spec.ts`
  - `codex-orchestrator review`
  - `CODEX_REVIEW_NON_INTERACTIVE`
  - `CODEX_NON_INTERACTIVE`
  - `CODEX_NO_INTERACTIVE`
  - `CODEX_NONINTERACTIVE`
  - `CO-468`
- Nearby wrong interpretations to reject:
  - changing CO-468 recovery or provider-worker recover/relaunch/nudge behavior
  - making `CODEX_REVIEW_AUTHORITATIVE_GATE=1` accept prompt-only handoff without `FORCE_CODEX_REVIEW=1`
  - deleting the command-surface regression instead of isolating its subprocess environment
  - treating a test-only env override as a production review-wrapper behavior change
  - broad provider-worker environment scrubbing outside the focused review wrapper command-surface case
  - reclassifying prompt-only noninteractive handoff as terminal review success under the authoritative gate

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Command-surface regression | `tests/cli-command-surface.spec.ts` contains a noninteractive review handoff case that launches `codex-orchestrator review` through the CLI shell. | The case exercises prompt-only noninteractive handoff and should not inherit production authoritative-gate env. | The test explicitly isolates review env so ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1` does not contaminate the subprocess. | Deleting the case or replacing it with a weaker snapshot-only assertion. |
| Review wrapper authoritative gate | `CODEX_REVIEW_AUTHORITATIVE_GATE=1` must fail closed for prompt-only handoff unless `FORCE_CODEX_REVIEW=1` runs the authoritative review. | Provider-worker review gates require terminal review telemetry, not prompt-only text. | CO-473 preserves fail-closed semantics and tests only the non-authoritative handoff mode under isolated env. | Allowing prompt-only handoff to satisfy authoritative gates. |
| Provider-worker environment | Provider-worker lanes can carry review env such as `CODEX_REVIEW_AUTHORITATIVE_GATE=1`. | Ambient provider-worker env should not silently alter unrelated command-surface regression intent. | The regression pins the subprocess env to its intended non-authoritative mode. | Broad env scrub across provider-worker launch surfaces. |
| Clean-main repro | CO-468 found a clean-main failure under inherited `CODEX_REVIEW_AUTHORITATIVE_GATE=1`. | Baseline blockers should be split to canonical owner issues instead of widening adjacent lanes. | Current-main focused repro passes under ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1`, proving env isolation. | Reopening CO-468 recovery implementation or claiming full-suite validation from a focused repro. |
| `FORCE_CODEX_REVIEW=1` | Authoritative review execution requires force when the wrapper is otherwise in noninteractive prompt-only handoff mode. | Prompt-only handoff is acceptable only outside authoritative-gate contexts. | CO-473 keeps `FORCE_CODEX_REVIEW=1` as the explicit authoritative execution switch. | Treating `FORCE_CODEX_REVIEW=0` plus prompt-only output as authoritative success. |

## Current Evidence
- 2026-05-02 current-main focused command passed in this child workspace:
  - `CODEX_REVIEW_AUTHORITATIVE_GATE=1 npx vitest run tests/cli-command-surface.spec.ts -t "launches review via the CLI shell in non-interactive handoff mode"`
  - Result: 1 file passed, 1 test passed, 120 skipped.
- The focused pass is meaningful because the test subprocess pins `CODEX_REVIEW_AUTHORITATIVE_GATE=0`, `FORCE_CODEX_REVIEW=0`, and noninteractive review env to `0` for the command-surface handoff case while the parent shell carries ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1`.

## Not Done If
- `tests/cli-command-surface.spec.ts` can still fail on current main solely because a provider-worker shell inherited `CODEX_REVIEW_AUTHORITATIVE_GATE=1`.
- `CODEX_REVIEW_AUTHORITATIVE_GATE=1` accepts prompt-only noninteractive review handoff as authoritative success.
- The fix removes or weakens equivalent command-surface regression coverage.
- CO-468 recovery behavior is changed by this lane.
- The packet omits `CODEX_REVIEW_AUTHORITATIVE_GATE=1`, `FORCE_CODEX_REVIEW=1`, `prompt-only noninteractive review handoff`, `tests/cli-command-surface.spec.ts`, or clean-main repro evidence.

## Goals
- Preserve the exact review-wrapper command-surface issue shape before any parent closeout or code handoff.
- Record the current-main focused pass evidence under ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1`.
- Keep authoritative-gate fail-closed semantics and provider-worker environment isolation distinct.
- Register the CO-473 packet in task and docs-freshness mirrors.

## Non-Goals
- No implementation, source, test, package, Linear, PR, workpad, or provider-worker lifecycle edits from this child lane.
- No CO-468 recovery changes.
- No review wrapper semantic weakening.
- No deletion of command-surface regression coverage.
- No broad provider-worker environment redesign.

## Stakeholders
- Product: CO operators who need truthful review handoff gates during provider-worker lanes.
- Engineering: review wrapper, CLI command-surface, provider-worker validation, and docs-freshness maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - focused current-main command passes under ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1`
  - command-surface regression still checks prompt-only noninteractive handoff behavior
  - authoritative gate remains fail closed without `FORCE_CODEX_REVIEW=1`
- Guardrails / Error Budgets:
  - zero CO-468 source changes
  - zero prompt-only authoritative successes
  - zero deletion of equivalent regression coverage
  - zero Linear/GitHub lifecycle mutations from this child lane

## Technical Considerations
- Architectural Notes:
  - The command-surface regression should isolate subprocess env near the test invocation, not alter production review-wrapper behavior.
  - The authoritative gate should remain a production/provider-worker safety guard that requires terminal review telemetry.
  - Any future parent source change should be no broader than necessary to preserve test-local env isolation or restore equivalent coverage.
- Dependencies / Integrations:
  - `tests/cli-command-surface.spec.ts`
  - `codex-orchestrator review`
  - review wrapper authoritative gate env
  - provider-worker environment
  - current-main validation evidence

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Command-surface test env | Ambient provider-worker `CODEX_REVIEW_AUTHORITATIVE_GATE=1` contaminates a prompt-only noninteractive review handoff regression | `remove fallback` | CO-473 | Focused command-surface test is launched from a shell with authoritative-gate env set. | observed 2026-05-01 | N/A after removal | N/A after removal | Test subprocess pins non-authoritative env and passes under ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1`. | `CODEX_REVIEW_AUTHORITATIVE_GATE=1 npx vitest run tests/cli-command-surface.spec.ts -t "launches review via the CLI shell in non-interactive handoff mode"` passed on 2026-05-02. |
| Prompt-only noninteractive handoff | Prompt-only handoff remains supported only outside authoritative review gates | `justify retaining fallback` | review wrapper authoritative gate | Direct/manual noninteractive review wrapper invocation without authoritative-gate requirements. | existing review-wrapper contract | 2026-05-02 | Non-expiring supported non-authoritative handoff mode | Replace only if the review wrapper removes prompt-only noninteractive handoff entirely. | Command-surface regression covers prompt-only handoff with authoritative gate explicitly isolated off. |
| Authoritative review execution | `FORCE_CODEX_REVIEW=1` remains the explicit execution switch under `CODEX_REVIEW_AUTHORITATIVE_GATE=1` | `justify retaining fallback` | review wrapper authoritative gate | Provider-worker or gate lane requires terminal authoritative review evidence. | existing review-wrapper contract | 2026-05-02 | Non-expiring safety contract | Replace only with a stronger terminal-review execution contract. | Authoritative gate tests/review wrapper behavior must continue to fail closed for prompt-only handoff. |

- Durable retention evidence: prompt-only noninteractive handoff is retained as a supported non-authoritative command-surface mode, but it is not authoritative review evidence when `CODEX_REVIEW_AUTHORITATIVE_GATE=1` is active.
- Large-refactor check: a broad review-wrapper or provider-worker environment refactor is not justified by the current evidence because the current-main focused repro passes with test-local env isolation. If future failures show multiple review-wrapper tests or provider-worker launch paths inheriting incompatible authoritative env, stop and relaunch with widened ownership.

## Open Questions
- Parent should decide whether CO-473 closes as docs/evidence-only after current-main proof or requires a narrow follow-up source assertion beyond the existing command-surface env isolation.

## Approvals
- Product: Linear CO-473, pending parent review
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
