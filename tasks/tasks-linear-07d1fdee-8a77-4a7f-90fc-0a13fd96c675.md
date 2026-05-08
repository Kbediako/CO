# Task Checklist - CO-509 Auto-Created Issue Labels, Relations, and Traceability

- Primary PRD: `docs/PRD-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`
- Task spec: `tasks/specs/linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`
- Agent task: `.agent/task/linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`

## Checklist
- [x] Docs-first packet created and mirrored for CO-509. Evidence: this packet and registry updates on branch `kb/co-509-packet-traceability`.
- [x] User reminder translated into issue scope: automatic labels, related links, and packet/mirror traceability.
- [ ] Run `node scripts/spec-guard.mjs --dry-run`.
- [ ] Run `npm run docs:check`.
- [ ] Run `npm run docs:freshness`.
- [ ] Run docs/review gate before implementation work.
- [ ] Implement helper changes for labels, relations, canonical-owner reuse, and packet/mirror readiness or fail-closed evidence.
- [ ] Validate focused tests and full required gates before review handoff.

## Notes
- Fresh evidence comment: CO-509 comment `f440fafc-6bfe-4e87-aacb-5843a487467b` records the post-CO-508 queue audit and CO-517 relation repair path.
- CO-512 remains the separate governed review contract issue.
