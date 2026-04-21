---
id: 20260421-linear-a2949fd4-2319-4cd0-acd1-68e6404766f3
title: CO Codex CLI 0.122.0 Posture And Explicit Pin Alignment
relates_to: docs/PRD-linear-a2949fd4-2319-4cd0-acd1-68e6404766f3.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
---

## Summary
- Objective: register CO-269 as the `0.122.0` posture-and-pins lane while preserving the predecessor constraints from CO-183, CO-195, CO-199, and CO-207.
- Scope: authoritative issue-body surfaces, explicit posture/pin policy surfaces, and parent-owned validation requirements for the final hold/promote decision.
- Constraints: keep `0.122.0` candidate-only until the required evidence gates pass, keep explicit pin alignment subordinate to the posture decision, and preserve the recorded docs-review fallback for existing repo-baseline docs freshness/spec debt.

## Issue-Shaping Contract
- User-request translation carried forward: CO-269 is a posture-and-pins lane for Codex CLI `0.122.0`, not a blind version bump. Parent must decide posture first, then align explicit pins only if the decision requires it.
- Protected terms / exact artifact and surface names: Codex CLI `0.122.0`, Codex CLI `0.121.0`, Codex CLI `0.118.0`, `rust-v0.122.0`, `rust-v0.121.0`, `@openai/codex`, `codex exec`, `codex exec resume`, `codex review --help`, `codex login --device-auth`, `node scripts/runtime-mode-canary.mjs`, `CODEX_CLOUD_ENV_ID`, `CODEX_CLOUD_CANARY_REQUIRED=1`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `.github/workflows/core-lane.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/release.yml`, `.github/workflows/cloud-canary.yml`, `tests/pack-smoke.spec.ts`, workflow pin policy, CO-183, CO-195, CO-199, CO-207.
- Nearby wrong interpretations to reject: blind `0.122.0` promotion, blind `0.121.0` pin replacement, dropping CO-199 carry-forward, treating CO-207 as reusable `0.122.0` proof without rerun, treating this as the marketplace rebaseline follow-up, broadening into provider-worker app-server migration or remote-control redesign, opening separate tool-search/image-generation/plan-mode issues without evidence, and weakening the required cloud canary gate just to promote the version string.
- Explicit non-goals carried forward: no marketplace command/docs rebaseline here, no provider-worker migration to app-server or exec-server remote control, no standalone tool-search/image-generation/plan-mode issue without evidence, and no weakening of the required cloud canary or fallback evidence gates.

## Parity / Alignment Matrix
- Current truth at issue intake: the repo still documented `0.118.0` as active and `0.121.0` as the latest audited stable candidate; explicit workflow/test pins still installed `@openai/codex@0.121.0`, and `.github/workflows/cloud-canary.yml` installed unpinned latest.
- Reference truth: parent-owned CO-269 artifacts already exist for official `rust-v0.122.0`, npm latest `@openai/codex@0.122.0`, and local `codex-cli 0.122.0` command surfaces; predecessor issues CO-183/195/199/207 define the active contract for posture evaluation.
- Target truth: parent records an evidence-backed posture for `0.122.0` and updates only the explicit pins that should match that posture, or documents an explicit exception for `cloud-canary`.
- Out-of-scope differences: unrelated runtime redesign, marketplace descriptor work, provider-worker app-server migration, and auth-profile redesign.

## Readiness Gate
- Not done if: the predecessor chain is missing; explicit pin surfaces are absent; the initial floating `cloud-canary` behavior or the final explicit canary policy is ignored; `0.122.0` is framed as a blind date bump; or the issue's explicit `Not Done If` conditions are not preserved.
- Pre-implementation issue-quality review evidence: approved for docs-only packet drafting. The issue is not narrow enough for a micro-task path because correctness depends on exact predecessor linkage, exact version/pin surfaces, and guardrail carry-forward.
- Safeguard ownership split: child lane owned only the six packet files. Parent owns registries, docs-review, implementation, validation, Linear/workpad state, PR lifecycle, and final artifact integration.

## Technical Requirements
- Functional requirements:
  1. Preserve explicit linkage to CO-183, CO-195, CO-199, and CO-207.
  2. Record the current documented posture (`0.118.0` active, `0.121.0` latest audited candidate) and the new `0.122.0` candidate evidence surfaces.
  3. Enumerate the explicit `@openai/codex@0.121.0` pin surfaces the parent must classify, including `.github/workflows/cloud-canary.yml`.
  4. Keep CO-195 required evidence gates and CO-207 required/fallback semantics as reusable constraints, not as assumed passing proof for `0.122.0`.
  5. Keep CO-199 sandbox/security carry-forward as an explicit posture dependency.
- Non-functional requirements (performance, reliability, security): packet wording must stay machine-checkable, avoid inventing unavailable issue-body text, and keep authority/security guardrails intact.
- Interfaces / contracts: `docs/guides/codex-version-policy.md`, parent-owned `codex-0122` audit artifacts, explicit workflow/test pin surfaces, runtime-mode canary, required/fallback cloud-canary contract, and predecessor task packets CO-183/195/199/207.

## Architecture & Data
- Architecture / design adjustments: none in this packet. Parent implementation is expected to touch docs/policy/workflow/test surfaces only after the posture decision is evidence-backed.
- Data model changes / migrations: none in this child lane.
- External dependencies / integrations: official `openai/codex` release surface for `rust-v0.122.0`, npm registry metadata for `@openai/codex`, local `codex` CLI, workflow/test pin surfaces, and predecessor CO packets.

## Validation Plan
- Child-lane checks:
  - exact protected-term scan across the six owned packet files
  - `git diff --check --` scoped to the six owned packet files
- Parent-lane checks:
  - audited `docs-review` child stream or truthful baseline-only fallback
  - collect official release/npm/local help evidence for `0.122.0`
  - rerun runtime-mode and required/fallback cloud canaries for the final candidate posture
  - run focused validation for any workflow/test pin changes
  - run `npm run pack:smoke` if any downstream-facing pin/workflow/package surfaces change
- Rollout verification: parent records the final posture decision, updated pin policy, and predecessor reconciliation in registries/workpad/PR artifacts.
- Monitoring / alerts: existing review, docs-hygiene, and canary evidence surfaces only.

## Open Questions
- Which explicit `@openai/codex@0.121.0` pins are intended as posture-coupled versus intentionally conservative compatibility pins?
- Should parent merge any outstanding CO-207 posture truth into main before the final `0.122.0` posture decision lands?
- Resolved in CO-269: `cloud-canary` pins the latest audited candidate explicitly while release-facing marketplace smoke stays on `0.121.0` for compatibility.

## Approvals
- Reviewer: docs child lane accepted; parent docs-review fallback recorded at `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/20260421T023620Z-docs-review-fallback.md`.
- Date: 2026-04-21
