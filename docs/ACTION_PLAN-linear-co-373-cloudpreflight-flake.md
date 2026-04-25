# ACTION_PLAN - CO-373 CloudPreflight Fake Codex CLI Flake

## Summary
- Goal: remove the CloudPreflight fake CLI flake that is blocking archive automation and CO-361 release continuation.
- Scope: docs-first packet, focused harness fix, validation, PR/CI monitoring, and Linear closeout.
- Assumptions: production `codex --version` failure behavior is correct and must remain `codex_unavailable`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-361`, `CO-373`, `PR #668`, `Core Lane`, `CloudPreflight.test.ts`, `codex_unavailable`, `codex --version`, and `codex cloud list`.
- Not done if: this is handled by rerun only, CloudPreflight product semantics are weakened, or the release is tagged while archive/Core Lane evidence is still blocked.
- Pre-implementation issue-quality review: accepted. The issue is a release-blocking harness stabilization lane, not release-note or package-version work.

## Milestones & Sequencing
1. Create the CO-373 docs/checklist packet and register it in task/docs freshness surfaces.
2. Patch the smallest deterministic fake Codex CLI harness path and keep product unavailable behavior intact.
3. Run focused local and CI-shaped CloudPreflight validation.
4. Open PR, wait for Core Lane, then unblock the archive PR/path and resume CO-361 release tagging only after green evidence.

## Dependencies
- Linear CO-361 remains blocked by CO-373 until the CI flake fix merges.
- GitHub PR #668 is the current observed archive automation failure surface.
- CO-372 synchronous spawn-failure behavior must remain intact.

## Validation
- Checks / tests:
  - `npm run test:core -- orchestrator/tests/CloudPreflight.test.ts`
  - `CI=1 npm run test:core -- orchestrator/tests/CloudPreflight.test.ts`
  - repo-required guard/build/test/docs checks as practical for the patch size
  - PR Core Lane and archive automation follow-up
- Rollback plan: revert the harness patch and keep CO-361 blocked if focused or Core Lane validation shows classification drift.

## Risks & Mitigations
- Risk: product behavior is changed to make tests pass.
  - Mitigation: preserve and rerun unavailable-Codex regression coverage.
- Risk: CI passes only by luck.
  - Mitigation: use a deterministic fixture, then run both normal and `CI=1` focused commands before PR.

## Approvals
- Reviewer: Orchestrator.
- Date: 2026-04-25
