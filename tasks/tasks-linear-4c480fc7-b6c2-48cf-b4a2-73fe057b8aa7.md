# Task Checklist - linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7-codex-0121-diagnostics-auth-provenance

- Linear Issue: `CO-200` / `4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7`
- MCP Task ID: `linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7`
- Primary PRD: `docs/PRD-codex-0121-diagnostics-auth-provenance.md`
- TECH_SPEC: `tasks/specs/linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-codex-0121-diagnostics-auth-provenance.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-0121-diagnostics-auth-provenance.md`

## Docs-First
- [x] PRD drafted for Codex `0.121.0` diagnostics auth provenance and failure distinctions. Evidence: `docs/PRD-codex-0121-diagnostics-auth-provenance.md`.
- [x] Canonical TECH_SPEC drafted with diagnostic categories, redacted auth provenance fields, upstream evidence, fixture plan, and validation gates. Evidence: `tasks/specs/linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md`.
- [x] TECH_SPEC mirror drafted inside docs scope. Evidence: `docs/TECH_SPEC-codex-0121-diagnostics-auth-provenance.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused fixtures, redaction checks, and review gates. Evidence: `docs/ACTION_PLAN-codex-0121-diagnostics-auth-provenance.md`.
- [x] `tasks/index.json` updated under canonical `items[]` with the `CO-200` TECH_SPEC entry and review date. Evidence: `tasks/index.json` uses the date-prefixed task id and points `paths.docs` to the canonical TECH_SPEC mirror.
- [x] Official upstream `openai/codex` release evidence verified for `rust-v0.121.0`: title `0.121.0`, published `2026-04-15T20:45:18Z`, account/rate-limit fix, and Guardian timeout fix anchors. Evidence: https://github.com/openai/codex/releases/tag/rust-v0.121.0 and https://api.github.com/repos/openai/codex/releases/tags/rust-v0.121.0.

## Workflow
- [x] Child lane stayed within declared docs/file scope. Evidence: final diff limited to the owned docs, task files, and `tasks/index.json`.
- [x] Child lane did not mutate Linear state or workpad. Evidence: no Linear mutation helpers called.
- [x] Child lane did not edit source, tests, package metadata, or unrelated docs. Evidence: final diff.
- [x] Supplied source-0 anchor was recorded; literal source payload path was not present in this child checkout, so official GitHub release page/API evidence was verified independently. Evidence: this checklist and packet traceability.
- [x] Child lane left changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [x] Parent implementation emits distinct `diagnostic_category` values for `auth_mismatch`, `quota_rate_limit`, `guardian_timeout`, `guardian_policy_denial`, `cloud_denial`, `env_config`, and `provider_runtime`. Evidence: `orchestrator/src/cli/adapters/cloudFailureDiagnostics.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, and focused tests.
- [x] `prolite` plan handling is covered by a sanitized fixture and does not fall back to a generic unknown/rate-limit error. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Unknown WHAM plan decoding is covered by a sanitized fixture and preserves an explicit unknown-plan marker. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Guardian timeout handling is covered by a sanitized fixture with timeout-specific guidance. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Guardian policy denial remains distinct from Guardian timeout in category and remediation. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] TUI-history timeout visibility is represented by a normalized event assertion. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] `auth_provenance` output is allowlisted and redacted. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/utils/cloudPreflight.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and `orchestrator/tests/Doctor.test.ts`.
- [x] Forbidden raw auth/account fields fail tests or review: tokens, API keys, cookies, OAuth tokens, session IDs, auth headers, raw account IDs, raw org IDs, emails, billing details, and full upstream payloads. Evidence: redaction-focused assertions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` and `orchestrator/tests/Doctor.test.ts`.
- [x] Existing consumers remain compatible when they ignore the added diagnostic fields. Evidence: broad `category` fields are preserved and exact parse-result snapshots were updated only for additive `authProvenance` / `failureDiagnosis` fields.

## Not Done If
- [ ] Guardian timeout and policy denial still share one category or remediation path.
- [ ] `prolite` and unknown WHAM plan cases still collapse into generic rate-limit errors.
- [ ] Account/auth-profile provenance is missing from relevant diagnostics.
- [ ] Diagnostics log raw credentials, raw account identifiers, emails, org IDs, cookies, tokens, API keys, auth headers, or full upstream account/auth payloads.
- [ ] Tests require live credentials or live account state.
- [ ] Release evidence omits the official `openai/codex` `rust-v0.121.0` source.
- [ ] A Codex default-version promotion is made without a separate policy lane.

## Validation
- [x] Child scoped JSON syntax check. Evidence: `jq empty tasks/index.json`.
- [x] Child scoped whitespace/diff check. Evidence: `git diff --check -- docs/PRD-codex-0121-diagnostics-auth-provenance.md docs/TECH_SPEC-codex-0121-diagnostics-auth-provenance.md docs/ACTION_PLAN-codex-0121-diagnostics-auth-provenance.md tasks/specs/linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md tasks/tasks-linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md tasks/index.json`.
- [ ] Parent docs-review or equivalent manifest-backed docs gate.
- [x] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: command passed.
- [x] Parent focused parser/diagnostic fixture tests for `prolite`, unknown WHAM, Guardian timeout, TUI history visibility, policy denial contrast, redaction, and generic status non-attribution. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/CloudFailureDiagnostics.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/Doctor.test.ts` passed with 206 tests.
- [x] Parent inline sanitized sample fixture for each new diagnostic family. Evidence: focused test fixtures in `orchestrator/tests/CloudFailureDiagnostics.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and `orchestrator/tests/Doctor.test.ts`.
- [x] Parent `node scripts/delegation-guard.mjs`. Evidence: command passed with the accepted child-lane manifest.
- [x] Parent `npm run build`. Evidence: command passed.
- [x] Parent `npm run lint`. Evidence: command passed.
- [x] Parent `npm run docs:check`. Evidence: command passed.
- [x] Parent `npm run docs:freshness`. Evidence: command passed after registering the new docs/task files.
- [x] Parent `npm run repo:stewardship`. Evidence: command passed.
- [x] Parent diff-budget guard. Evidence: `DIFF_BUDGET_OVERRIDE_REASON="CO-200 combines required docs-first packet, diagnostics implementation, and focused fixtures in one provider issue; split would obscure review provenance" node scripts/diff-budget.mjs` passed.
- [x] Parent `npm run test` after commit/clean-diff conditions. Evidence: clean post-commit run passed, 342 test files and 3942 tests.
- [x] Parent `npm run pack:smoke`. Evidence: command passed.
- [x] Parent standalone review and elegance/minimality pass before review handoff. Evidence: manifest-backed `FORCE_CODEX_REVIEW=1` rerun completed cleanly, and explicit elegance/minimality pass was recorded in the Linear workpad.

## Progress Log
- 2026-04-16: Bounded same-issue child lane created the `CO-200` docs-first packet and canonical `tasks/index.json` entry only. Protected terms preserved: Codex `0.121.0`, `rust-v0.121.0`, `openai/codex`, `prolite`, WHAM, Guardian, TUI history, `diagnostic_category`, `auth_provenance`, `rate_limit`, `account_plan`, `guardian_timeout`, and `guardian_policy_denial`.
- 2026-04-16: Official GitHub release evidence verified for title/date and required account/rate-limit plus Guardian timeout fix anchors. The supplied source-0 payload path was absent from this child checkout, so the packet records the anchor and independently cites the official release page/API.
- 2026-04-16: Parent implementation added additive redacted `auth_provenance`, fine `diagnostic_category` values, and focused Codex `0.121` account/rate-limit plus Guardian fixtures while preserving broad failure categories for existing consumers.
