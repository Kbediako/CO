# PRD - CO: Recover frontend-test CLI from pre-manifest hang under ts-node entrypoint

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-128` / `1cd22f2a-5a12-4d2f-bc32-8289f4d24be6`
- Linear URL: https://linear.app/asabeko/issue/CO-128/co-recover-frontend-test-cli-from-pre-manifest-hang-under-ts-node
- Source issue: `CO-119` / `da009c42-d0fc-4834-be72-f977a778693c`
- Current workspace branch: `linear/co-128-frontend-test-pre-manifest-hang`
- Local workpad source: `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/workpad.md`

## Summary
- Problem Statement: standalone `frontend-test` is hanging before it writes a manifest when invoked through `node --loader ts-node/esm bin/codex-orchestrator.ts frontend-test --format json`, and `tests/cli-frontend-test.spec.ts` times out all four cases instead of completing with deterministic manifest-backed status.
- Desired Outcome: identify the exact pre-manifest startup seam, fix it without weakening the contract, and restore deterministic completion for both the standalone CLI repro and `tests/cli-frontend-test.spec.ts`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat this as a narrow `frontend-test` bootstrap recovery lane, separate from provider refresh-path recovery, with concrete proof of where the stall occurs before manifest creation.
- Success criteria / acceptance:
  - reproduce the hang in `tests/cli-frontend-test.spec.ts` and with the direct `node --loader ts-node/esm ... frontend-test --format json` CLI entrypoint
  - identify whether the stall is in bootstrap, config resolution, runtime selection, or loader initialization
  - land the smallest fix that makes the command emit a manifest path and terminal status instead of hanging pre-manifest
  - keep focused validation proving the `frontend-test` contract still works
- Constraints / non-goals:
  - do not fold this into CO-119 provider refresh recovery
  - do not paper over the problem by just raising Vitest timeouts
  - do not broaden into unrelated frontend infrastructure cleanup

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `tests/cli-frontend-test.spec.ts`
  - `frontend-test`
  - `bin/codex-orchestrator.ts frontend-test --format json`
  - `pre-manifest hang`
  - `node --loader ts-node/esm`
- Protected terms / exact artifact and surface names:
  - `tests/cli-frontend-test.spec.ts`
  - `bin/codex-orchestrator.ts`
  - `frontend-test`
  - `.runs/.../manifest.json`
  - `CODEX_CLI_BIN`
  - `frontend-testing`
- Nearby wrong interpretations to reject:
  - the CO-119 refresh patch broke frontend behavior
  - this is a generic frontend app behavior bug
  - the right fix is to inflate the suite timeout and move on
  - provider-worker recovery logic is the correct place to absorb the seam

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth: standalone `frontend-test` invoked under `ts-node/esm` hangs before manifest creation, and the focused CLI suite times out.
- Reference truth: `frontend-test --format json` should create a manifest, complete with terminal status, and keep the suite green under the same `ts-node/esm` entry path.
- Target truth / intended delta: restore deterministic startup and manifest emission for the direct CLI path and the focused test harness without changing the intended `frontend-testing` command contract.
- Explicitly out-of-scope differences: provider refresh-path work, generic frontend app behavior, and unrelated CLI cleanup.

## Not Done If
- `tests/cli-frontend-test.spec.ts` still times out in standalone runs.
- A manual `frontend-test --format json` repro still hangs before writing a manifest.
- The only mitigation is a timeout increase with no identified startup seam.

## Goals
- Reproduce the pre-manifest hang in isolation with saved evidence.
- Identify the exact startup seam that stalls before manifest creation.
- Land the smallest fix that restores deterministic `frontend-test` completion.
- Record enough evidence that later workers can distinguish this lane from provider refresh-path recovery.

## Non-Goals
- Reopening or extending CO-119 provider refresh-path work.
- Weakening validation by deleting tests or inflating timeouts without a real fix.
- Broad frontend infrastructure or runtime cleanup outside the reproduced seam.

## Stakeholders
- Product: CO operators blocked by a red focused CLI validation lane
- Engineering: maintainers of CLI bootstrap, runtime selection, and `frontend-testing` pipeline wiring
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `npm run test -- tests/cli-frontend-test.spec.ts` exits `0`
  - direct `frontend-test --format json` reproductions emit a manifest and terminal status
  - the closeout names the actual pre-manifest seam, not just the symptom
- Guardrails / Error Budgets:
  - keep changes bounded to the `frontend-test` CLI/test harness seam
  - create a follow-up issue instead of widening scope if a different subsystem is implicated
  - preserve the intended `frontend-testing` pipeline contract and runtime sanitization behavior

## User Experience
- Personas:
  - provider worker validating a focused CLI lane
  - reviewer checking whether the fix restored real manifest-backed completion
  - maintainer auditing whether the bug lived in bootstrap or the downstream frontend-testing stage
- User Journeys:
  - a focused test run finishes instead of timing out at 30s/60s
  - a manual `frontend-test --format json` repro writes a manifest before exiting
  - a reviewer can see exactly which startup seam was fixed

## Technical Considerations
- Architectural Notes:
  - the bug is explicitly pre-manifest, so the likely seam is above the `frontend-testing` stage body itself
  - the failing path goes through the live source entrypoint under `node --loader ts-node/esm`, not only the built `dist` wrapper
- Dependencies / Integrations:
  - `tests/cli-frontend-test.spec.ts`
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/frontendTestingRunner.ts`
  - `codex.orchestrator.json`

## Open Questions
- Whether the stall is caused by `ts-node/esm` source loading itself or by synchronous bootstrap work performed before the runner command is launched.

## Approvals
- Product: pending
- Engineering: pending docs-review child stream
- Design: N/A
