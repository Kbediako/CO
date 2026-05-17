---
id: 20260416-linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7-codex-0121-diagnostics-auth-provenance
title: CO-200 Codex 0.121 diagnostics auth provenance and failure distinctions
status: done
relates_to: docs/PRD-codex-0121-diagnostics-auth-provenance.md
risk: high
owners:
  - Codex
last_review: 2026-05-17
review_notes:
  - 2026-05-17: CO-543 strict spec-guard audit reclassified this stale Apr 16 row inactive done; live Linear evidence verified CO-200 is Done/completed. No completed_at was inferred or fabricated.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-codex-0121-diagnostics-auth-provenance.md`
- PRD: `docs/PRD-codex-0121-diagnostics-auth-provenance.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-0121-diagnostics-auth-provenance.md`
- Task checklist: `tasks/tasks-linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md`

## Traceability
- Linear issue: `CO-200` / `4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7`
- Linear URL: https://linear.app/asabeko/issue/CO-200
- Source anchor: `ctx:sha256:bf84f0969f10dac95d9df870e4d6d2d6146a792f52417a7cab6caf9a4452b80d#chunk:c000001`
- Origin manifest: `.runs/linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7-docs-0121-evidence/cli/2026-04-15T23-03-10-312Z-12d5d636/manifest.json`
- Upstream release: https://github.com/openai/codex/releases/tag/rust-v0.121.0
- Upstream release API: https://api.github.com/repos/openai/codex/releases/tags/rust-v0.121.0

## Summary
- Objective: define parent-owned diagnostics that distinguish Codex `0.121.0` account/auth-profile, rate-limit/plan, Guardian timeout, and Guardian policy-denial failures while preserving only redacted auth provenance.
- Scope:
  - docs-first registration for `CO-200`
  - official upstream Codex `rust-v0.121.0` evidence capture
  - diagnostic category taxonomy and redacted provenance contract
  - fixture/test and validation requirements for parent implementation
- Constraints:
  - this child lane owns docs packet and registry only
  - parent owns implementation, tests, docs-review, Linear state, workpad, PR lifecycle, and full validation
  - no live account credential probing in deterministic tests
  - no raw auth/account/billing payload capture

## Upstream Evidence
- Official release title: `0.121.0`.
- Official tag: `rust-v0.121.0`.
- Published timestamp from GitHub API: `2026-04-15T20:45:18Z`.
- Account/rate-limit evidence: release notes name a fix for `prolite` plan handling and unknown WHAM plan decoding, anchored to `#17419`.
- Guardian evidence: release notes name timeout separation from policy denials, timeout-specific guidance, and visible TUI history entries, anchored to `#17381`, `#17486`, `#17521`, and `#17557`.

## Issue-Shaping Contract
- User-request translation carried forward: create the docs-first packet and requirements for diagnostics that preserve auth provenance and distinguish account/rate-limit failures from Guardian timeout and policy-denial failures under Codex `0.121.0`.
- Protected terms / exact artifact and surface names: Codex `0.121.0`, `rust-v0.121.0`, `openai/codex`, `prolite`, WHAM, Guardian, TUI history, `diagnostic_category`, `auth_provenance`, `account_plan`, `rate_limit`, `guardian_timeout`, `guardian_policy_denial`, `tasks/index.json`.
- Nearby wrong interpretations to reject: version-string-only adoption, broad CLI upgrade, raw auth payload logging, live account probes in CI, treating Guardian timeout as policy denial, and generic rate-limit errors for `prolite` or unknown WHAM plans.
- Explicit non-goals carried forward: no implementation/test edits in this child lane, no Linear mutation, no package metadata edits, no Codex default-version promotion, no collection of raw tokens/cookies/API keys/account IDs/emails/org IDs/full upstream response bodies.

## Parity / Alignment Matrix
- Current truth:
  - CO has separate version-policy lanes and should not infer default-version promotion from diagnostic evidence alone.
  - account/auth-profile, rate-limit/plan, Guardian timeout, and policy denial can be hard to distinguish when collapsed into generic failure output.
  - there is no `CO-200` packet yet that defines redacted auth provenance fields and fixture-backed expected outcomes for these `0.121.0` distinctions.
