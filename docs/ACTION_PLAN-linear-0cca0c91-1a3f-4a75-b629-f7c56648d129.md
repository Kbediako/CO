# ACTION_PLAN - CO: harden marketplace pack:smoke coverage after CO-196

## Added by Bootstrap 2026-04-18

## Summary
- Goal: ensure `npm run pack:smoke` and relevant CI/release workflows cannot silently miss Codex marketplace install/register coverage after `CO-196`.
- Decision: marketplace smoke is mandatory by default; any skip requires an explicit env/flag opt-out with documented allowed use and reason evidence.
- Scope: accepted docs-first packet and registry mirrors, pack-smoke prerequisite hardening, focused validation, workflow posture tests, release-guide documentation, Linear state, workpad, PR, and merge.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `npm run pack:smoke`
  - Codex marketplace install/register coverage
  - `Codex 0.121+ marketplace support`
  - CI/release workflow posture
  - `CO-196`
  - explicit env/flag opt-out with documented allowed use
- Not done if:
  - pack-smoke can pass without marketplace coverage and without explicit allowed opt-out
  - CI/release workflows can silently miss marketplace smoke
  - the solution replaces the `CO-196` local validation proof
  - the scope broadens into release-pipeline, guardrail, delegation, or runtime-mode refactors
- Pre-implementation issue-quality review:
  - 2026-04-18: the issue is not a generic release hardening request. Correctness depends on the exact `npm run pack:smoke`, marketplace install/register, `Codex 0.121+`, `CO-196`, and CI/release posture terms, so the micro-task path is ineligible.

## Milestones & Sequencing
1. Create the docs-first packet and registry mirrors for `CO-217`.
2. Parent imports the patch, confirms the packet in the authoritative workspace, and merges current `origin/main` containing `CO-196`.
3. Parent preserves the existing marketplace install/register scenario and hardens only the prerequisite/skip contract.
4. Parent selects `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1` plus required `PACK_SMOKE_MARKETPLACE_SKIP_REASON=<reason>` as the local-dev opt-out interface and documents allowed uses.
5. Parent pins relevant CI/release workflow posture in focused tests so marketplace smoke cannot be silently absent.
6. Parent validates focused behavior plus `npm run pack:smoke`, then runs review/elegance and PR lifecycle steps.

## Dependencies
- `CO-196` local marketplace validation proof
- `npm run pack:smoke`
- `scripts/pack-smoke.mjs`
- CI/release workflow posture
- `Codex 0.121+ marketplace support`

## Validation
- Child lane checks:
  - protected-term scan across the packet and mirrors
  - JSON parse/registry presence check
- Parent lane checks:
  - docs-review / `node scripts/spec-guard.mjs --dry-run`
  - focused pack-smoke mandatory/opt-out coverage (`npm run test:orchestrator -- tests/pack-smoke.spec.ts`)
  - `npm run pack:smoke` on the final tree
  - relevant CI/release workflow posture review
  - standalone review and elegance/minimality pass
- Rollback plan:
  - revert the narrow pack-smoke/workflow hardening if it blocks unrelated package smoke behavior, while keeping the docs packet if the issue framing remains true
  - never replace `CO-196` proof with a weaker package-only proof during rollback

## Risks & Mitigations
- Risk: marketplace coverage remains optional by omission.
  - Mitigation: make default mandatory behavior and explicit opt-out evidence acceptance criteria.
- Risk: workflow green status hides a skipped marketplace smoke.
  - Mitigation: require fail, visible waiver, or non-coverage evidence when marketplace smoke does not run.
- Risk: the parent broadens into release-pipeline refactors.
  - Mitigation: keep the scope on pack-smoke marketplace assertions plus relevant workflow posture.
- Risk: unsupported Codex versions make marketplace smoke flaky.
  - Mitigation: document Codex `0.121+` as the support boundary and make unsupported-version skips explicit non-coverage evidence.

## Approvals
- Reviewer: ready for PR handoff after docs/spec gates, focused tests, full suite, clean standalone review/elegance, and `npm run pack:smoke`
- Date: 2026-04-18
