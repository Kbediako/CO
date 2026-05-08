# Agent Task - CO-509 Auto-Created Issue Labels, Relations, and Traceability

- PRD: `docs/PRD-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`
- Checklist: `tasks/tasks-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`
- Task spec: `tasks/specs/linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`

## Execution Notes
- Keep implementation narrow to provider-created issue readiness.
- Use live Linear issue-context before any state transition.
- Preserve WIP caps and existing queue semantics.
- Do not treat packet/mirror traceability as manual cleanup when the helper can prove or fail closed on the missing evidence.
- Implementation note: `create-follow-up` success evidence carries structured `traceability` for labels, relations, and packet/mirror readiness; CLI output/audit converts packet-blocked Backlog follow-ups to `ok:false` before retry suppression can create duplicates; packet-prefix readiness is section/fence-aware and accepts Linear `-` / `*` bullet normalization.

## Checklist Mirror
- [x] Docs-first packet created and mirrored for CO-509. Evidence: this packet, registry updates on branch `kb/co-509-packet-traceability`, and provider run manifest `.runs/linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675/cli/2026-05-08T08-57-11-331Z-373e9a19/manifest.json`.
- [x] User reminder translated into issue scope: automatic labels, related links, and packet/mirror traceability.
- [x] Run `node scripts/spec-guard.mjs --dry-run`. Evidence: passed locally on 2026-05-08.
- [x] Run `npm run docs:check`. Evidence: passed locally on 2026-05-08.
- [x] Run `npm run docs:freshness`. Evidence: passed locally on 2026-05-08 with 5309 docs and 5312 registry entries.
- [x] Run manifest-backed standalone/elegance review gate before review handoff. Evidence: `.runs/linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675/cli/2026-05-08T08-57-11-331Z-373e9a19/review/telemetry.json` returned `review_verdict=clean`, `finding_count=0`.
- [x] Implement helper changes for labels, relations, canonical-owner reuse, and packet/mirror readiness or fail-closed evidence. Evidence: `ProviderLinearCreateFollowUpResult.traceability` now returns label, relation, and packet admission evidence while preserving existing `relations` booleans; CLI output/audit converts packet-blocked Backlog follow-ups to `ok:false` before retry suppression can create duplicates; packet-prefix readiness is section/fence-aware and accepts Linear `-` / `*` bullet normalization.
- [x] Validate focused tests for the helper changes. Evidence: `npm run test:core -- orchestrator/tests/ProviderLinearWorkflowFacade.test.ts orchestrator/tests/LinearCliShell.test.ts` passed 343 tests after the packet-readiness, CLI audit fail-closed, registry mirror, and fence-aware prefix fixes; child-lane test evidence manifest `.runs/linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675-relation-label-tests/cli/2026-05-08T09-00-40-903Z-f3b55a86/manifest.json`.
- [x] Validate full required gates before review handoff. Evidence: delegation guard, spec guard, build, lint, test, docs checks, stewardship, diff-budget, and pack-smoke passed locally on 2026-05-08; `npm run test` passed 359 files / 5527 tests; provider run manifest `.runs/linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675/cli/2026-05-08T08-57-11-331Z-373e9a19/manifest.json`.