- Reference truth:
  - upstream Codex `0.121.0` release evidence explicitly identifies account/rate-limit and Guardian timeout improvements.
  - operator diagnostics should preserve enough safe provenance to identify auth profile/account-plan causes while omitting secrets and raw identifiers.
  - Guardian timeout is operationally different from Guardian policy denial and should have different guidance.
- Target truth / intended delta:
  - parent implementation emits stable `diagnostic_category` values covering `auth_mismatch`, `quota_rate_limit`, `guardian_timeout`, `guardian_policy_denial`, `cloud_denial`, `env_config`, and `provider_runtime`.
  - `auth_provenance` contains only redacted, normalized fields.
  - fixture coverage proves `prolite`, unknown WHAM, Guardian timeout, TUI-history timeout visibility, and policy-denial contrast cases.
  - docs and task evidence cite the official release source and parent-owned validation artifacts.
- Explicitly out-of-scope differences:
  - changing auth routing or login behavior
  - changing billing/account-plan semantics
  - changing Guardian policy behavior
  - upgrading Codex defaults or package dependencies
  - broad telemetry redesign outside the selected diagnostic surfaces

## Readiness Gate
- Not done if:
  - Guardian timeout and policy denial share one category or remediation path
  - `prolite` and unknown WHAM plan cases lack account-plan/rate-limit diagnostic context
  - diagnostics omit redacted auth provenance needed to distinguish local auth profile causes
  - diagnostics capture raw secrets, raw account identifiers, emails, org IDs, cookies, tokens, API keys, or complete upstream account/auth response bodies
  - tests depend on live credentials rather than sanitized fixtures
  - official `openai/codex` `rust-v0.121.0` release evidence is not cited
  - implementation changes Codex default adoption posture without a separate policy lane
- Pre-implementation issue-quality review evidence:
  - 2026-04-16: child lane self-review confirms the scope is a diagnostic contract/evidence packet, not a version promotion, auth-flow rewrite, Guardian policy change, or live-account probing lane. The micro-task path is ineligible because correctness depends on exact protected terms, exact upstream surfaces, and security-sensitive redaction rules.
- Safeguard ownership split:
  - child lane owns only the listed docs/task files and `tasks/index.json`
  - parent lane owns implementation, tests, source changes, Linear/workpad state, PR lifecycle, and full validation

## Technical Requirements
- Functional requirements:
  - introduce or update a diagnostic taxonomy with stable machine-readable categories:
    - `auth_mismatch` for local auth profile/account selection/provenance failures
    - `quota_rate_limit` for rate-limit/account-plan failures, including `prolite` and unknown WHAM plan decoding cases
    - `guardian_timeout` for Guardian timeout outcomes and timeout-specific guidance
    - `guardian_policy_denial` for Guardian policy-denial outcomes
    - `cloud_denial`, `env_config`, and `provider_runtime` for cloud denial, cloud environment setup, and provider/runtime failures
  - attach a redacted `auth_provenance` object to relevant diagnostics.
  - record upstream evidence fields in docs/task artifacts: release title, tag, published date, release URL, and PR anchors.
  - preserve enough source error detail after redaction for operators to understand the category.
  - ensure TUI-history-visible timeout events can be represented in fixtures or normalized parser inputs.
  - make remediation text category-specific and avoid policy-denial language for timeout-only outcomes.
- Non-functional requirements:
  - deterministic tests must not require live Codex credentials, live billing state, or a real Guardian timeout.
  - all output surfaces must be safe for manifests, logs, CI artifacts, task packets, and PR review.
  - diagnostics must be additive and backward compatible where existing consumers ignore unknown diagnostic fields.
  - release evidence must remain source-linked instead of restated as unaudited narrative.
- Interfaces / contracts:
  - `diagnostic_category`
  - `auth_provenance`
  - `auth_provenance.provider_kind`
  - `auth_provenance.runtime_mode`
  - `auth_provenance.runtime_provider`
  - `auth_provenance.active_profile_fingerprint`
  - `auth_provenance.active_account_fingerprint`
  - `auth_provenance.cloud_env_id`
  - `auth_provenance.cloud_branch`
  - `auth_provenance.credential_source`
  - `auth_provenance.auth_freshness`
  - `auth_provenance.observed_at`
  - `auth_provenance.source`
  - `failure_diagnosis.signal` carries safe structured plan context such as `account_plan=<label>` and `wham_plan=<label>`
  - parent-selected operator-facing diagnostic output surfaces
  - parent-selected run manifest/report surfaces

