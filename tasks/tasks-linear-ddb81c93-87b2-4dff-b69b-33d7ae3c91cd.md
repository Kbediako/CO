# Task Checklist - linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd

- Linear Issue: `CO-240` / `ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- MCP Task ID: `linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- Primary PRD: `docs/PRD-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- TECH_SPEC: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- Shared source 0 anchor: `ctx:sha256:80949939d67126c2c2bb65ec2935ce53a96a87f8e4e7e3b5fd8ff2ecf48992d4#chunk:c000001`
- Source object id: `sha256:80949939d67126c2c2bb65ec2935ce53a96a87f8e4e7e3b5fd8ff2ecf48992d4`
- Origin manifest: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/manifest.json`

## Docs-First
- [x] PRD drafted for reclaim / reclassify / re-admit across `Backlog` -> `Ready` under plain released/not-active residue. Evidence: `docs/PRD-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`.
- [x] TECH_SPEC drafted with protected terms, adjacent reclaim boundaries, and validation guidance. Evidence: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`, `docs/TECH_SPEC-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`.
- [x] Checklist mirrored to `.agent/task/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`. Evidence: `.agent/task/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md` readiness gate.
- [x] Child lane kept shared registries parent-owned (`tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`). Evidence: final diff is limited to the six packet files.

## Workflow
- [x] Child lane stayed docs-only and did not mutate Linear state or the parent workpad. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane left changes uncommitted for parent patch export. Evidence: `git status --short`.
- [x] Parent lane imported the docs packet, updated shared registries, and ran parent-owned validation/review closeout. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `node scripts/spec-guard.mjs --dry-run`, `out/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/manual/20260418T060151Z-standalone-review-fallback.md`, `out/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/manual/20260418T060151Z-elegance-review.md`.

## Implementation Acceptance
- [x] A stale plain `provider_issue_released:not_active` row cached as `Backlog` is reclaimed / reclassified / re-admitted through the normal control-host path when live truth is `Ready`. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] One free slot / `max_allowed=3` is sufficient to admit the eligible issue without broad `max-concurrency` changes. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] The reclaim path stays on the normal control-host admission flow rather than `manual-launch`. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] The lane is not limited to `stale-Blocked-only`; the `Backlog` / `Ready` path now has explicit focused coverage. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] `CO-236` adjacency and prior reclaim/fair-admission lanes remain preserved because the final diff adds coverage only and leaves production reclaim logic unchanged. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/manual/20260418T060151Z-standalone-review-fallback.md`.

## Validation
- [x] Parent focused provider handoff regression for plain released/not-active `Backlog` -> `Ready` reclaim / re-admit passes. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Parent focused free-slot regression for one free slot / `max_allowed=3` passes. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Parent focused adjacent regression review for the stale-`Blocked` completed-blocker reclaim seam still passes. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] `node scripts/delegation-guard.mjs` and `node scripts/spec-guard.mjs --dry-run` pass after patch import. Evidence: current workspace validation run plus `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-guard/cli/2026-04-18T05-45-44-461Z-6d3e4681/manifest.json`.
- [x] `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` pass on the final diff. Evidence: current workspace validation run.
- [x] `npm run docs:freshness` only fails on the pre-existing repo baseline (`stale docs: 70`, rolling cohort `CO-175`), not on the `CO-240` packet. Evidence: current workspace validation run.
- [x] Standalone review and explicit elegance review are recorded before PR handoff. Evidence: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/cli/2026-04-18T05-18-28-716Z-2ed043eb/review/telemetry.json`, `out/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/manual/20260418T060151Z-standalone-review-fallback.md`, `out/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/manual/20260418T060151Z-elegance-review.md`.

## Progress Log
- 2026-04-18: Bounded same-issue child lane created the `CO-240` docs-first packet only. The packet preserves `CO-236`, `Ready`, `Backlog`, `provider_issue_released:not_active`, `provider-intake-state.json`, free slot / `max_allowed=3`, reclaim / reclassify / re-admit, and explicitly rejects `max-concurrency`, `manual-launch`, `stale-Blocked-only`, and generic `refresh-loop` reinterpretations.
- 2026-04-18: Parent lane imported the packet into the shared registries, verified current source already rechecks stale non-active released claims, and tightened focused regression coverage to the real `2 running / max_allowed=3 / 1 free slot` incident shape instead of landing a production control-host patch.
- 2026-04-18: Final closeout recorded full validation, a manual standalone-review fallback after the follow-up wrapper rerun failed to produce a fresh verdict promptly, and an explicit elegance pass confirming the minimal outcome is docs plus regression coverage only.
