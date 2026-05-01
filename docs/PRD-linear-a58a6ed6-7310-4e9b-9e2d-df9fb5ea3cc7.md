# PRD - CO-451 Agent Identity Auth Provenance

## Summary
- Problem Statement: Codex CLI `0.128.0` adds Agent Identity login support through `codex login --with-agent-identity` and `CODEX_AGENT_IDENTITY`, but CO cloud preflight and provider-worker runtime provenance still classify that credential source as unknown.
- Desired Outcome: Agent Identity-backed runs are reported as a known credential provenance in cloud preflight diagnostics and provider-worker runtime/auth JSONL parsing, without exposing raw credential or identity values.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete CO-451 as a bounded provider-worker implementation lane that recognizes Agent Identity auth provenance in the existing preflight and provider runtime paths discovered during the `0.128.0` intake audit.
- Success criteria / acceptance:
  - `orchestrator/src/cli/utils/cloudPreflight.ts` recognizes `CODEX_AGENT_IDENTITY` as a known env credential source.
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts` recognizes the same env source and safe Agent Identity labels from runtime/auth events.
  - Focused tests cover Agent Identity alongside the existing `codex_login` and `device_auth` coverage.
  - Docs/help surfaces change only if implementation introduces user-visible wording beyond the new provenance label.
- Constraints / non-goals: do not promote Codex CLI `0.128.0`, change workflow pins, alter CO-449 release-intake scope, absorb CO-450 binary-provenance work, or broaden auth handling beyond provenance classification/redaction.

## Intent Checksum
- Exact user wording / phrases to preserve: `CO-451`, Agent Identity, `codex login --with-agent-identity`, `CODEX_AGENT_IDENTITY`, cloud preflight credential-source detection, provider-worker/runtime auth provenance, redaction/reporting paths.
- Protected terms / exact artifact and surface names: `orchestrator/src/cli/utils/cloudPreflight.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/CloudPreflight.test.ts`, CO-449, CO-450.
- Nearby wrong interpretations to reject: treating Agent Identity as raw token storage, logging the identity value, changing active Codex CLI posture, changing model/runtime defaults, or turning this into a broad auth redesign.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Cloud preflight | Known env credentials exclude `CODEX_AGENT_IDENTITY` and otherwise fall back to `credential_source_unknown`. | Codex CLI `0.128.0` exposes Agent Identity login and an env hint named `CODEX_AGENT_IDENTITY`. | `CODEX_AGENT_IDENTITY` reports as known env credential provenance while preserving the unknown fallback. |
| Provider-worker runtime env | Runtime provenance checks the older env allowlist only. | Provider runtime proof should match the same credential source vocabulary as preflight. | Runtime auth provenance reports `env:CODEX_AGENT_IDENTITY` when present. |
| Provider-worker JSONL parsing | Safe labels include `codex_login` and `device_auth`, but not Agent Identity. | Auth events can safely describe credential source labels without exposing raw identifiers. | Agent Identity labels normalize to one safe canonical label and unsafe values remain redacted. |
| Release-intake relationship | CO-449 owns broad `0.128.0` intake posture and CO-450 owns binary-provenance divergence. | CO-451 is the remaining bounded implementation gap from that audit. | This lane lands only auth-provenance classification and tests. |

Explicitly out-of-scope differences: CLI version adoption, cloud canary posture, workflow pin changes, binary provenance, new auth flows, raw identity storage, and unrelated docs freshness maintenance.

## Not Done If
- Agent Identity env provenance still appears as `credential_source_unknown`.
- Provider-worker JSONL auth provenance still redacts or drops safe Agent Identity labels.
- Raw `CODEX_AGENT_IDENTITY` values, account ids, profiles, emails, tokens, or identity identifiers appear in persisted proof or diagnostics.
- Existing `codex_login`, `device_auth`, unknown, and redaction behavior regresses.
- The lane changes Codex CLI posture, workflow pins, release-intake state, or CO-450 binary-provenance scope.

## Goals
- Add Agent Identity to cloud preflight credential-source detection.
- Add Agent Identity to provider-worker runtime env provenance and safe auth-event label normalization.
- Add focused regression tests for the new source.
- Keep docs/help changes limited to any genuinely user-visible wording delta.

## Non-Goals
- No Codex CLI `0.128.0` adoption or release-promotion decision.
- No workflow, cloud-canary, package, or model-default changes.
- No broad auth redesign, token refresh work, or Agent Identity login implementation.
- No expansion into CO-449 or CO-450.

## Stakeholders
- Product: CO operators who need truthful auth posture during provider-worker runs.
- Engineering: cloud preflight, provider-worker runtime, and review/diagnostic surface maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: targeted tests prove known Agent Identity provenance for cloud preflight, provider runtime env, and provider JSONL auth events.
- Guardrails / Error Budgets: no secret leakage, no raw identity persistence, no regression to existing credential-source labels, and no posture or release-intake scope expansion.

## User Experience
- Personas: provider-worker operator, reviewer inspecting proof JSON/workpad, and CO maintainer triaging auth posture.
- User Journeys: a worker run backed by Agent Identity shows known provenance in diagnostics/proof; a reviewer can distinguish Agent Identity from unknown credentials without seeing secret values.

## Technical Considerations
- Architectural Notes: keep the change in the existing credential-source allowlists and normalizers. Prefer a single safe canonical label for Agent Identity event labels while preserving `env:CODEX_AGENT_IDENTITY` for env provenance.
- Dependencies / Integrations: Codex CLI `0.128.0` Agent Identity surface, provider-worker proof JSON, cloud preflight auth provenance, and existing fingerprint/redaction helpers.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: justify retaining fallback.
- Rationale: the `credential_source_unknown` path is an intentional fail-closed safety fallback for unrecognized credential sources. CO-451 narrows that fallback for Agent Identity only; the fallback remains as supported defensive behavior for future/unsafe labels.
- Owner: CO provider-worker/runtime maintainers.
- Introduced date: pre-existing before 2026-05-01.
- Review date: 2026-05-01.
- Validation: focused tests for Agent Identity known paths plus existing unknown/redaction tests.
- Large-refactor check: a larger auth-provenance registry could reduce duplication later, but this issue is a bounded parity fix across two existing allowlists.

## Open Questions
- None blocking. If review finds user-visible docs/help wording for credential-source labels, update the relevant surface in this lane.

## Approvals
- Product: Linear issue CO-451.
- Engineering: provider worker owns implementation, validation, PR lifecycle, and review handoff.
- Design: Not applicable.
