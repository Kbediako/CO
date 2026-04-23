# Task Mirror - CO-318

- Issue: current `origin/main` fails `node scripts/spec-guard.mjs` because six active task specs still have `last_review: 2026-03-23`.
- Scope: create the packet, preserve current-main evidence, re-review and refresh only the exact six stale specs, and prove the unblock.
- Non-goals: `spec-guard` weakening, `CO-314` release-workflow edits, and broad docs-freshness cleanup.

## Status
- [x] Docs-first packet exists and preserves the protected terms. Evidence: `docs/PRD-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `docs/TECH_SPEC-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `docs/ACTION_PLAN-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`.
- [x] Accepted bounded child-lane evidence note is present in the parent workspace. Evidence: `.runs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be-co318-baseline-note/cli/2026-04-23T00-50-56-747Z-05f99f52/manifest.json`, `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0051Z-child-lane-baseline-note.md`.
- [x] Pre-implementation docs-review fallback is recorded. Evidence: `.runs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be-docs-review/cli/2026-04-23T01-02-51-949Z-949cc108/manifest.json`, `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0103Z-docs-review-fallback.md`.
- [x] The six stale specs are refreshed and validated. Evidence: `tasks/specs/0975-codex-cli-capability-adoption-redesign.md`, `tasks/specs/0976-context-alignment-checker-option2.md`, `tasks/specs/1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `tasks/specs/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`, `tasks/specs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`, `tasks/specs/linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`, and `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/after/spec-guard.log`.
