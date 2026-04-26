# ACTION_PLAN - Upgrade GitHub Actions to Node 24-compatible majors

## Summary
- Goal: remove supported Node 20-backed action majors from CO GitHub Actions workflows before GitHub's `2026-06-02` Node 24 runner switch.
- Scope: docs-first packet, every `.github/workflows/**` file, action metadata audit, workflow implementation diff, validation, review, PR attachment, and ready-review handoff.
- Assumptions:
  - action major tags remain the repo's preferred workflow style
  - selected Node 24-compatible action majors preserve current inputs used by CO workflows
  - installed `node-version` values are intentionally preserved

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO workflows: upgrade Node 20 GitHub Actions before Node 24 runner switch`
  - `actions/checkout@v4`
  - `actions/setup-node@v4`
  - `peter-evans/create-pull-request@v6`
  - `.github/workflows/**`
  - `Core Lane`
  - `Cloud Canary`
  - `archive automation`
  - `release`
- Not done if:
  - any supported Node 20-backed action major remains after implementation
  - workflow installed Node versions are changed without explicit scope approval
  - release/archive/cache behavior drifts
  - validation and review evidence is missing before handoff
- Pre-implementation issue-quality review:
  - 2026-04-25: current live issue context, child-lane scan, and upstream action metadata confirm a bounded workflow dependency posture issue with no need to ask for additional scope.

## Milestones & Sequencing
1. Inspect Linear context, move `Ready -> In Progress`, create the single workpad, and record the required parallelization decision.
2. Launch same-issue child lane `workflow-scan` for the initial workflow audit report.
3. Draft PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and freshness registry entries.
4. Run or preserve pre-change workflow scan and upstream `runs.using` evidence for current and target action majors.
5. Update `.github/workflows/**` action majors only, preserving all inputs/permissions/env/commands:
   - checkout v4 -> v6
   - setup-node v4 -> v6
   - upload-artifact v4 -> v7
   - download-artifact v4 -> v8
   - github-script v7 -> v9
   - create-pull-request v6 -> v8
6. Run post-change scans and focused YAML review for Core Lane, Cloud Canary, archive automation, and release-relevant paths.
7. Run docs-review/validation floor, standalone review, explicit elegance pass, PR attachment, merge latest `origin/main`, ready-review drain, workpad refresh, and review-state handoff.

## Dependencies
- Linear issue `CO-375`
- GitHub Actions Node 20 deprecation notice attached to the issue
- Upstream action tags and `action.yml` runtime metadata
- Existing workflow behavior in `.github/workflows/**`

## Validation
- Checks / tests:
  - workflow `uses:` scan before and after
  - upstream `runs.using` verification for selected action majors
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review under `FORCE_CODEX_REVIEW=1`
- Rollback plan:
  - revert only the workflow action-major changes if validation proves behavior drift
  - preserve scan evidence and docs packet so a follow-up can target any unsupported action separately

## Risks & Mitigations
- Risk: action major upgrades alter hidden behavior.
  - Mitigation: keep all inputs unchanged and perform a workflow-specific diff review for permissions, cache, artifacts, archive PRs, and release fallbacks.
- Risk: installed Node versions are conflated with action runtime versions.
  - Mitigation: explicitly preserve `node-version` values and document the distinction in PRD/spec/workpad.
- Risk: non-issue-named Node 20 actions remain.
  - Mitigation: audit all `uses:` references and include artifact/github-script upgrades in implementation.

## Approvals
- Docs-first packet: parent-authored after live issue context, child-lane audit, and upstream action metadata verification.
- Parent docs-review: captured; initially failed on pre-existing docs hygiene outside CO-375 (`CO-377` / `CO-175`). Current `origin/main` now contains the missing CO-377 paths and latest main Core Lane passed `docs:check`; rerun docs gates on the current-main-rebased CO-375 branch before PR handoff.
- Parent standalone review: completed cleanly under `FORCE_CODEX_REVIEW=1`; telemetry reports `status: succeeded`, `review_outcome: clean-success`.
- Elegance/minimality review: completed; no simplification patch required.
