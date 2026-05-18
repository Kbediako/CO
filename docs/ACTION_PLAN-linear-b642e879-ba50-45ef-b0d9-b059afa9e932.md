# ACTION_PLAN - CO-522 docs:freshness:maintain owner recovery

## Summary
- Goal: replace terminal `CO-511` as the live `docs:freshness:maintain` owner with live same-project `CO-522`.
- Scope: docs packet, owner metadata, registry mirrors, cohort guide, and validation evidence.
- Non-scope: CO-514 provider-worker manifest serialization, broad stale-doc repair, owner-verification code changes, and gate weakening.
- 2026-05-18 update: the owner rehome is complete, but `docs:freshness:maintain` now blocks handoff with `block_spec_guard_pre_expiry`, `action_required_count=180`, and `blocks_handoff=true`. CO-522 remains the canonical owner and now owns the active burn-down lane.

## Steps
1. Read live Linear issue context and move CO-522 from `Ready` to `In Progress`.
2. Record the required pre-turn decomposition matrix and `parallelize_now` decision.
3. Capture before `docs:freshness:maintain -- --format json` evidence.
4. Re-home `docs/docs-catalog.json` from `CO-511` to `CO-522`.
5. Update `docs/guides/docs-freshness-cohorts.md` with CO-511 terminal evidence and CO-522 live-owner disposition.
6. Create packet files and registry mirrors.
7. Capture after `docs:freshness:maintain -- --format json` evidence.
8. Run docs/spec validation and review/elegance gates as required.
9. Refresh the workpad and hand off only after the owner-truth blocker is cleared or explicitly split.
10. Capture the 2026-05-18 `block_spec_guard_pre_expiry` report and disposition manifest under `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/`.
11. Review/update current docs first: `docs/guides/review-artifacts.md`, strict pre-expiry active/public docs, and shipped skill docs.
12. Resolve spec pre-expiry actions through real spec review, archive, reclassification, or same-project owner deferral.
13. Resolve historical task/report stale cohorts structurally through archive/lifecycle truth rather than date-only edits.
14. Record recurrence evidence on CO-552 while preserving CO-522 as the immediate owner.
15. Keep CO-512 / PR #829 draft until PR #833 lands and post-merge shared-root `docs:freshness:maintain` and `co-status` report `blocks_handoff=false`.
16. Verify archived-stub payloads are available on `doc-archives`, or record an explicit archive-payload waiver before merge.

## Protected Terms
- `docs:freshness`
- `docs:freshness:maintain`
- `canonical_owner_key=docs:freshness:maintain`
- `configured_owner_terminal`
- `block_spec_guard_pre_expiry`
- `blocks_handoff=true`
- `action_required_count=180`
- `CO-511`
- `CO-522`
- `CO-552`
- `block_diff_local`
- stale docs
- registry rows
- canonical owner reuse

## Not Done If
- `configured_owner_terminal` still names `CO-511` as the live owner blocker.
- `docs:freshness` or spec-guard is weakened.
- Stale docs are deleted or blindly refreshed.
- CO-514 implementation scope changes.
- `blocks_handoff=true` remains after PR #833 lands and the post-merge shared-root/control-host proof is collected.
- CO-512 advances while the CO-522 gate remains active.
- CO-552 absorbs the immediate owner work and makes CO-522 ownership ambiguous.
- Archived stubs point at `doc-archives` content that is unavailable and no explicit payload waiver exists.
- Branch-local clean reports are treated as shared-root/control-host proof.
- Pre-merge shared-root/control-host proof is claimed without the explicit waiver and post-merge/downstream-unblock gate recorded in this packet.

