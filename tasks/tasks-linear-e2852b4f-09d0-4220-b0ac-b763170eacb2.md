# Task Checklist - linear-e2852b4f-09d0-4220-b0ac-b763170eacb2

- Linear Issue: `CO-314` / `e2852b4f-09d0-4220-b0ac-b763170eacb2`
- MCP Task ID: `linear-e2852b4f-09d0-4220-b0ac-b763170eacb2`
- Primary PRD: `docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- TECH_SPEC: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- Shared source anchor: `ctx:sha256:02cb90d54135011ef937fd18a3991df0f28287d0192ad00e24a2f90a2d4cffb8#chunk:c000001`
- Current origin manifest: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2-docs-packet/cli/2026-04-23T05-57-00-647Z-0bd37fd5/manifest.json`
- Source payload note: this child checkout has no `.runs` tree, so the packet is anchored on the parent-provided issue wording plus the current repo release-surface audit only.

## Docs-First
- [x] PRD drafted for `CO-314` release-note `Overview` / `Bug Fixes` parity, prerelease `dist-tag` docs truth, and stale-safe .github/release-overview.md handling. Evidence: `docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] TECH_SPEC drafted in the canonical `tasks/specs/` path with protected release-note terms and PR `#608` review notes. Evidence: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] ACTION_PLAN drafted for bounded parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] `tasks/index.json` updated within the declared docs scope. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` append intentionally omitted after `docs:check` reported zero headroom; canonical task registration remains in `tasks/index.json` plus `docs/docs-freshness-registry.json`. Evidence: docs-review rerun `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2-docs-review/cli/2026-04-23T06-15-40-797Z-b963f1c2/manifest.json`.
- [x] `docs/docs-freshness-registry.json` updated within the declared docs scope. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`. Evidence: `.agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.

## Child-Lane Scope
- [x] Docs child-lane packet stayed inside the declared docs file scope after parent removed the `docs/TASKS.md` append for the docs hard-limit. Evidence: `git diff --stat -- docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/tasks-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md .agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/index.json docs/docs-freshness-registry.json`.
- [x] Docs child-lane packet did not edit release workflow, release docs, tests, package files, or parent scratch files. Evidence: `git diff --stat`.
- [x] Docs child-lane packet left Linear state, workpad, review, PR lifecycle, and merge parent-owned. Evidence: this checklist plus the bounded lane instructions.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [x] Parent implementation promotes generated `Overview` and `Bug Fixes` into canonical release-note sections without duplicated promoted content in `Full Changelog`. Evidence: `tests/release-workflow-contract.spec.ts` and `.github/workflows/release.yml`.
- [x] `Full Changelog` still contains non-promoted generated sections and compare metadata when present. Evidence: `tests/release-workflow-contract.spec.ts` plus `stripSection` / compare-line checks in `.github/workflows/release.yml`.
- [x] `docs/README.md` and `.agent/SOPs/release.md` truthfully document prerelease `dist-tag` derivation from `.github/workflows/release.yml`, including stable `latest`, label-derived prerelease tags such as `alpha`, and fallback `next`. Evidence: `tests/release-workflow-contract.spec.ts`.
- [x] The signed annotated tag body is handled as the one-shot, stale-safe override, and .github/release-overview.md cannot shape release notes. Evidence: `tests/release-workflow-contract.spec.ts` and `.github/workflows/release.yml`.
- [x] `.agent/SOPs/release.md` keeps an explicit `.github/workflows/release.yml` reference. Evidence: `tests/release-workflow-contract.spec.ts`.
- [x] Checklist mirrors name `Overview` and `Bug Fixes` wherever release-note promotion evidence is recorded. Evidence: this checklist and `.agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] Initial diff-budget evidence is captured separately before parent review handoff. Evidence: post-merge `node scripts/diff-budget.mjs` passed; hard local gate reported working-tree `0/0`, and advisory stacked aggregate vs `origin/main` reported files `10/25`, lines `571/1200`, `+549/-22`.
- [x] Final review-wrapper rerun evidence is captured separately after implementation and review feedback changes. Evidence: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2/cli/2026-04-23T05-51-56-323Z-c85885e3/review/telemetry.json` reported `status=succeeded` with `review_outcome=bounded-success`; `review/output.log` reported no actionable regressions.

## Validation
- [x] Child scoped JSON parse check. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "Overview|Bug Fixes|Full Changelog|prerelease \`dist-tag\` derivation|docs/release-notes-template-addendum.md|\\.github/workflows/release.yml|release-overview\.md|docs/README.md|\\.agent/SOPs/release.md|initial diff-budget|final review-wrapper" docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/tasks-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md .agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/tasks-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md .agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/index.json docs/docs-freshness-registry.json`.
- [x] Parent focused release-note generation validation for `Overview`, `Bug Fixes`, and `Full Changelog`. Evidence: `npm run test -- tests/release-workflow-contract.spec.ts` passed.
- [x] Parent focused docs parity check across `.github/workflows/release.yml`, `docs/README.md`, and `.agent/SOPs/release.md`. Evidence: `npm run test -- tests/release-workflow-contract.spec.ts` passed.
- [x] Parent docs-review before implementation. Evidence: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2-docs-review/cli/2026-04-23T06-15-40-797Z-b963f1c2/manifest.json`.
- [x] Parent post-merge full validation before review handoff. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint` (existing `DelegationMcpHealth.test.ts` warnings only), `npm run test` (349 files / 4655 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` passed after merging `origin/main`.
- [x] Parent initial diff-budget evidence before review handoff. Evidence: post-merge `node scripts/diff-budget.mjs` passed with hard local gate `0/0` and advisory stacked aggregate files `10/25`, lines `571/1200`, `+549/-22`.
- [x] Parent final review-wrapper rerun after implementation and review feedback. Evidence: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2/cli/2026-04-23T05-51-56-323Z-c85885e3/review/telemetry.json` reported `status=succeeded`, `review_outcome=bounded-success`, and `termination_boundary.kind=command-intent`; the saved output log reported no actionable regressions.
- [x] Parent elegance/minimality pass completed before PR handoff. Evidence: `git diff --stat origin/main...HEAD` stayed limited to the release workflow, release-facing docs, docs-first mirrors/registry, and one focused contract spec; no extra dependency, release publication behavior, package-versioning change, or broad release refactor was introduced.
- [x] PR #616 CodeRabbit requested-change thread addressed. Evidence: `.agent/SOPs/release.md` now verifies and pushes `<tag>` instead of hardcoded `vX.Y.Z`; `tests/release-workflow-contract.spec.ts` locks the resolved-tag examples; `npm run test -- tests/release-workflow-contract.spec.ts`, `npm run docs:check`, and `git diff --check -- .agent/SOPs/release.md tests/release-workflow-contract.spec.ts` passed.

## Progress Log
- 2026-04-23: Bounded same-issue child lane created the `CO-314` docs-first packet and registry mirrors against source anchor `ctx:sha256:02cb90d54135011ef937fd18a3991df0f28287d0192ad00e24a2f90a2d4cffb8#chunk:c000001`. The expected shared `source-0` payload is absent in this child checkout because the lane has no `.runs` tree, so the packet preserves the parent-provided issue wording plus the current repo release-surface audit only. Current audit: `.github/workflows/release.yml` derives `DIST_TAG`, extracts `Overview` / `Bug Fixes`, strips `Overview` before `Full Changelog`, and uses .github/release-overview.md when present; `.github/release.yml` defines generated `Overview` / `Bug Fixes` categories; `docs/README.md` and `.agent/SOPs/release.md` currently mention alpha prerelease behavior while the workflow supports broader prerelease label-derived `dist-tag` derivation.
- 2026-04-23: Parent implemented workflow/docs/test parity: generated `Overview` and `Bug Fixes` are promoted once, `Full Changelog` strips promoted sections, prerelease docs describe label-derived `dist-tag` behavior, and overview override comes from the signed annotated tag body. Evidence: `npm run test -- tests/release-workflow-contract.spec.ts`, `npm run docs:check`, and `git diff --check`.
- 2026-04-23: Parent merged latest `origin/main`, reran the full validation gate, completed forced standalone review as bounded success with no actionable findings, and completed the explicit elegance/minimality pass. Evidence: review telemetry `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2/cli/2026-04-23T05-51-56-323Z-c85885e3/review/telemetry.json`.
- 2026-04-23: PR #616 ready-review stopped on one CodeRabbit requested-change thread; parent addressed it by changing SOP verify/push examples to use `<tag>` and adding focused contract assertions. Evidence: `npm run test -- tests/release-workflow-contract.spec.ts` and `npm run docs:check`.
