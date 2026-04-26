# PRD - CO: harden cloud preflight command spawn ETXTBSY handling

## Added by Bootstrap 2026-04-25

## Traceability
- Linear issue: `CO-372` / `12ae0840-e4dc-4181-8db6-2fdf02ef270b`
- Linear URL: https://linear.app/asabeko/issue/CO-372/co-harden-cloud-preflight-command-spawn-etxtbsy-handling

## Summary
- Problem Statement: PR #656 / CO-354 Core Lane run `24931102291`, job `73008894727`, hit a synchronous `spawn ETXTBSY` from `orchestrator/src/cli/utils/cloudPreflight.ts:61:19` while running `orchestrator/tests/CloudPreflight.test.ts`. Local focused reruns passed, making this a noisy OS-level spawn race rather than a CO-354 logic failure.
- Desired Outcome: harden the cloud preflight command wrapper so synchronous `spawn(...)` failures are shaped into the existing unavailable issue path, with focused regression coverage proving `ETXTBSY` or an equivalent synchronous spawn throw no longer escapes `runCloudPreflight`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete CO-372 in this workspace by fixing `runCommand` / `runCloudPreflight` handling for synchronous command-spawn failures while preserving current cloud preflight classifications and the Core Lane signal.
- Success criteria / acceptance:
  - synchronous `spawn(...)` failures from cloud preflight return a structured preflight issue instead of throwing out of `runCloudPreflight`
  - regression coverage proves the `ETXTBSY` / synchronous-spawn shape is handled
  - existing success, environment-not-found, and unavailable classifications stay unchanged
  - targeted validation and review handoff gates are recorded
- Constraints / non-goals:
  - do not weaken cloud preflight environment-id validation
  - do not change CO-354 doctor/default/init behavior
  - do not skip `CloudPreflight.test.ts`
  - do not broaden into cloud execution or canary policy

## Intent Checksum
- Exact user wording / phrases to preserve: `ETXTBSY`, `spawn`, `runCloudPreflight`, `runCommand`, `cloudPreflight.ts`, `CloudPreflight.test.ts`, `codex_unavailable`, `Core Lane`, `PR #656`, `run 24931102291`, `job 73008894727`.
- Protected terms / exact artifact and surface names: `orchestrator/src/cli/utils/cloudPreflight.ts`, `orchestrator/tests/CloudPreflight.test.ts`, `codex_unavailable`.
- Nearby wrong interpretations to reject:
  - this is not a CO-354 `multi_agent_v2` configuration bug
  - this is not a request to weaken cloud preflight pass/fail semantics
  - this is not a request to hide real cloud environment failures

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth: asynchronous child-process `error` events are shaped by `runCommand`, but a synchronous `spawn(...)` throw can escape before the handler is attached.
- Reference truth: other command-unavailable failures become structured preflight issues such as `codex_unavailable`.
- Target truth / intended delta: synchronous spawn failures follow the same unavailable classification path as other command-start failures.
- Explicitly out-of-scope differences: branch existence checks, environment-id requirements, doctor/default/init behavior, and cloud canary policy.

## Not Done If
- `runCloudPreflight` can still throw on a synchronous `spawn ETXTBSY` from the command wrapper.
- The regression test only proves an asynchronous child `error` event and not a synchronous spawn throw.
- `missing_environment`, success, environment-not-found, or existing unavailable classifications change without explicit issue scope.
- The fix masks real cloud preflight failures or skips the affected test file.

## Goals
- Capture synchronous spawn failures inside `runCommand` and resolve a command result instead of throwing.
- Keep the resolved failure compatible with current `codex_unavailable` / unavailable classification behavior.
- Add focused coverage for a representative synchronous `spawn` throw, preferably `ETXTBSY`.
- Preserve existing cloud preflight behavior outside the spawn-start race.

## Non-Goals
- Changing Codex CLI version posture or CO-354 defaults/doctor/init logic.
- Reworking cloud route fallback, cloud canary policy, or branch/environment validation.
- Broad child-process abstraction work outside `cloudPreflight.ts`.
- Skipping or weakening `CloudPreflight.test.ts`.

## Stakeholders
- Product: CO operator relying on Core Lane signal stability.
- Engineering: Codex.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - focused `CloudPreflight.test.ts` coverage passes with a synchronous `spawn ETXTBSY` regression
  - existing cloud preflight success, missing environment, not-found, and unavailable expectations remain green
- Guardrails / Error Budgets:
  - no cloud preflight validation weakening
  - no CO-354 behavior changes
  - no broad refactor beyond the command wrapper and focused tests

## User Experience
- Personas: CO maintainers and provider workers who need cloud preflight failures to be actionable rather than noisy CI crashes.
- User Journeys:
  - a Core Lane run encounters a transient OS-level `spawn ETXTBSY` race and reports a shaped unavailable preflight issue instead of an unhandled throw
  - an engineer reviewing cloud preflight tests can see the synchronous-spawn regression pinned directly

## Technical Considerations
- Architectural Notes:
  - `runCommand` currently constructs the child process before installing `error` and `close` handlers, so synchronous throws need a local `try`/`catch` around `spawn(...)`
  - `runCloudPreflight` already classifies a non-zero Codex CLI command result as `codex_unavailable`
  - test coverage may need a spawn mock or injection seam that stays scoped to `CloudPreflight.test.ts`
- Dependencies / Integrations:
  - `orchestrator/src/cli/utils/cloudPreflight.ts`
  - `orchestrator/tests/CloudPreflight.test.ts`
  - existing Vitest test harness

## Open Questions
- Whether the focused regression can mock `node:child_process` cleanly without introducing a production-only test seam. Parent implementation should prefer the smallest local pattern that fits existing tests.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria.
- Engineering: Parent provider worker manual docs-review fallback approved implementation after unrelated CO-276 docs:check baseline failure; implementation validation, standalone review, and elegance pass still pending.
- Design: N/A.
