---
id: 20260424-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a
title: CO Codex CLI 0.123.0 Posture And Marketplace Command Surface Correction
relates_to: docs/PRD-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md
risk: high
owners:
  - Codex
last_review: 2026-04-24
---

## Summary
- Objective: register CO-337 as the bounded `0.123.0` posture-and-command-surface lane so CO can correct the false marketplace assumption and make an evidence-backed release-pin decision.
- Scope: official/local/versioned command evidence, marketplace capability detection/invocation, docs/message refresh, workflow pin rationale, and `rust-v0.123.0` delta classification.
- Constraints: keep `0.118.0` active unless runtime/cloud evidence clears promotion, keep `pack:smoke` fail-closed, and keep cloud-canary requirements unchanged.

## Issue-Shaping Contract
- User-request translation carried forward: CO-337 is not a blind version bump. Parent must first prove the current command-surface truth, then update CO's marketplace capability logic/docs/workflow rationale so the downstream pin decision is based on the corrected surface.
- Protected terms / exact artifact and surface names: Codex CLI `0.123.0`, Codex CLI `0.122.0`, Codex CLI `0.121.0`, Codex CLI `0.118.0`, `rust-v0.123.0`, `codex plugin marketplace add`, `codex marketplace add`, `pack:smoke`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `docs/guides/codex-version-policy.md`, `README.md`, `docs/public/downstream-setup.md`, `plugins/codex-orchestrator/launcher.mjs`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/cloud-canary.yml`, `node scripts/runtime-mode-canary.mjs`, `CODEX_CLOUD_ENV_ID`, `remote_sandbox_config`.
- Nearby wrong interpretations to reject: `0.122.0+` has no marketplace-compatible surface, active target should jump to `0.123.0` automatically, fail-closed marketplace smoke should be weakened, cloud-canary can be loosened, or the issue should reopen CO-196 packaging scope.
- Explicit non-goals carried forward: no automatic target promotion, no cloud-gate weakening, no provider-worker runtime migration, no broad Bedrock adoption work unless the audit proves a CO-specific need.

## Parity / Alignment Matrix
- Current truth:
  - local `codex-cli 0.123.0` exposes `plugin` top-level and rejects `codex marketplace add`
  - CO still treats `codex marketplace add` as the required marketplace prerequisite in pack-smoke/docs/workflow rationale
  - release-facing downstream-smoke workflows remain pinned to `@openai/codex@0.121.0`
- Reference truth:
  - official `rust-v0.123.0` release notes list the relevant deltas for this lane
  - `0.121.0` supports both marketplace command paths
  - `0.122.0` and `0.123.0` support `codex plugin marketplace add`
- Target truth:
  - `scripts/pack-smoke.mjs` detects and uses the supported marketplace add path truthfully
  - tests/docs/messages describe the relocated command surface accurately
  - workflow pins are retained or changed with explicit corrected-surface evidence
- Out-of-scope differences:
  - active target promotion without fresh runtime/cloud evidence
  - broad plugin UX redesign
  - unrelated provider-worker runtime changes

## Readiness Gate
- Not done if: corrected marketplace truth is absent, the downstream pin decision is still justified by the stale assumption, or the lane stops at narrative analysis without code/test/doc updates.
- Pre-implementation issue-quality review evidence: approved for docs-first packet plus parent-owned implementation because correctness depends on exact command names, exact workflow surfaces, and explicit release-note classification.
- Safeguard ownership split: parent owns packet files, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, workflow files, and validation evidence. Child lane owns only `README.md`, `docs/public/downstream-setup.md`, `docs/guides/codex-version-policy.md`, and `plugins/codex-orchestrator/launcher.mjs` until accept/reject.

## Technical Requirements
- Functional requirements:
  1. Capture official `rust-v0.123.0` release facts and local `0.123.0` command/help evidence with timestamps.
  2. Record marketplace command truth for `0.121.0`, `0.122.0`, and `0.123.0`, including the top-level-to-plugin-path transition.
  3. Update `scripts/pack-smoke.mjs` capability detection and invocation so it can use the supported marketplace add path for the installed Codex.
  4. Update `tests/pack-smoke.spec.ts` to preserve fail-closed behavior while reflecting the corrected marketplace truth and workflow pin policy.
  5. Refresh user-facing docs/messages in the delegated docs slice.
  6. Classify the `rust-v0.123.0` deltas into adopt / hold / no-op buckets for CO, including `codex exec` shared-flag inheritance, `remote_sandbox_config`, `.mcp.json` shape compatibility, and review transcript cleanup.
  7. Keep or change release-facing workflow pins only after rerunning workflow-matched marketplace smoke against at least one post-`0.121.0` candidate.
- Non-functional requirements (performance, reliability, security):
  - marketplace detection remains fail-closed when neither supported command path exists
  - workflow proofs remain deterministic through explicit pinned install steps
  - docs/messages remain truthful across current supported CLIs
- Interfaces / contracts:
  - `scripts/pack-smoke.mjs` pack smoke contract
  - `tests/pack-smoke.spec.ts` workflow/policy assertions
  - workflow install steps in `core-lane`, `release`, `pack-smoke-backstop`, and `cloud-canary`
  - current posture contract in `docs/guides/codex-version-policy.md`

## Architecture & Data
- Architecture / design adjustments:
  - add a marketplace command-resolution helper that probes supported add paths in order and returns the actual invocation contract
  - preserve current skip/fail semantics, but change the unsupported message from “requires `marketplace add`” to “requires a supported marketplace add surface”
  - keep workflow policy separation explicit between release-facing smoke and cloud-canary
- Data model changes / migrations: none
- External dependencies / integrations: official GitHub release page, local `codex` CLI, `npx @openai/codex@<version>` repros, npm install steps in GitHub Actions workflows

## Validation Plan
- Tests / checks:
  - create/update task packet and run `linear child-stream --pipeline docs-review`
  - rerun targeted `vitest` for `tests/pack-smoke.spec.ts`
  - rerun workflow-matched `npm run pack:smoke` against a post-`0.121.0` candidate
  - run the repo validation floor required for the final diff
  - run standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - verify final docs/messages/workflow policy all cite the same corrected marketplace truth
  - verify active-target hold/promotion language still matches runtime/cloud evidence
- Monitoring / alerts:
  - existing pack-smoke, docs hygiene, review-wrapper, and workflow assertions only

## Open Questions
- Does corrected `pack:smoke` on `0.122.0` or `0.123.0` still leave another release-facing blocker that justifies `0.121.0` pins?
- Is `remote_sandbox_config` a docs-only hold for CO today, or does it require a follow-up operational packet?

## Approvals
- Reviewer: pending parent docs-review and implementation review.
- Date: 2026-04-24
