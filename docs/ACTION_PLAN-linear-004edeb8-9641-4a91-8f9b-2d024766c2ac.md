# ACTION_PLAN - CO-208 cloud connector/auth drift classification

## Added by Docs Child Lane 2026-04-17

## Summary
- Goal: make cloud connector/auth drift machine-readable across `scripts/cloud-canary-ci.mjs`, cloud failure diagnostics, and provider-worker proof.
- Scope: docs-first packet, registry mirrors, diagnostic taxonomy, parent-owned focused implementation, and parent-owned validation.
- Issue frame: `CO-208` is a diagnostics/reporting gap exposed by `CO-207`, not a live connector repair lane.
- Required protected terms: `missing_github_connector_link`, `GitHub connection not found for user`, `CODEX_CLOUD_ENV_ID`, cloud-canary gates, and provider-worker proof.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `missing_github_connector_link`
  - `GitHub connection not found for user`
  - `CODEX_CLOUD_ENV_ID`
  - cloud-canary gates
  - provider-worker proof
- Not done if:
  - the missing connector-link condition collapses into generic cloud env, denial, or runtime failure
  - `CODEX_CLOUD_ENV_ID` alone claims readiness
  - cloud-canary gates pass despite unresolved connector/auth drift
  - provider-worker proof lacks the machine-readable diagnostic class
  - logs, fixtures, manifests, or proof artifacts include secrets or raw identifiers
- Pre-implementation issue-quality review:
  - 2026-04-17: docs child lane preserved the issue as diagnostic classification/reporting work and explicitly rejected live connector repair, OAuth/token work, and cloud policy weakening.

## Milestones & Sequencing
1. Create the docs-first packet and task checklist for `CO-208`.
2. Register the task in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Parent identifies the smallest diagnostic normalization seam shared by `scripts/cloud-canary-ci.mjs`, cloud failure diagnostics, and provider-worker proof.
4. Parent adds focused fixtures/tests for `missing_github_connector_link` and contrast cases.
5. Parent implements the classification without changing live connector state or weakening cloud-canary gates.
6. Parent runs scoped validation and records sanitized evidence paths in the checklist.
7. Parent runs docs-review/spec guard and owns PR lifecycle after accepting the patch artifact.

## Dependencies
- `scripts/cloud-canary-ci.mjs`
- cloud failure diagnostics
- provider-worker proof writer/closeout surfaces
- manifest and run-summary diagnostic output
- existing cloud required/fallback canary gate behavior

## Validation
- Docs child lane:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - targeted protected-term check across the created packet files
- Parent implementation lane:
  - focused fixture for `missing_github_connector_link` and `GitHub connection not found for user`
  - contrast fixture for missing `CODEX_CLOUD_ENV_ID`
  - contrast fixture for cloud denial
  - contrast fixture for quota/auth/rate-limit or provider/runtime failure
  - provider-worker proof redaction assertion
  - cloud-canary gates assertion that `CODEX_CLOUD_ENV_ID` alone is insufficient readiness proof
  - `node scripts/spec-guard.mjs --dry-run`
  - manifest-backed docs-review or implementation gate selected by parent

## Risks & Mitigations
- Risk: connector-link drift is misclassified as missing environment because both block cloud canary execution.
  - Mitigation: require contrast fixtures and exact protected upstream code `missing_github_connector_link` mapped to `cloud_connector_auth_drift`.
- Risk: diagnostic proof over-captures auth context while debugging.
  - Mitigation: allowlist redacted fields only; reject tokens, cookies, emails, org ids, connector secrets, and raw account identifiers in tests/snapshots.
- Risk: a configured `CODEX_CLOUD_ENV_ID` causes a false green readiness report.
  - Mitigation: make connector/auth diagnostic proof part of cloud-canary gate readiness.
- Risk: scope drifts into live connector repair.
  - Mitigation: keep implementation to classification/reporting; parent owns any separate repair or provisioning lane.

## Approvals
- Docs-first packet: produced by same-issue docs child lane `.runs/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac-docs-packet/cli/2026-04-16T22-50-39-659Z-cf579188/manifest.json`.
- Parent docs-review: pending parent lane acceptance.
- Parent implementation/review/PR lifecycle: pending parent lane.
