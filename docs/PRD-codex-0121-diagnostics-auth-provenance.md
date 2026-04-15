# PRD - CO-200 Codex 0.121 Diagnostics Auth Provenance and Failure Distinctions

## Added by Bootstrap 2026-04-16

## Traceability
- Linear issue: `CO-200` / `4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7`
- Linear URL: https://linear.app/asabeko/issue/CO-200
- Source anchor: `ctx:sha256:bf84f0969f10dac95d9df870e4d6d2d6146a792f52417a7cab6caf9a4452b80d#chunk:c000001`
- Origin manifest: `.runs/linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7-docs-0121-evidence/cli/2026-04-15T23-03-10-312Z-12d5d636/manifest.json`
- Upstream release: https://github.com/openai/codex/releases/tag/rust-v0.121.0
- Upstream release API: https://api.github.com/repos/openai/codex/releases/tags/rust-v0.121.0

## Upstream Evidence Snapshot
- The official `openai/codex` GitHub release for tag `rust-v0.121.0` is titled `0.121.0` and was published at `2026-04-15T20:45:18Z`.
- The release notes include a bug fix for rate-limit and account handling around `prolite` plans and unknown WHAM plan decoding.
- The release notes include Guardian timeout work that separates timeout outcomes from policy denials, adds timeout-specific guidance, and makes those timeout events visible in TUI history.
- Relevant upstream PR anchors named by the release include `#17419` for plan/account handling and `#17381`, `#17486`, `#17521`, and `#17557` for Guardian timeout behavior.

## Summary
- Problem Statement: CO diagnostic surfaces can collapse Codex account/auth-profile issues, rate-limit or plan decoding failures, Guardian timeouts, and Guardian policy denials into generic failure text. That makes operators misclassify whether a failure is caused by the local auth profile, account plan/rate-limit state, upstream plan decoding, policy denial, or transient Guardian timeout.
- Desired Outcome: CO captures redacted auth provenance and emits distinct diagnostic categories for account/auth-profile, rate-limit/plan, Guardian timeout, and Guardian policy-denial failures, with fixture-backed tests and validation gates aligned to upstream Codex `0.121.0` evidence.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the docs-first packet for `CO-200` so the parent lane can implement diagnostics that preserve auth provenance without leaking secrets and can distinguish Codex `0.121.0` account/rate-limit and Guardian timeout semantics from policy denials.
- Success criteria / acceptance:
  - docs packet names the upstream `0.121.0` release evidence and links exact source URLs
  - requirements define diagnostic categories for account/auth-profile, rate-limit/plan, Guardian timeout, and policy denial
  - requirements define a redacted auth provenance schema with explicit forbidden raw fields
  - requirements include fixture and test coverage for `prolite`, unknown WHAM plan values, Guardian timeout guidance, visible TUI history entries, and policy denial contrast cases
  - parent-owned implementation can validate behavior without live account secrets or live Linear mutation
- Constraints / non-goals:
  - docs-only child lane; no implementation, tests, package metadata, or Linear mutations here
  - do not upgrade or promote the CO Codex version posture in this lane
  - do not capture raw tokens, cookies, API keys, account IDs, email addresses, org IDs, or complete upstream response bodies
  - keep parent-owned validation focused; no full repo suite from this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "Codex 0.121 diagnostics auth provenance and failure distinctions"
  - "account/auth-profile"
  - "rate-limit"
  - "Guardian distinctions"
  - "prolite"
  - "unknown WHAM plan decoding"
  - "Guardian timeout distinctions from policy denials"
  - "timeout-specific guidance"
  - "visible TUI history entries"
- Protected terms / exact artifact and surface names:
  - Codex `0.121.0`
  - `rust-v0.121.0`
  - `openai/codex`
  - `prolite`
  - WHAM
  - Guardian
  - TUI history
  - `diagnostic_category`
  - `auth_provenance`
  - `rate_limit`
  - `account_plan`
  - `guardian_policy_denial`
  - `guardian_timeout`
  - `tasks/index.json`
- Nearby wrong interpretations to reject:
  - "just bump the supported Codex version string"
  - "treat Guardian timeout as another policy denial"
  - "log full upstream auth/account payloads for debugging"
  - "solve by live-probing a real account in tests"
  - "collapse `prolite` and unknown WHAM plans into generic rate-limit failure"
  - "make this child lane mutate Linear or implement source changes"

## Parity / Alignment Matrix
- Current truth:
  - CO version-policy docs currently center on the earlier stable posture and separate adoption lanes.
  - upstream Codex `0.121.0` now carries account/rate-limit and Guardian timeout fixes that affect how failures should be diagnosed.
  - CO diagnostic packets do not yet define a redacted auth provenance contract specific to these `0.121.0` failure distinctions.
  - a supplied source-0 anchor exists for this lane, but the literal source payload path was not present in this child checkout during docs creation.
