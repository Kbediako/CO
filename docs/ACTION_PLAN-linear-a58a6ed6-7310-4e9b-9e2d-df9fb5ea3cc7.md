# ACTION_PLAN - CO-451 Agent Identity Auth Provenance

## Summary
- Goal: recognize Agent Identity as known auth provenance in CO cloud preflight and provider-worker runtime/reporting.
- Scope: docs-first packet, credential-source allowlists/normalizers, focused tests, validation, review, and PR handoff.
- Assumptions: Agent Identity should be represented as a safe known credential-source label without persisting raw identity values.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-451`, Agent Identity, `codex login --with-agent-identity`, `CODEX_AGENT_IDENTITY`, cloud preflight credential-source detection, provider-worker/runtime auth provenance, redaction/reporting paths, CO-449, CO-450.
- Not done if: Agent Identity remains unknown, raw identity values leak, existing credential-source behavior regresses, or the lane expands into release intake/binary provenance.
- Pre-implementation issue-quality review: approved for a bounded implementation lane because the issue names exact source/test surfaces and explicit non-goals.
- Fallback / refactor decision: touches the auth-provenance unknown/redacted fallback. Decision is `justify retaining fallback` as a non-expiring fail-closed safety path while narrowing it for Agent Identity.
- Durable retention evidence: existing unknown/redaction tests plus new Agent Identity tests keep known and unknown paths explicit.
- Large-refactor check: a central registry is deferred because this lane fixes one release-intake gap in the established local structure.

## Milestones & Sequencing
1. Create docs-first packet and task registry mirrors, then run docs-review before implementation edits.
2. Implement Agent Identity env detection in cloud preflight and provider-worker runtime provenance.
3. Integrate the child-lane provider-runner test patch, add/adjust focused tests, and run targeted suites.
4. Run required repo gates, standalone review, and explicit elegance review.
5. Open and attach PR, drain automated feedback with `pr ready-review`, refresh workpad, and move to In Review only when clean.

## Dependencies
- Linear issue CO-451 remains the bounded source of truth.
- CO-449 remains the canonical `0.128.0` intake/posture audit.
- CO-450 remains the binary-provenance follow-up.
- Same-issue child lane `agent-identity-provider-tests` owns the provider-runner test file until accepted/rejected/invalidated.

## Validation
- Checks / tests: docs-review, targeted CloudPreflight and ProviderLinearWorkerRunner tests, delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo stewardship, diff budget, standalone review, elegance review, PR checks, and ready-review drain.
- Rollback plan: revert the allowlist/test changes; unknown/redacted fallback behavior remains in place.

## Risks & Mitigations
- Risk: raw identity values are accidentally persisted. Mitigation: only add env key/label metadata and rely on existing fingerprint/redaction paths.
- Risk: safe label naming drifts between preflight and provider runtime. Mitigation: use `env:CODEX_AGENT_IDENTITY` for env provenance and one canonical event label.
- Risk: docs/help churn implies posture adoption. Mitigation: no docs/help edits beyond task packet unless user-visible auth-provenance wording changes.

## Approvals
- Reviewer: provider worker before implementation; standalone review before handoff.
- Date: 2026-05-01
