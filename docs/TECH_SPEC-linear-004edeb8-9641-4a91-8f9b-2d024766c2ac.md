---
id: 20260416-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac
title: CO-208 cloud connector/auth drift classification
relates_to: docs/PRD-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md
risk: high
owners:
  - Codex
last_review: 2026-04-17
---

## Canonical Spec
- Implementation contract: `tasks/specs/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`
- PRD: `docs/PRD-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`
- Action plan: `docs/ACTION_PLAN-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`
- Checklist: `tasks/tasks-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`

## Scope
- Diagnostics/reporting only for connector/auth drift exposed by `CO-207`.
- Required protected upstream error code: `missing_github_connector_link`.
- Required stable machine-readable diagnostic category: `cloud_connector_auth_drift`.
- Required safe message/signal: `GitHub connection not found for user`.
- Required readiness caveat: `CODEX_CLOUD_ENV_ID` is necessary for cloud execution but not sufficient readiness proof.
- Required machine-readable surfaces:
  - `scripts/cloud-canary-ci.mjs`
  - cloud failure diagnostics
  - provider-worker proof
  - manifest/run-summary evidence consumed by cloud-canary gates

## Required Behavior
- Classify a missing GitHub connector link as `diagnostic_category: "cloud_connector_auth_drift"` while preserving `missing_github_connector_link` as a matchable upstream detail.
- Keep missing `CODEX_CLOUD_ENV_ID` as a separate environment configuration class.
- Keep cloud denial, quota/auth/rate-limit, and provider/runtime failures separate from missing connector-link drift.
- Preserve `GitHub connection not found for user` as redacted diagnostic detail, not as an opaque generic failure.
- Fail cloud-canary gates closed when the connector link is missing or stale.
- Write only redacted diagnostic fields to provider-worker proof and run artifacts.

## Diagnostic Contract
Parent implementation should add or normalize a small diagnostic shape equivalent to:

```json
{
  "category": "credentials",
  "diagnostic_category": "cloud_connector_auth_drift",
  "detail": "missing_github_connector_link",
  "signal": "GitHub connection not found for user",
  "surface": "cloud_canary",
  "gate": "cloud-canary",
  "cloud_env_id_configured": true,
  "connector": "github",
  "guidance": "Repair or relink the GitHub connector for the current ChatGPT/Codex cloud account/environment, or record an explicit waiver before re-running cloud-canary gates."
}
```

Field names may adapt to existing local conventions, but the diagnostic category, preserved upstream detail, safe signal, surface/gate provenance, readiness caveat, and redaction guarantees are required.

## Non-Goals
- No live connector provisioning or OAuth repair.
- No token refresh, cookie inspection, or secret discovery.
- No Linear mutation by this child lane.
- No cloud policy weakening or `CODEX_CLOUD_ENV_ID` readiness shortcut.
- No broad cloud runtime, provider-worker, or scheduler redesign outside the diagnostic path.

## Validation
- Focused fixture/test for `missing_github_connector_link` with safe signal `GitHub connection not found for user`, expecting `cloud_connector_auth_drift`.
- Contrast fixtures/tests for:
  - missing `CODEX_CLOUD_ENV_ID`
  - cloud denial
  - quota/auth/rate-limit failure
  - provider/runtime failure
- Focused proof test that provider-worker proof carries the diagnostic class and does not include raw tokens, cookies, emails, org ids, connector secrets, or account identifiers.
- Focused canary test that cloud-canary gates do not pass from `CODEX_CLOUD_ENV_ID` alone.
- Scoped docs/registry syntax check: `jq empty tasks/index.json docs/docs-freshness-registry.json`.
