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
- Implementation note: `create-follow-up` success output now carries structured `traceability` evidence for labels, relations, packet/mirror readiness, and a Backlog queue-admission blocker only when required packet evidence is missing.

## Checklist Mirror
- [x] Docs-first packet created and mirrored for CO-509. Evidence: this packet and registry updates on branch `kb/co-509-packet-traceability`.
- [x] User reminder translated into issue scope: automatic labels, related links, and packet/mirror traceability.
- [x] Run `node scripts/spec-guard.mjs --dry-run`. Evidence: passed locally on 2026-05-08.
- [x] Run `npm run docs:check`. Evidence: passed locally on 2026-05-08.
- [x] Run `npm run docs:freshness`. Evidence: passed locally on 2026-05-08 with 5309 docs and 5312 registry entries.
- [x] Run manifest-backed standalone/elegance review gate before review handoff. Evidence: final `codex-orchestrator review --uncommitted` returned `review_verdict=clean`, `finding_count=0`.
- [x] Implement helper changes for labels, relations, canonical-owner reuse, and packet/mirror readiness or fail-closed evidence. Evidence: `ProviderLinearCreateFollowUpResult.traceability` now returns label, relation, and packet admission evidence while preserving existing `relations` booleans.
- [x] Validate focused tests for the helper changes. Evidence: `npm run test:core -- orchestrator/tests/ProviderLinearWorkflowFacade.test.ts orchestrator/tests/LinearCliShell.test.ts` passed 339 tests after the repo-root packet-readiness fix.
- [x] Validate full required gates before review handoff. Evidence: delegation guard, spec guard, build, lint, test, docs checks, stewardship, diff-budget, and pack-smoke passed; `npm run test` passed 359 files / 5523 tests.
