# ACTION_PLAN - CO: clarify README when main documents behavior newer than the latest tagged package

## Summary
- Goal: make the README truthful when `main` documents behavior newer than the latest tagged package.
- Scope: docs-first packet, release-truthfulness README edits, registry mirrors, validation, and review handoff.
- Assumptions:
  - `v0.1.38` remains the latest local tag and package version for this lane
  - the fix can stay bounded to docs truthfulness
  - any broader release-safe docs architecture work belongs in a follow-up, not `CO-273`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `README`
  - `main`
  - `latest tagged package`
  - `v0.1.38`
  - `release-safe docs`
  - `source-head only`
  - `docs/public/downstream-setup.md`
  - `docs/public/provider-onboarding.md`
- Not done if:
  - current `main` README still looks release-safe for the published package
  - no explicit tagged-doc route exists for published-package users
  - source-head-only guidance remains unlabeled
  - the lane mutates release/package behavior
- Pre-implementation issue-quality review:
  - 2026-04-21: live repo evidence confirms the mismatch and shows that `docs/public/*` plus packaged marketplace/plugin front-door docs are post-`v0.1.38` additions.

## Milestones & Sequencing
1. Register the docs-first packet for `linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13`, update `tasks/index.json`, mirror the checklist into `.agent/task/`, refresh `docs/TASKS.md`, and add registry entries in `docs/docs-freshness-registry.json`.
2. Run a docs-review child stream after packet registration so the required docs-first review evidence exists before the final README implementation is handed off.
3. Fold in the successful but stale-invalidated `readme-release-truth` child-lane intent manually on the parent branch.
4. Tighten README wording so:
   - the root README clearly says it tracks `main`
   - published-package readers are routed to the tagged `v0.1.38` README
   - marketplace/plugin and `docs/public/*` setup guidance that is newer than `v0.1.38` is labeled source-head-only
5. Run the full validation floor, standalone review, elegance pass, and review-handoff updates.

## Dependencies
- Linear issue `CO-273`
- Parent manifest `.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/cli/2026-04-21T02-11-19-447Z-184f2469/manifest.json`
- Child lane manifest `.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13-readme-release-truth/cli/2026-04-21T02-19-06-335Z-b7a27d2f/manifest.json`
- Tagged release evidence from `package.json`, `git describe --tags --abbrev=0`, and `git diff v0.1.38..HEAD`

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the packet and README boundary wording if validation shows unrelated breakage
  - keep the task packet and child-lane evidence so a narrower follow-up can pick up if needed

## Risks & Mitigations
- Risk: README warning is too generic and does not actually route release users safely.
  - Mitigation: explicitly link to the tagged `v0.1.38` README.
- Risk: README implies new `docs/public/*` guides were present in `v0.1.38`.
  - Mitigation: label those guides as source-head-only for this checkout.
- Risk: child-lane invalidation leaves the turn without usable output.
  - Mitigation: record the successful child-lane manifest and manually apply the bounded intent on the parent branch.
- Risk: registry/task mirror drift causes docs gates to fail.
  - Mitigation: update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` in the same packet.

## Approvals
- Reviewer: standalone review `clean-success` recorded in `/Users/kbediako/Code/CO/.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/cli/2026-04-21T02-11-19-447Z-184f2469/review/telemetry.json`; final handoff still blocked by inherited `docs:freshness` baseline
- Date: 2026-04-21
