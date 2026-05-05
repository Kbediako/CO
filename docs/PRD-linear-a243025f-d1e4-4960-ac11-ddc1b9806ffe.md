# PRD - CO-462 run-review override-prefixed mock cleanup

## Traceability
- Linear issue: `CO-462` / `a243025f-d1e4-4960-ac11-ddc1b9806ffe`
- Linear URL: https://linear.app/asabeko/issue/CO-462/co-clean-up-run-review-mock-processes-with-config-overrides-before
- Task registry id: `20260505-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe`
- MCP Task ID: `linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe`
- Canonical spec: `tasks/specs/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- Task checklist: `tasks/tasks-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- Source anchor: `ctx:sha256:e3b40af6e404697c60cd43d7e91ea7a900dbdb13c2c2d451918c05e4ca044a3f#chunk:c000001`
- Source payload: `.runs/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe/cli/2026-05-05T04-30-40-349Z-d04f2132/memory/source-0/source.txt`
- Follow-up reference: `CO-205`

## Summary
- Problem Statement: CO-205 fixed the base `codex-mock.sh review` orphan class, but current process evidence shows the test cleanup can still miss review mocks launched as `codex-mock.sh -c mcp_servers.delegation.enabled=true review ...`.
- Desired Outcome: add focused coverage and cleanup matching so both direct and override-prefixed run-review mock processes are terminated after the test harness exits, while unrelated user processes remain untouched.

## User Request Translation
- User intent / needs: complete CO-462 in the current provider-worker workspace by fixing the run-review test harness cleanup variant where config overrides appear before the `review` subcommand.
- Success criteria / acceptance:
  - a regression launches the fake Codex review harness with `-c ... review`
  - cleanup finds direct `codex-mock.sh review` and override-prefixed `codex-mock.sh -c ... review` shapes
  - cleanup remains exact-path and review-subcommand scoped
  - a process-health scan after the focused suite shows no stale `codex-mock.sh` review mocks
  - the packet and implementation describe this as a CO-205 follow-up variant, not a provider-worker admission blocker
- Constraints / non-goals:
  - no live provider-worker admission changes
  - no broad process supervisor rewrite
  - no manual host orphan cleanup as completion
  - no cleanup of unrelated user Codex or shell processes

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `codex-mock.sh -c mcp_servers.delegation.enabled=true review`
  - `config overrides before review`
  - `PPID=1`, `PGID=PID`
  - `CO-205`
- Protected terms / exact artifact and surface names:
  - `run-review`
  - `tests/run-review.spec.ts`
  - `codex-mock.sh`
  - `-c mcp_servers.delegation.enabled=true review`
  - `process-health checks`
  - `CO-205`
- Nearby wrong interpretations to reject:
  - treating this as provider-worker admission, live worker cancellation, or queue recovery
  - hiding stale process-health output instead of fixing cleanup
  - killing every process whose command line contains `codex-mock.sh`
  - widening into generic child-process supervision

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Direct review mock | CO-205 coverage handles `codex-mock.sh review`. | Direct shape is the base cleanup contract. | Preserve direct cleanup behavior. | No regression of CO-205. |
| Override-prefixed review mock | Current cleanup can miss `codex-mock.sh -c ... review`. | Codex CLI supports config overrides before subcommands. | Cleanup recognizes override-prefixed review mocks for the exact fake binary. | No generic Codex CLI process cleanup. |
| Cleanup safety | Test helper must avoid unrelated user processes. | CO-205 scoped cleanup to exact sandbox fake binary paths. | Keep exact-path matching and require `review` after config override flags. | No pathless or basename-only process matching. |
| Process-health proof | Orphaned mocks create false process-health alarms. | Passive `ps` scans should remain truthful. | Post-test scan shows no stale review mocks from the focused suite. | No masking or filtering of health output. |

## Not Done If
- The regression only covers direct `codex-mock.sh review`.
- Cleanup still misses `codex-mock.sh -c mcp_servers.delegation.enabled=true review`.
- Cleanup can target unrelated user processes or different fake binaries.
- Process-health proof is omitted after the focused suite exits.
- The work is reframed as provider-worker admission or queue recovery.

## Goals
- Create CO-462 docs-first packet and task mirrors.
- Add focused override-prefixed mock cleanup regression coverage.
- Tighten the existing test cleanup helper without broad runtime changes.
- Validate focused tests and passive process-health scan.

## Non-Goals
- No provider-worker admission, Linear polling, or queue-capacity changes.
- No broad process supervisor or run-review runtime refactor.
- No manual cleanup of currently observed host processes as the fix.
- No cleanup of real user review processes.

## Metrics & Guardrails
- Primary Success Metrics:
  - focused run-review regression passes
  - post-suite `ps` scan returns no stale `codex-mock.sh` review mocks for this lane
  - changed files remain limited to docs packet plus focused test/helper surfaces unless source inspection proves otherwise
- Guardrails / Error Budgets:
  - zero broad process matching by basename alone
  - zero provider-worker lifecycle behavior changes
  - zero hidden process-health output

## Technical Considerations
- Architectural Notes:
  - Existing cleanup is test-harness local in `tests/run-review.spec.ts`.
  - The safe fix is likely command-line token matching for supported Codex config flags before the `review` subcommand while retaining exact fake-binary path matching.
- Dependencies / Integrations:
  - CO-205 packet and test helper shape
  - local `ps -axww -o pid=,pgid=,command=` process inspection
  - `runReviewCommandSubprocess` cleanup finalizer

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor check: a larger process-supervisor refactor is not preferred because this lane fixes one missed test-harness command shape while preserving the established exact-path cleanup boundary.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tests/run-review.spec.ts` mock cleanup matching | Stale direct-only match misses config overrides before `review`. | remove fallback | CO-462 | Override-prefixed fake Codex review mock can survive cleanup. | CO-205 follow-up variant | 2026-05-05 | N/A after removal | Direct and override-prefixed mock cleanup regression passes. | Focused run-review test and process-health scan. |
| Exact fake-binary process cleanup | Test cleanup only targets exact sandbox `codex-mock.sh` review commands. | justify retaining fallback | CO-205 / CO-462 | Tests intentionally spawn hanging fake Codex review processes. | 2026-04-16 | 2026-05-05 | Supported test harness behavior, not temporary fallback. | N/A; retain to keep tests from leaking processes. | Safety assertion and exact-path command matching. |

## Open Questions
- None for implementation; source inspection decides the smallest helper change.

## Approvals
- Product: Linear CO-462
- Engineering: provider worker docs-review and implementation review pending
- Design: N/A