- Reference truth:
  - the official `openai/codex` `rust-v0.121.0` release is titled `0.121.0`, published on `2026-04-15`, and names the account/plan and Guardian timeout fixes.
  - rate-limit/account diagnostics should be able to explain `prolite` and unknown WHAM plan cases without exposing raw auth material.
  - Guardian timeout diagnostics should guide timeout remediation and stay distinct from policy-denial remediation.
- Target truth / intended delta:
  - CO diagnostics classify account/auth-profile, rate-limit/plan, Guardian timeout, and policy-denial failures as separate categories.
  - diagnostic evidence includes only redacted auth provenance and plan/limit metadata safe for logs, manifests, and task packets.
  - fixture-backed tests preserve the `0.121.0` distinctions and prevent future generic-error regressions.
  - parent-owned validation records release-source provenance and focused test/gate evidence without requiring live account secrets.
- Explicitly out-of-scope differences:
  - Codex CLI version promotion, rollback, or package-manager changes
  - app-server contract changes unrelated to diagnostics
  - Linear state/workpad mutation from this child lane
  - collecting raw upstream account, auth, cookie, token, or billing payloads

## Not Done If
- Guardian timeouts and Guardian policy denials still produce the same diagnostic category, remediation text, or fixture expectation.
- Account/auth-profile failures cannot report redacted provenance sufficient to identify local profile/config causes.
- `prolite` or unknown WHAM plan values still collapse into a generic rate-limit error with no plan-decoding context.
- Diagnostics log raw secrets, raw account identifiers, emails, cookies, tokens, full headers, or complete upstream auth/account response bodies.
- The evidence trail omits the official `openai/codex` `rust-v0.121.0` release title/date and the account/Guardian fix anchors.
- Tests require live account credentials instead of sanitized fixtures.
- This child lane edits implementation, tests, package metadata, unrelated docs, or Linear state.

## Goals
- Specify the docs-first requirements for `CO-200`.
- Preserve upstream release evidence for Codex `0.121.0` account/rate-limit and Guardian timeout distinctions.
- Define a diagnostic taxonomy and redacted auth provenance fields that parent implementation can adopt.
- Define fixture and validation requirements that prove the distinctions without live secrets.

## Non-Goals
- Promoting CO to Codex `0.121.0` as the default compatibility target.
- Changing authentication flows, account selection, billing, or upstream request routing.
- Building a new telemetry platform or broad diagnostics framework.
- Adding live account probes to CI.
- Mutating Linear, workpad state, or PR lifecycle artifacts from this child lane.

## Stakeholders
- Product: CO operators who triage Codex auth, rate-limit, and Guardian failures
- Engineering: Codex orchestrator maintainers and provider-lane owners
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - focused fixtures cover all required `0.121.0` account/rate-limit and Guardian distinctions
  - diagnostic output contains a stable `diagnostic_category` and redacted `auth_provenance` payload
  - timeout guidance is visible and testable separately from policy-denial guidance
  - docs-review and spec guard pass after parent accepts this packet
- Guardrails / Error Budgets:
  - zero raw credential/account secret leakage in logs, manifests, fixtures, or snapshots
  - no live-account dependency in deterministic tests
  - no change to Codex adoption posture without a separate version-policy lane

## User Experience
- Personas: CO operator, provider worker maintainer, reviewer validating auth/rate-limit diagnostics, downstream maintainer reading failure artifacts.
- User Journeys:
  - an operator sees an account-plan/rate-limit diagnostic and can tell whether the failure involved local auth profile selection, `prolite`, unknown WHAM plan decoding, or upstream throttling
  - an operator sees a Guardian timeout and follows timeout-specific guidance instead of treating the event as policy refusal
  - a reviewer inspects a fixture-backed task packet and confirms no raw auth/account data was captured

## Technical Considerations
- Architectural Notes:
  - diagnostics should be additive around existing error parsing and manifest/reporting surfaces
  - the taxonomy should be stable enough for tests and operators, while preserving raw upstream error messages only after redaction
  - auth provenance should be normalized before writing to logs, manifests, status JSON, or task evidence
  - parent implementation should prefer sanitized fixtures derived from upstream release semantics over live account probes
- Dependencies / Integrations:
  - official `openai/codex` `rust-v0.121.0` release page and release API
  - existing CO diagnostics/error-reporting surfaces selected by the parent lane
  - existing test harness capable of fixture-driven parser/projection coverage

## Open Questions
- Which current CO diagnostics surface should own the canonical `diagnostic_category` enum?
- Should Guardian timeout guidance appear in operator-facing status output, run manifests, or both?
- Does the parent lane need to parse Codex TUI history artifacts directly, or is a normalized upstream event fixture enough for the first implementation slice?

## Approvals
- Product: Self-approved from the `CO-200` issue scope and upstream release evidence.
- Engineering: Pending parent docs-review and implementation validation.
- Design: N/A
