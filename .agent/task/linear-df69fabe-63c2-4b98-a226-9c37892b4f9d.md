# Task Checklist - linear-df69fabe-63c2-4b98-a226-9c37892b4f9d

- Linear Issue: `CO-183` / `df69fabe-63c2-4b98-a226-9c37892b4f9d`
- MCP Task ID: `linear-df69fabe-63c2-4b98-a226-9c37892b4f9d`
- Primary PRD: `docs/PRD-linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`
- Task spec: `tasks/specs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` drafted for `CO-183`. Evidence: docs packet paths above.
- [x] Pre-implementation issue-quality review notes captured before implementation. Evidence: `tasks/specs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d.md`.
- [x] Docs-review evidence captured before implementation. Evidence: `.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-co-183-docs-review-r2/cli/2026-04-14T23-00-44-902Z-abb6e4bf/manifest.json`.

## Linear / Delegation
- [x] `linear issue-context` inspected live team states before transition. Evidence: packaged `linear issue-context --issue-id df69fabe-63c2-4b98-a226-9c37892b4f9d`.
- [x] Issue moved from live `Ready` to live started state `In Progress` before active work. Evidence: packaged `linear transition --issue-id df69fabe-63c2-4b98-a226-9c37892b4f9d --state "In Progress" --format json`.
- [x] Workpad created and pre-turn decomposition matrix recorded. Evidence: Linear workpad comment `a2ac5671-affd-4949-a046-7fab48f0eb92`.
- [x] Parallelization decision recorded as `parallelize_now / independent_scope_available`. Evidence: packaged `linear parallelization` result.
- [x] Same-issue child lane `release-audit` completed successfully before turn end and parent recorded artifact handling. Evidence: `.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-release-audit/cli/2026-04-14T22-53-17-993Z-157e4227/manifest.json`; parent rejected zero-byte patch and retained manifest evidence.

## Evidence / Implementation
- [x] Official `rust-v0.119.0` and `rust-v0.120.0` release-note evidence captured. Evidence: `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/codex-0120-release-audit/rust-v0.119.0.release.json` and `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/codex-0120-release-audit/rust-v0.120.0.release.json`.
- [x] Local `codex --version` and relevant help surfaces captured. Evidence: `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/codex-0120-release-audit/`.
- [x] Adoption matrix completed and linked. Evidence: `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/codex-0120-release-audit/adoption-matrix.md`.
- [x] Final promote/hold decision recorded in policy and task packet. Evidence: `docs/guides/codex-version-policy.md` keeps `0.118.0` as the documented target and records `0.120.0` as the latest stable candidate blocked on cloud canary evidence.
- [x] Spark policy restricted to file-search/codebase-search-only across docs, templates, skills, defaults, and tests. Evidence: `scripts/docs-hygiene.ts`, `tests/docs-hygiene.spec.ts`, `orchestrator/src/cli/codexDefaultsSetup.ts`, `orchestrator/tests/CodexDefaultsSetup.test.ts`, docs/templates/skills edits.
- [x] Delegation MCP `outputSchema` adoption or no-op rationale recorded. Evidence: `docs/guides/codex-version-policy.md` and `adoption-matrix.md` record a hold/no-op because current delegation outputs are pass-through variable-shape results.
- [x] Review-wrapper prompt transport canary captured. Evidence: `../../.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/cli/2026-04-14T22-49-28-802Z-039d36f2/review/telemetry.json` reports `status: succeeded` / `review_outcome: bounded-success`; scoped `--uncommitted` review on Codex CLI `0.120.0` still uses saved prompt artifact plus `--title` transport.
- [x] Runtime-mode canary captured. Evidence: `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/runtime-mode-canary/runtime-canary-summary.json` (`20/20` pass for each scenario).
- [x] Required cloud canary and cloud fallback contract captured or explicitly blocked/waived. Evidence: `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/cloud-canary-required/cloud-canary-required.log`, `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/cloud-canary-fallback/cloud-canary-fallback-r2.log`, and `.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-cloud-fallback/cli/2026-04-14T23-12-32-761Z-b3b80c0f/manifest.json`; required cloud remains blocked by missing `CODEX_CLOUD_ENV_ID`.

## Validation
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run` latest rerun after April 15 date boundary. Evidence: final validation after merging CO-184 baseline repair passes.
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness` latest rerun after April 15 date boundary. Evidence: final validation after merging CO-184 baseline repair passes with only the expected CO-175 rolling advisory.
- [x] `npm run repo:stewardship`
- [x] `node scripts/diff-budget.mjs`
- [x] `npm run pack:smoke` if CLI/package/skills/review-wrapper paths changed
- [x] Standalone review completed before review handoff. Evidence: final `bounded-success` with no actionable issues at `../../.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/cli/2026-04-15T01-22-09-601Z-d01090d3/review/telemetry.json`.
- [x] Elegance review completed before review handoff. Evidence: final pass at `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/elegance-review.md`.
- [ ] PR attached and ready-review drain completed before `In Review`

## Handoff Status
- [x] PR #481 opened and attached to CO-183: `https://github.com/Kbediako/CO/pull/481`.
- [x] Codex and CodeRabbit PR feedback fixed locally: spark-policy guard requires scoped allowance wording, rejects negated search-only scope, accepts restrictive and non-spark redirect wording, and regression coverage lives in `tests/docs-hygiene.spec.ts`; stale shipped-skill Codex CLI `0.105.0` wording updated to `0.118.0`.
- [x] Out-of-scope docs freshness baseline follow-up CO-184 / `237c874c-c05f-4947-949a-573043fc575f` merged into this branch; spec/docs freshness reruns are green.
- [ ] Final review handoff pending PR push, direct PR-thread replies/resolution, ready-review drain, and Linear transition to `In Review`.
