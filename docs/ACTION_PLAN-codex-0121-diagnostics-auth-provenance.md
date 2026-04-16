# ACTION PLAN - CO-200 Codex 0.121 Diagnostics Auth Provenance and Failure Distinctions

## Summary
- Goal: create the docs-first implementation plan for CO diagnostics that preserve redacted auth provenance and distinguish Codex `0.121.0` account/rate-limit and Guardian timeout/policy-denial outcomes.
- Scope: docs-first packet, upstream release evidence, diagnostic taxonomy, redaction contract, fixture plan, validation gates, and parent handoff.
- Assumptions: parent lane owns implementation, source/test edits, docs-review, Linear state, workpad, PR lifecycle, and any decision about Codex version adoption posture.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
  - `guardian_timeout`
  - `guardian_policy_denial`
- Not done if:
  - Guardian timeouts and policy denials are collapsed into one category
  - account/auth-profile provenance is absent or logs raw secrets/identifiers
  - `prolite` and unknown WHAM plan values collapse into generic rate-limit errors
  - upstream `rust-v0.121.0` release evidence is not source-linked
  - tests depend on live credentials or real account state
  - this child lane mutates Linear, implementation, tests, package metadata, or unrelated docs
- Pre-implementation issue-quality review:
  - approved for docs-first handoff. The issue is a diagnostics/evidence contract lane with security-sensitive redaction requirements and exact upstream failure distinctions; it is not a Codex version-promotion lane, auth-flow rewrite, or live-account probe.

## Milestones & Sequencing
1. Create `CO-200` PRD, canonical TECH_SPEC, docs TECH_SPEC mirror, ACTION_PLAN, task checklist, and `tasks/index.json` entry.
2. Capture official upstream `openai/codex` `rust-v0.121.0` release evidence: title `0.121.0`, published timestamp `2026-04-15T20:45:18Z`, account/rate-limit fix, and Guardian timeout fix anchors.
3. Define the diagnostic taxonomy and redacted `auth_provenance` allowlist/denylist.
4. Define parent-owned fixture coverage for `prolite`, unknown WHAM, Guardian timeout guidance, timeout TUI-history visibility, policy denial contrast, and redaction rejection.
5. Parent accepts this docs patch, runs docs-review/spec guard, and selects the implementation module ownership.
6. Parent implements focused parser/diagnostic changes and runs only scoped tests while iterating.
7. Parent records sanitized sample artifacts and completes the required review/validation sequence before PR handoff.

## Dependencies
- Official `openai/codex` release page for `rust-v0.121.0`: https://github.com/openai/codex/releases/tag/rust-v0.121.0
- Official GitHub release API for published timestamp and body: https://api.github.com/repos/openai/codex/releases/tags/rust-v0.121.0
- Existing CO diagnostic/error-reporting modules selected by the parent lane.
- Existing fixture/test harness capable of parser-level coverage without live credentials.

## Validation
- Checks / tests:
  - child lane: `jq empty tasks/index.json`
  - child lane: `git diff --check -- docs/PRD-codex-0121-diagnostics-auth-provenance.md docs/TECH_SPEC-codex-0121-diagnostics-auth-provenance.md docs/ACTION_PLAN-codex-0121-diagnostics-auth-provenance.md tasks/specs/linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md tasks/tasks-linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md tasks/index.json`
  - parent lane: docs-review or equivalent manifest-backed docs gate
  - parent lane: `node scripts/spec-guard.mjs --dry-run`
  - parent lane: focused parser/diagnostic tests for the touched implementation surface
  - parent lane: redaction test that fails on forbidden raw auth/account fields
- Rollback plan: revert the `CO-200` docs packet and task-index entry; keep upstream release evidence in parent notes if implementation is deferred.

## Risks & Mitigations
- Risk: diagnostics leak credentials or raw account identifiers while trying to improve provenance.
  - Mitigation: enforce an allowlist for `auth_provenance` and add forbidden-field tests.
- Risk: Guardian timeout remediation remains indistinguishable from policy-denial remediation.
  - Mitigation: require separate `guardian_timeout` and `guardian_policy_denial` categories plus contrast fixtures.
- Risk: release evidence turns into an implicit Codex version-promotion decision.
  - Mitigation: explicitly keep default-version adoption out of scope and require a separate policy lane for promotion.
- Risk: tests become flaky by depending on live account plan or Guardian behavior.
  - Mitigation: use sanitized release-derived fixtures and parser-level tests.
- Risk: upstream source-0 payload is missing from this child checkout.
  - Mitigation: record the source anchor and verify the official GitHub release page/API independently in this packet.

## Approvals
- Docs-first child lane: completed 2026-04-16, pending parent acceptance.
- Parent docs-review: pending.
- Parent implementation validation: pending.
