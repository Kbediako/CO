# ACTION_PLAN - CO: Recover frontend-test CLI from pre-manifest hang under ts-node entrypoint

## Added by Bootstrap 2026-04-10

## Summary
- Goal: restore deterministic manifest-backed `frontend-test` completion under the live source `ts-node/esm` entrypoint.
- Scope:
  - docs-first packet, registry mirrors, and saved workpad source
  - audited docs-review child stream
  - focused hang reproduction in the suite and direct CLI path
  - minimal startup-seam fix plus focused validation evidence
- Assumptions:
  - the failing seam is above manifest creation and therefore isolatable without broad frontend pipeline changes
  - the existing `frontend-testing` runner contract is largely correct once startup reaches it

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `tests/cli-frontend-test.spec.ts`, `frontend-test`, `bin/codex-orchestrator.ts frontend-test --format json`, `pre-manifest hang`, `node --loader ts-node/esm`
- Not done if:
  - the focused suite still times out
  - direct CLI repros still hang before manifest creation
  - the only change is timeout inflation instead of a seam fix
- Pre-implementation issue-quality review:
  - the issue is already bounded to a single CLI surface and explicit failing artifacts, so a focused bootstrap/debugging pass is the truthful next move rather than a broader provider or frontend lane.

## Milestones & Sequencing
1. Draft the `CO-128` docs packet, registry mirrors, and local workpad source.
2. Run an audited `linear child-stream --pipeline docs-review` pass and record the result before implementation.
3. Reproduce the hang in `tests/cli-frontend-test.spec.ts` and the direct `node --loader ts-node/esm ... frontend-test --format json` path, then isolate the pre-manifest seam.
4. Implement the smallest fix and rerun the focused validation set from the issue.
5. Run standalone review and an explicit elegance/minimality pass before any PR or review handoff.

## Dependencies
- `tests/cli-frontend-test.spec.ts`
- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/frontendTestCliRequestShell.ts`
- `orchestrator/src/cli/frontendTestCliShell.ts`

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - `npm run test -- tests/cli-frontend-test.spec.ts`
  - manual `frontend-test --format json` repro under `node --loader ts-node/esm`
  - focused adjacent smoke only if the chosen seam needs it
- Rollback plan:
  - revert the startup-seam change if the focused suite or manual repro still fails and reopen investigation from the saved reproduction output

## Risks & Mitigations
- Risk: the stall is in a lower runner path rather than bootstrap.
  - Mitigation: save direct repro output and stop once manifest creation proves where control reaches.
- Risk: reproducing under provider-owned env leaks a different config surface than the focused suite expects.
  - Mitigation: use the same isolated/fake-`CODEX_CLI_BIN` harness assumptions as the focused test and keep provider env stripped.
- Risk: the fix drifts into generic runtime cleanup.
  - Mitigation: create a follow-up issue for any broader improvement discovered during root-cause work.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-10
