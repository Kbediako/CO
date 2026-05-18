# TECH_SPEC Mirror - CO-522 docs:freshness:maintain owner recovery

This mirror follows `tasks/specs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md`.

## Scope
- Re-home `docs:freshness:maintain` owner metadata from terminal `CO-511` to live `CO-522`.
- Preserve `canonical_owner_key=docs:freshness:maintain` and marker `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`.
- Preserve baseline evidence: `configured_owner_terminal`, `issue_state=Done`, `blocking_changed_paths=[]`, `freshness_decision=block_diff_local`, stale docs, and registry rows.
- Keep CO-514 provider-worker manifest serialization out of scope.
- 2026-05-18 recovery scope: keep CO-522 as the live owner and burn down the current `block_spec_guard_pre_expiry` gate reported by `docs:freshness:maintain`.
- Preserve handoff blocking while `repo_gate.blocks_handoff=true`; CO-512/PR #829 must remain draft or explicitly waived until this gate clears.
- Use the disposition manifest to route each stale/pre-expiry entry to review refresh, archive, reclassification, or same-project owner deferral.
- Verify archived-stub payloads are available on `doc-archives`, or record an explicit payload waiver before merge.

## Acceptance Criteria
- [x] CO-522 is the usable live same-project owner.
- [x] `docs:freshness:maintain -- --format json` no longer reports `configured_owner_terminal` for the canonical owner key.
- [x] Stale cohort evidence remains visible and owner-routed.
- [x] `docs:freshness` and spec-guard are not weakened.
- [x] The current `block_spec_guard_pre_expiry` gate is removed locally without a metadata-only date bump, cap/window expansion, or duplicate owner issue. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance-after-spec-lifecycle.json`. This is recovery-branch evidence, not final shared-root/control-host proof.
- [x] No action is resolved by a metadata-only `last_review` bump, cap/window expansion, or duplicate owner issue. Evidence: the recovery uses archive stubs, terminal lifecycle status, active-spec review metadata, and missing-index repair while leaving guard thresholds intact.
- [ ] Archive payload availability on `doc-archives` is verified, or an explicit payload waiver is recorded.
- [ ] Shared-root/control-host `co-status` and live `docs:freshness:maintain` agree that `blocks_handoff=false` before merge and before CO-512 advances.

## Validation
- Before and after `docs:freshness:maintain -- --format json`.
- `node scripts/spec-guard.mjs --dry-run`.
- `npm run docs:freshness`.
- `npm run docs:check`.
- `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/disposition-manifest.json` accounts for the stale and pre-expiry groups.
- `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json` and `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-disposition-summary.json` classify remaining pre-expiry specs as terminal, active, standalone, or index-repair-needed.
- `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance-after-spec-lifecycle.json` records `repo_gate.blocks_handoff=false` for the local recovery branch.
- `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-after-codex-rework.json` and `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance-after-codex-rework.json` record the final branch-local clean docs freshness and maintain gates after review rework.
- `.runs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-guard/cli/2026-05-18T08-17-21-680Z-82986f0f/manifest.json` records repo-local delegation/build/lint/test/spec-guard evidence.
- ChatGPT Pro advisory evidence from Browser session `CO-522 Freshness Blocker Strategy` supported the same classification path and explicitly rejected blind date bumps, guard weakening, duplicate owner issues, and declaring terminal before `blocks_handoff=false`.
- Focused freshness/archive tests if the recovery changes lifecycle classification or archive automation.
- Archive payload availability on `doc-archives`, or an explicit payload waiver, is required before merge.
- Shared-root/control-host `co-status --format json` or live `docs:freshness:maintain` after recovery must not report CO-522 as a handoff-blocking repo gate.

## CO-382 Fallback Decision Table

Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-522 re-homes the existing docs freshness owner pointer without changing owner-verification code or broad stale-doc classification.
Minor-seam decision: expire the owner-routing seam under live CO-522 evidence while the stale cohort baseline remains visible and over budget.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Live owner pointer for repo-wide stale cohort baseline after terminal `CO-511` | expire fallback | CO-522 provider worker | `configured_owner_terminal` for `canonical_owner_key=docs:freshness:maintain` blocked provider-worker lanes | 2026-05-12 | 2026-05-12 | 2026-05-19 | Refresh, archive, or reclassify the underlying stale cohorts; if CO-522 stops verifying as a live same-project owner first, route through canonical owner reuse again | Before/after `docs:freshness:maintain -- --format json`; `docs:freshness` and spec-guard remain strict and still expose baseline stale debt |
