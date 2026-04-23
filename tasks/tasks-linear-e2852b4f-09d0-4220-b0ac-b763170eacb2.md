# Task Checklist - linear-e2852b4f-09d0-4220-b0ac-b763170eacb2

- Linear Issue: `CO-314` / `e2852b4f-09d0-4220-b0ac-b763170eacb2`
- MCP Task ID: `linear-e2852b4f-09d0-4220-b0ac-b763170eacb2`
- Primary PRD: `docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- TECH_SPEC: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- Shared source 0 anchor: `ctx:sha256:9ce081faa08cf4917310f2afcf0b344e2695557ee12e6f9457985060cb8e8b45#chunk:c000001`
- Source object id: `sha256:9ce081faa08cf4917310f2afcf0b344e2695557ee12e6f9457985060cb8e8b45`
- Origin manifest: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2/cli/2026-04-22T23-30-57-470Z-c6002761/manifest.json`

## Docs-First
- [x] PRD drafted for the release-workflow truth-alignment lane. Evidence: `docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] TECH_SPEC drafted with protected surfaces, parity matrix, and one-shot overview override target. Evidence: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`, `docs/TECH_SPEC-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] ACTION_PLAN drafted for workflow change, docs alignment, focused regression coverage, and validation. Evidence: `docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] Checklist mirrored to `.agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`. Evidence: `.agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] TECH_SPEC linked in `tasks/index.json`. Evidence: `tasks/index.json`.
- [x] Task snapshot and docs freshness registry updated. Evidence: `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.

## Workflow
- [x] Issue moved from `Ready` to `In Progress` after live `issue-context` confirmed the team’s started state. Evidence: Linear transition record on `2026-04-22T23:32:00.604Z`.
- [x] Single persistent workpad created and reused. Evidence: Linear comment `66dc6a7f-1ba7-4e46-b63b-d78b2c73c41a`.
- [x] Parallelization decision recorded before implementation. Evidence: `linear parallelization` decision `parallelize_now` with reason `independent_scope_available`.
- [x] Same-issue child lane completed and parent resolved its bounded docs artifact. Evidence: child lane manifest `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2-co314-release-docs/cli/2026-04-22T23-36-03-879Z-30b3aea9/manifest.json`; accept invalidated on issue `updated_at` drift, then parent recovered the reviewed patch via `git apply` from `provider-linear-child-lane.patch`.
- [x] `docs-review` child stream completed before implementation. Evidence: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2-co314-docs-review-rerun-3/cli/2026-04-22T23-45-27-188Z-0a04535f/manifest.json`, review telemetry `.../review/telemetry.json` (`status: succeeded`, `review_outcome: clean-success`).

## Implementation Acceptance
- [x] `docs/release-notes-template-addendum.md` and `.github/workflows/release.yml` agree on one canonical section contract for shipped skills and release-note highlights. Evidence: `docs/release-notes-template-addendum.md`, `.github/workflows/release.yml`, `tests/release-workflow-contract.spec.ts`.
- [x] Maintainer-facing docs describe prerelease behavior truthfully relative to `.github/workflows/release.yml` dist-tag handling. Evidence: `docs/README.md`, `.agent/SOPs/release.md`, `.github/workflows/release.yml`, `tests/release-workflow-contract.spec.ts`.
- [x] The former .github/release-overview.md override surface is no longer supported and the workflow uses an explicit one-shot mechanism instead. Evidence: `.github/workflows/release.yml`, `docs/README.md`, `.agent/SOPs/release.md`, `tests/release-workflow-contract.spec.ts`.
- [x] `docs/README.md` and `.agent/SOPs/release.md` match the final workflow behavior. Evidence: `docs/README.md`, `.agent/SOPs/release.md`, `tests/release-workflow-contract.spec.ts`.
- [x] Focused regression coverage exists for the release contract. Evidence: `tests/release-workflow-contract.spec.ts`.

## Validation
- [x] Focused release-contract regression passes. Evidence: `npm run test -- tests/release-workflow-contract.spec.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: terminal output `Delegation guard: OK (5 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: terminal output `✅ Spec guard: OK`.
- [x] `npm run build`. Evidence: successful local build completion on the aligned release-workflow/docs/test diff.
- [x] `npm run lint`. Evidence: exit `0`; only pre-existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`. Evidence: terminal summary `349 passed` / `4642 passed`.
- [x] `npm run docs:check`. Evidence: terminal output `✅ docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: terminal output `docs:freshness OK - 4463 docs, 4466 registry entries`.
- [x] `npm run repo:stewardship`. Evidence: terminal output `repo:stewardship OK - 5567 tracked files, 0 action-required`.
- [x] `node scripts/diff-budget.mjs`. Evidence: terminal output `✅ Diff budget: OK (scope=working-tree, files=12/25, lines=451/1200, +432/-19)` before review and clean rerun output during review wrapper execution on the final diff.
- [x] `npm run review`. Evidence: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2/cli/2026-04-22T23-30-57-470Z-c6002761/review/telemetry.json` (`status: succeeded`, `review_outcome: clean-success`) after two post-finding reruns; the initial rerun surfaced the `git tag -F` contract gap, which the parent fixed before the final clean rerun.
- [x] Manual elegance pass recorded. Evidence: parent kept the solution at the existing release-workflow seam, retained the inline release-notes script instead of adding a helper/module, and limited follow-up fixes to truthful docs wording plus one focused contract test; no further simplification was warranted.

## Progress Log
- 2026-04-23: parent provider worker refreshed `origin/main`, created branch `linear/co-314-release-workflow-alignment`, moved `CO-314` to `In Progress`, created the single workpad, recorded `parallelize_now`, and launched child lane `co314-release-docs` for the three release-facing docs files while the parent built the docs-first packet and workflow plan.
- 2026-04-23: child lane `co314-release-docs` succeeded; the direct accept path failed closed on stale Linear `updated_at`, so the parent recovered the reviewed patch artifact manually. Pre-implementation `docs-review` rerun `co314-docs-review-rerun-3` then succeeded cleanly, after which the parent aligned `.github/workflows/release.yml`, the release docs, and focused regression coverage in `tests/release-workflow-contract.spec.ts`.
- 2026-04-23: full repo validation passed, standalone review surfaced and cleared the `git tag -F` docs/workflow contract gap, parent corrected the prerelease tag wording to match the actual regex contract, scoped post-review validation stayed green, and the final standalone review rerun completed with `review_outcome: clean-success`. The explicit elegance pass kept the change at the existing workflow/docs seam and required no further code simplification. `npm run pack:smoke` remained out of scope because this diff did not touch CLI/package/skills/review-wrapper surfaces intended for downstream npm users.
