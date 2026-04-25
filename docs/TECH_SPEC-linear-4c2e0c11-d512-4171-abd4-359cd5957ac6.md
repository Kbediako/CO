---
id: 20260424-linear-4c2e0c11-d512-4171-abd4-359cd5957ac6
title: CO Codex 0.125 Marketplace Docs And Pack-Smoke Rebaseline
relates_to: docs/PRD-linear-4c2e0c11-d512-4171-abd4-359cd5957ac6.md
risk: high
owners:
  - Codex
last_review: 2026-04-24
---

## Summary
- Objective: align CO marketplace docs, pack-smoke behavior, focused tests, and version-policy release-smoke pin posture with Codex CLI `0.125.0`.
- Scope: README/downstream marketplace docs, pack-smoke marketplace command detection/execution, focused pack-smoke/launcher tests, version-policy docs, and release-facing workflow pin decision evidence.
- Constraints: preserve npm as baseline, preserve older top-level marketplace fallback while supported pins need it, and do not promote release smoke pins without a passing canary.

## Issue-Shaping Contract
- User-request translation carried forward: CO-355 is the `0.125.0` marketplace command rebaseline lane. Current docs and pack-smoke must move from stale top-level `codex marketplace add` assumptions to the live `codex plugin marketplace ...` command surface.
- Protected terms / exact artifact and surface names: Codex CLI `0.125.0`, `codex plugin marketplace add`, `codex plugin marketplace upgrade`, `codex plugin marketplace remove`, `codex marketplace add`, `pack:smoke`, `README.md`, `docs/public/downstream-setup.md`, `docs/guides/codex-version-policy.md`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `tests/marketplace-launcher.spec.ts`, `.github/workflows/core-lane.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/release.yml`, `@openai/codex@0.121.0`, `@openai/codex@0.125.0`.
- Nearby wrong interpretations to reject: blind pin promotion from npm latest alone, deleting legacy pack-smoke fallback without evidence, limiting docs to `add` only, treating marketplace smoke as a broad active-target/model/app-server promotion, or weakening marketplace smoke proof.
- Explicit non-goals carried forward: no standalone implementation of CO-351/CO-352 model/runtime changes inside CO-355, no npm baseline removal, no unrelated plugin manifest redesign, and no cloud-canary active-target promotion.

## Parity / Alignment Matrix
- Current truth: docs recommend `codex marketplace add`; version policy says release-facing smoke stays on `0.121.0` because newer local marketplace surfaces lacked top-level `marketplace add`; pack-smoke checks for top-level add.
- Reference truth: local Codex `0.125.0` and npm latest are `0.125.0`; `codex plugin marketplace add` supports owner/repo, HTTP(S), SSH, and local marketplace roots; `upgrade` and `remove` are available; top-level `codex marketplace add` fails.
- Target truth / intended delta: docs use plugin marketplace commands for current Codex, pack-smoke supports plugin and legacy marketplace command surfaces, and release-facing workflow pins either move to `0.125.0` with canary evidence or remain pinned with documented rationale.
- Explicitly out-of-scope differences: unrelated workflow modernization, implementing app-server provider changes, auth/profile changes, and generic active target promotion. CO-355 still validates that marketplace wording does not contradict the CO-351/CO-352 `gpt-5.5` / app-server direction.

## Readiness Gate
- Not done if: public docs still recommend top-level `codex marketplace add` for current Codex; pack-smoke can pass without marketplace proof and no explicit allowed skip; `upgrade`/`remove` are ignored; or release-facing pins are moved without canary output.
- Pre-implementation issue-quality review evidence: approved for full docs-first implementation. The issue is broader than a micro-task because correctness depends on exact command surfaces, public docs, workflow pins, and pack-smoke compatibility across versions.
- Safeguard ownership split: same-issue child lane owns pack-smoke implementation/tests while active; parent owns docs/policy/canary integration, registries, workpad, review, and final validation.

## Technical Requirements
- Functional requirements:
  1. Replace current-user docs guidance with `codex plugin marketplace add <source>`.
  2. Document `codex plugin marketplace upgrade [marketplace-name]` and `codex plugin marketplace remove <marketplace-name>`.
  3. Preserve remote/local source guidance: `owner/repo[@ref]`, HTTP(S), SSH, and local marketplace root directories.
  4. Update pack-smoke marketplace probing/execution to prefer `codex plugin marketplace add` when present and fall back to top-level `codex marketplace add` for older supported pins.
  5. Keep skip/fail-closed behavior explicit when no marketplace command surface exists.
  6. Update tests to cover plugin marketplace support and legacy fallback.
  7. Decide release-facing smoke pin movement using canary output from current `pack:smoke`.
  8. Update version policy with the final `0.125.0` marketplace compatibility boundary.
- Non-functional requirements (performance, reliability, security): keep smoke isolated in temp dirs, avoid touching user Codex config outside the smoke home, keep docs wording current but not over-broad, and preserve explicit validation evidence.
- Interfaces / contracts: Codex CLI marketplace commands, `scripts/pack-smoke.mjs`, workflow `@openai/codex` pins, docs freshness registry, and Linear workpad closeout.

## Architecture & Data
- Architecture / design adjustments: introduce or reuse a small pack-smoke command resolver that records which marketplace command family was selected and uses that family for add/install behavior.
- Data model changes / migrations: none.
- External dependencies / integrations: local `/opt/homebrew/bin/codex`, npm registry metadata for `@openai/codex`, GitHub Actions workflow pin policy, and Codex marketplace config format.

## Validation Plan
- Tests / checks:
  - current CLI evidence: `codex plugin marketplace add|upgrade|remove --help`, `codex marketplace add --help`, and `npm view @openai/codex dist-tags.latest version --json`
  - focused pack-smoke/marketplace tests
  - docs-first `docs-review` child stream or documented fallback
  - required validation floor: delegation guard, spec guard, build, lint, test, docs checks, docs freshness, repo stewardship, diff budget, manifest-backed review, elegance pass, and `npm run pack:smoke`
  - `pr ready-review` drain before Linear review handoff
- Rollout verification: attach PR to CO-355, refresh the single workpad with canary/pin decision and validation status, then transition only after clean review-drain evidence.
- Monitoring / alerts: existing GitHub checks, review telemetry, and Linear workpad evidence.

## Open Questions
- Whether release-facing workflows can move from `@openai/codex@0.121.0` to `@openai/codex@0.125.0` after pack-smoke is rebaselined.
- Whether a separate follow-up is needed for future CLI marketplace command drift after this compatibility resolver lands.

## Approvals
- Reviewer: parent provider worker pre-implementation issue-quality review.
- Date: 2026-04-24
