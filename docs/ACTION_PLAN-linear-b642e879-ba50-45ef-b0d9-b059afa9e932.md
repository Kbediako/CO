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
