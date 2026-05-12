# ACTION_PLAN - CO-522 docs:freshness:maintain owner rehome

## Summary
- Goal: replace terminal `CO-511` as the live `docs:freshness:maintain` owner with live same-project `CO-522`.
- Scope: docs packet, owner metadata, registry mirrors, cohort guide, and validation evidence.
- Non-scope: CO-514 provider-worker manifest serialization, broad stale-doc repair, owner-verification code changes, and gate weakening.

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

## Protected Terms
- `docs:freshness`
- `docs:freshness:maintain`
- `canonical_owner_key=docs:freshness:maintain`
- `configured_owner_terminal`
- `CO-511`
- `CO-522`
- `block_diff_local`
- stale docs
- registry rows
- canonical owner reuse

## Not Done If
- `configured_owner_terminal` still names `CO-511` as the live owner blocker.
- `docs:freshness` or spec-guard is weakened.
- Stale docs are deleted or blindly refreshed.
- CO-514 implementation scope changes.

## Validation Checklist
- [x] Before owner-truth JSON captured.
- [x] After owner-truth JSON captured.
- [x] `node scripts/spec-guard.mjs --dry-run` run; it still reports pre-existing stale specs while exiting dry-run-success, preserving guard behavior.
- [x] `npm run docs:freshness` run; it still reports the existing 617 stale docs and zero missing registry rows.
- [x] `npm run docs:check` run.
- [x] Review/elegance evidence recorded: clean semantic review verdict and minimality pass, with PR/Linear lifecycle handoff still gated by freshness baseline policy.

## CO-382 Fallback Decision Table

Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-522 re-homes the existing docs freshness owner pointer without changing owner-verification code or broad stale-doc classification.
Minor-seam decision: expire the owner-routing seam under live CO-522 evidence while the stale cohort baseline remains visible and over budget.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Live owner pointer for repo-wide stale cohort baseline after terminal `CO-511` | expire fallback | CO-522 provider worker | `configured_owner_terminal` for `canonical_owner_key=docs:freshness:maintain` blocked provider-worker lanes | 2026-05-12 | 2026-05-12 | 2026-05-19 | Refresh, archive, or reclassify the underlying stale cohorts; if CO-522 stops verifying as a live same-project owner first, route through canonical owner reuse again | Before/after `docs:freshness:maintain -- --format json`; `docs:freshness` and spec-guard remain strict and still expose baseline stale debt |
