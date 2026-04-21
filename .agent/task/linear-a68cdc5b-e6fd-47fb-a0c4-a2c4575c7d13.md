# Task Checklist - linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13

- Linear Issue: `CO-273` / `a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13`
- MCP Task ID: `linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13`
- Primary PRD: `docs/PRD-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- TECH_SPEC: `tasks/specs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- Parent manifest: `.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/cli/2026-04-21T02-11-19-447Z-184f2469/manifest.json`
- Source anchor: `ctx:sha256:7f6dd672017997283582c2d667c65a1b0ed8cab23d07c2795d2e02801d90fa46#chunk:c000001`
- Workpad comment: `18df1d93-b9ae-4350-a779-38fbfa645d8d`

## Docs-First
- [x] Live issue context inspected, team workflow states confirmed, and the issue moved from `Ready` to `In Progress` before active coding. Evidence: Linear transition at `2026-04-21T02:19:01.811Z`.
- [x] Single required workpad created and kept as the active progress surface. Evidence: Linear comment `18df1d93-b9ae-4350-a779-38fbfa645d8d`.
- [x] Pre-turn decomposition matrix and `parallelize_now` decision recorded. Evidence: Linear `parallelization` audit entry for `parallelize_now` / `independent_scope_available`.
- [x] Same-turn same-issue child lane `readme-release-truth` completed successfully. Evidence: `.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13-readme-release-truth/cli/2026-04-21T02-19-06-335Z-b7a27d2f/manifest.json`.
- [x] PRD drafted for the README release-truthfulness lane. Evidence: `docs/PRD-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, and review/validation contract. Evidence: `tasks/specs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`, `docs/TECH_SPEC-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`.
- [x] ACTION_PLAN drafted for packet registration, docs-review, implementation, and validation. Evidence: `docs/ACTION_PLAN-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`.
- [x] Registry mirrors updated for this packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Docs-review child stream captured before review handoff. Evidence: `.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13-co273-docs-review/cli/2026-04-21T02-28-22-529Z-ebff61ac/manifest.json` (child stream failed on inherited `docs:freshness:maintain` / stale-spec baseline rather than the CO-273 packet, so parent used manual docs-first fallback for closeout notes).

## Implementation Acceptance
- [x] README explicitly says the root docs track current `main` rather than assuming latest published-package behavior. Evidence: `README.md:5-10`.
- [x] Published-package readers are routed to a release-safe `v0.1.38` README path. Evidence: `README.md:7-9`.
- [x] Source-head-only setup guidance is labeled where the current README references post-`v0.1.38` surfaces such as packaged marketplace/plugin flows or `docs/public/*`. Evidence: `README.md:25-35`, `README.md:62-67`.
- [x] No package version, tag, publish workflow, or runtime behavior changed. Evidence: diff scope is docs/task packet only plus README truthfulness wording; `package.json` remains unchanged at `0.1.38`.

## Validation
- [x] `node scripts/delegation-guard.mjs` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/spec-guard.log`.
- [x] `npm run build` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/build.log`.
- [x] `npm run lint` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/lint.log`.
- [x] `npm run test` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/test.log`.
- [x] `npm run docs:check` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/docs-check.log`.
- [x] `npm run docs:freshness` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/docs-freshness.log` reports the post-merge freshness baseline green after current `origin/main` brought in the separate `docs:freshness:maintain` cleanup.
- [x] `npm run repo:stewardship` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/repo-stewardship.log`.
- [x] `node scripts/diff-budget.mjs` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/diff-budget.log`.
- [x] `FORCE_CODEX_REVIEW=1 npm run review` Evidence: `/Users/kbediako/Code/CO/.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/cli/2026-04-21T07-35-34-622Z-391b3ca3/review/telemetry.json` reports `status: succeeded` and `review_outcome: bounded-success`; after addressing the stale handoff-status and unrelated registry-row P2s, the final rerun found no actionable diff-local issues.
- [x] `npm run pack:smoke` Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/validation/pack-smoke.log` after rerun with `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1`; original environment-specific marketplace gap recorded in `pack-smoke-marketplace-blocked.log`.
- [ ] PR attachment and `pr ready-review` drain before review handoff. Remaining workflow step after committing the refreshed packet and opening the PR.

## Progress Log
- 2026-04-21: live Linear context showed `Ready`, no comments, no PR attachments, and no workpad; parent moved the issue to `In Progress`, created the required workpad, recorded `parallelize_now`, and launched same-issue child lane `readme-release-truth`.
- 2026-04-21: child lane `readme-release-truth` succeeded and produced a bounded README patch, satisfying the same-turn child-lane success requirement. The accept helper invalidated the patch because the issue `updated_at` changed from `2026-04-21T02:07:42.530Z` to `2026-04-21T02:19:01.811Z`, so the parent is applying the same bounded intent manually.
- 2026-04-21: parent evidence confirmed the issue statement directly: `package.json.version` is `0.1.38`, latest tag is `v0.1.38`, `main` remains more than 1200 commits ahead of the tag, `docs/public/downstream-setup.md` and `docs/public/provider-onboarding.md` are new since `v0.1.38`, and current README marketplace/plugin guidance also post-dates `v0.1.38`.
- 2026-04-21: docs-review child stream `co273-docs-review` ran before handoff, but its failure was inherited repo baseline noise from the existing docs-freshness/spec-frontmatter backlog rather than a packet-local defect. Parent retained the manifest as docs-first evidence and recorded the fallback instead of widening CO-273 scope.
- 2026-04-21: standalone review finished with `bounded-success`; the stale handoff-status and unrelated registry-row P2s were corrected, the final rerun found no actionable diff-local issues, and PR attachment / `pr ready-review` remain the only workflow handoff steps.
- 2026-04-21: manual elegance review kept the smallest correct solution and found no simplification patch worth landing. Evidence: `out/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/manual/elegance-review.md`.

## Notes
- Keep the lane docs/release-truthfulness scoped.
- Do not imply `docs/public/*` was present in `v0.1.38`.
- Do not force or imply a release as part of the fix.
- Review handoff remains pending only on PR attachment, clean `pr ready-review` drain, and the final Linear state transition.
