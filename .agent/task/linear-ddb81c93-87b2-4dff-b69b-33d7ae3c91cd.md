# Task Checklist - linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd

- Linear Issue: `CO-240` / `ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- MCP Task ID: `linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- Primary PRD: `docs/PRD-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- TECH_SPEC: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- Shared source 0 anchor: `ctx:sha256:d9365323dac6ad108d41e8fa814e4db0b1289afd27b99792772cc415b42c5567#chunk:c000001`
- Source object id: `sha256:d9365323dac6ad108d41e8fa814e4db0b1289afd27b99792772cc415b42c5567`
- Origin manifest: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/cli/2026-04-18T05-17-55-861Z-bc7da941/manifest.json`

## Docs-First
- [x] PRD drafted for reclaim / reclassify / re-admit across `Backlog` -> `Ready` under plain released/not-active residue. Evidence: `docs/PRD-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`.
- [x] TECH_SPEC drafted with protected terms, adjacent reclaim boundaries, and validation guidance. Evidence: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`, `docs/TECH_SPEC-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`.
- [x] Checklist mirrored to `.agent/task/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`. Evidence: `.agent/task/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md` readiness gate.
- [x] Child lane kept shared registries parent-owned (`tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`). Evidence: exported child patch `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/provider-linear-child-lane.patch` touched only the six issue-scoped packet files; parent registry edits happened during import.

## Workflow
- [x] Child lane stayed docs-only and did not mutate Linear state or the parent workpad. Evidence: child-lane manifest `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/manifest.json`; parent lane handled issue transitions and workpad refreshes separately.
- [x] Child lane did not edit implementation or test files. Evidence: exported child patch `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/provider-linear-child-lane.patch` contains only issue-scoped docs; `orchestrator/tests/ProviderIssueHandoff.test.ts` was added later by the parent lane.
- [x] Child lane left its packet for parent patch export instead of committing in-lane. Evidence: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/provider-linear-child-lane.patch`.
- [x] Parent lane accepted and refined the packet, updated shared registries, and ran parent-owned docs-review/spec-guard. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `node scripts/spec-guard.mjs --dry-run`, `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-review/cli/2026-04-18T05-37-55-111Z-338dae32/manifest.json`.

## Implementation Acceptance
- [ ] A live issue that moved from `Backlog` to `Ready` while plain `provider_issue_released:not_active` residue remained is reclaimed / reclassified / re-admitted through the normal control-host path. Evidence: pending parent implementation and focused regression.
- [ ] One free slot / `max_allowed=3` is sufficient to admit the eligible issue; the fix does not become a generic `max-concurrency` rewrite. Evidence: pending focused regression.
- [ ] The fix does not require `manual-launch`. Evidence: pending parent implementation and focused regression.
- [ ] The fix is not limited to `stale-Blocked-only`; the `Backlog` / `Ready` path is covered explicitly. Evidence: pending focused regression.
- [ ] `CO-236` adjacency and prior reclaim/fair-admission lanes remain preserved. Evidence: pending parent validation and review.

## Validation
- [ ] Parent focused provider handoff regression for plain released/not-active `Backlog` -> `Ready` reclaim / re-admit. Evidence: pending.
- [ ] Parent focused free-slot regression for one free slot / `max_allowed=3`. Evidence: pending.
- [ ] Parent focused adjacent regression review for `CO-202`, `CO-203`, `CO-212`, and `CO-181` if the chosen seam touches them. Evidence: pending.
- [ ] Parent docs-review / `node scripts/spec-guard.mjs --dry-run` after patch import. Evidence: pending.
- [ ] Parent required validation/review/elegance gates before PR handoff. Evidence: pending.

## Progress Log
- 2026-04-18: Bounded same-issue child lane created the `CO-240` docs-first packet only. The packet preserves `CO-236`, `Ready`, `Backlog`, `provider_issue_released:not_active`, `provider-intake-state.json`, free slot / `max_allowed=3`, reclaim / reclassify / re-admit, and explicitly rejects `max-concurrency`, `manual-launch`, `stale-Blocked-only`, and generic `refresh-loop` reinterpretations.