## Architecture & Data
- Architecture / design adjustments:
  - keep error parsing and diagnostic rendering separated so fixture inputs can exercise parser outcomes without needing live upstream calls.
  - normalize upstream error/account/Guardian signals into a small internal diagnostic shape before rendering.
  - centralize redaction before any diagnostic object is written to logs, manifests, or snapshots.
  - include release evidence in docs/task artifacts rather than runtime diagnostic payloads unless parent implementation chooses a version-evidence field.
- Redacted auth provenance allowlist:
  - `provider_kind`, `runtime_mode`, `runtime_provider`, `credential_source`, `auth_freshness`, `observed_at`, and `source`: normalized short labels only.
  - `active_profile_fingerprint` and `active_account_fingerprint`: keyed opaque HMAC fingerprints with the `hmac-sha256:<16-hex>` format when `CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY` or `CODEX_ORCHESTRATOR_AUTH_PROVENANCE_KEY` is available; never raw identifiers.
  - `cloud_env_id` and `cloud_branch`: cloud run context needed for preflight diagnosis.
  - `failure_diagnosis.signal`: safe redacted source detail and allowlisted plan labels such as `account_plan=prolite` or `wham_plan=unknown_wham_plan`; never raw auth material.
- Forbidden auth provenance fields:
  - raw tokens, API keys, cookies, OAuth refresh/access tokens, session IDs, auth headers, full request/response headers, raw account IDs, raw org IDs, email addresses, billing details, and complete upstream account/auth payloads.
- Data model changes / migrations:
  - no persistent migration expected for docs-first scope.
  - parent implementation may add optional diagnostic fields to existing manifest/report JSON as backward-compatible additions.
- External dependencies / integrations:
  - official GitHub release page/API for source evidence
  - parent-selected Codex error/diagnostic parser seams
  - existing fixture/test harness

## Acceptance Criteria
1. Docs and task evidence cite official `openai/codex` `rust-v0.121.0` evidence for title `0.121.0`, published date `2026-04-15`, account/rate-limit fix, and Guardian timeout fix.
2. Parent implementation emits distinct `diagnostic_category` values for account/auth-profile (`auth_mismatch`), rate-limit/account-plan (`quota_rate_limit`), Guardian timeout (`guardian_timeout`), and Guardian policy denial (`guardian_policy_denial`).
3. `prolite` plan fixtures classify as `quota_rate_limit` without falling back to generic unknown errors.
4. Unknown WHAM plan fixtures preserve `wham_plan=unknown_wham_plan` or an equivalent safe marker.
5. Guardian timeout fixtures produce timeout-specific guidance and do not use policy-denial category/remediation.
6. Policy-denial fixtures remain distinct from Guardian timeout fixtures.
7. TUI-history timeout visibility is represented by a fixture or normalized event assertion.
8. `auth_provenance` fields are redacted and allowlisted; forbidden raw fields fail tests or snapshot review.
9. Existing consumers remain compatible when they ignore the new diagnostic fields.

## Validation Plan
- Tests / checks:
  - parent-owned parser fixture for `prolite` account/rate-limit handling
  - parent-owned parser fixture for unknown WHAM plan decoding
  - parent-owned parser fixture for Guardian timeout with timeout-specific guidance
  - parent-owned parser fixture for Guardian timeout history visibility
  - parent-owned parser fixture for Guardian policy denial contrast
  - parent-owned redaction test that rejects forbidden raw auth/account fields
  - parent runs `node scripts/spec-guard.mjs --dry-run` after accepting this docs packet
- Focused validation commands:
  - parent-selected focused unit test command for the touched parser/diagnostic module
  - `node scripts/spec-guard.mjs --dry-run`
  - docs-review or equivalent parent-owned manifest-backed docs gate
- Rollout verification:
  - parent records a sanitized sample diagnostic artifact showing each category without raw credentials or account identifiers.
- Monitoring / alerts:
  - no new alerting required in this slice; use operator-visible diagnostics and manifests.

## Open Questions
- Which existing CO module currently has the narrowest ownership for Codex error classification?
- Should the first implementation expose `diagnostic_category` only in manifests, or also in operator-facing CLI/status output?
- What salt scope should parent use for optional account/org reference hashes: per-run, per-task, or per-installation?

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-16