## Validation Checklist
- [x] Before owner-truth JSON captured.
- [x] After owner-truth JSON captured.
- [x] `node scripts/spec-guard.mjs --dry-run` run; it still reports pre-existing stale specs while exiting dry-run-success, preserving guard behavior.
- [x] `npm run docs:freshness` run; it still reports the existing 617 stale docs and zero missing registry rows.
- [x] `npm run docs:check` run.
- [x] Review/elegance evidence recorded: local Codex review wrapper completed with no counted findings but `review_verdict=unknown` after a bounded command-intent stop, so this is evidence rather than semantic approval; final PR handoff still requires model-backed review or explicit waiver. Minimality pass remains required before PR.
- [x] 2026-05-18 recovery evidence captured: `docs:freshness:maintain` reports `block_spec_guard_pre_expiry`, `owner_issue=CO-522`, `state=Blocked`, `current_entries=275`, `current_cohorts=13`, `action_required_count=180`, and `blocks_handoff=true`.
- [x] Disposition manifest generated with four groups: hard-stale current docs, strict pre-expiry current docs, spec-guard pre-expiry active specs, and historical task/report stale cohorts.
- [x] Current docs and shipped skill entries reviewed or explicitly owner-deferred with evidence. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-after-spec-lifecycle.json` has `stale_entries=0`, `missing_in_registry=0`, `invalid_entries=0`, and `uncatalogued_docs=0`.
- [x] Active spec pre-expiry entries reviewed, archived, reclassified, or owner-deferred with evidence. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json` and `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-disposition-summary.json` classify `terminal=59`, `active=94`, `standalone=1`, and repair the remaining active missing-index path through `tasks/index.json`.
- [x] Historical task/report stale cohorts archived or lifecycle-corrected without broad date-only refresh. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/archive-apply-after-spec-lifecycle/docs-archive-report.json` archives 355 terminal implementation docs and `docs:freshness` reports zero terminal lifecycle entries after the spec lifecycle pass.
- [x] `docs:freshness:maintain --check --format json`, `npm run docs:freshness`, `node scripts/spec-guard.mjs --dry-run`, and `npm run docs:check` rerun after recovery as branch-local validation. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance-after-codex-rework.json` reports local `freshness_decision=clean`, `repo_gate.action_required_count=0`, and `repo_gate.blocks_handoff=false`; `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-after-codex-rework.json` reports zero stale, zero missing, zero invalid, and zero uncatalogued docs; terminal `npm run docs:freshness`, `node scripts/spec-guard.mjs --dry-run`, and `npm run docs:check` passed. This does not replace shared-root/control-host proof.
- [x] Minimality pass complete: changed paths are confined to docs/task metadata, `.agent` task mirrors, the release skill note, and freshness catalog/registry data; no runtime scripts or implementation code changed.
- [x] Archive payload availability on `doc-archives` is verified, or an explicit payload waiver is recorded. Evidence: `origin/doc-archives` commit `cd4982cffaf30e7ef17d53871402ca1706586438` contains the CO-522 archive payload; `git ls-tree` verified representative archived stubs `.agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md` and `tasks/tasks-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`.
- [x] Pre-merge shared-root/control-host proof waiver is recorded for PR #833. Evidence: clean latest `main` still reports `owner=CO-522` and `blocks_handoff=true`; this is expected before the branch lands, so the proof is deferred to a post-merge/downstream-unblock gate rather than faked or collected by pointing the control host at the PR branch.
- [ ] Post-merge/downstream-unblock gate: after PR #833 lands and shared root fast-forwards to merged `main`, shared-root `co-status --format json` or live `docs:freshness:maintain` no longer reports the CO-522 repo gate as handoff-blocking.

## CO-382 Fallback Decision Table

Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-522 re-homes the existing docs freshness owner pointer without changing owner-verification code or broad stale-doc classification.
Minor-seam decision: expire the owner-routing seam under live CO-522 evidence while the stale cohort baseline remains visible and over budget.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Live owner pointer for repo-wide stale cohort baseline after terminal `CO-511` | expire fallback | CO-522 provider worker | `configured_owner_terminal` for `canonical_owner_key=docs:freshness:maintain` blocked provider-worker lanes | 2026-05-12 | 2026-05-12 | 2026-05-19 | Refresh, archive, or reclassify the underlying stale cohorts; if CO-522 stops verifying as a live same-project owner first, route through canonical owner reuse again | Before/after `docs:freshness:maintain -- --format json`; `docs:freshness` and spec-guard remain strict and still expose baseline stale debt |
