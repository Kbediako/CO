# Task Checklist - linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7

- Linear Issue: `CO-451` / `a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7`
- MCP Task ID: `linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7`
- Registry Task ID: `20260501-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7`
- Primary PRD: `docs/PRD-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`
- Task spec: `tasks/specs/linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`

## Docs-First
- [x] PRD drafted for Agent Identity auth provenance. Evidence: `docs/PRD-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`.
- [x] TECH_SPEC drafted with protected wording, parity matrix, and validation plan. Evidence: `docs/TECH_SPEC-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`, `tasks/specs/linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`.
- [x] ACTION_PLAN drafted for bounded sequencing. Evidence: `docs/ACTION_PLAN-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`.
- [x] Registry mirrors created in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: declared registry files.
- [x] Task checklist and `.agent` mirror drafted. Evidence: `tasks/tasks-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`, `.agent/task/linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md`.

## Source / Assumptions
- [x] Source anchor preserved. Evidence: `ctx:sha256:1d12d17d552faf262c39610bc990b49e2ef3876d873fd0a767bb239d258e9ce0#chunk:c000001`.
- [x] Metadata-only source payload recorded. Evidence: source payload contains run metadata and issue id, while live Linear issue description carries implementation requirements.
- [x] Relationship to adjacent intake work preserved. Evidence: PRD/TECH_SPEC non-goals keep CO-449 as release-intake owner and CO-450 as binary-provenance owner.

## Packet Content
- [x] Protected wording preserved. Evidence: Agent Identity, `codex login --with-agent-identity`, `CODEX_AGENT_IDENTITY`, cloud preflight credential-source detection, provider-worker/runtime auth provenance, redaction/reporting paths.
- [x] Current/reference/target truth distinguishes unknown provenance from known Agent Identity provenance. Evidence: PRD and TECH_SPEC parity/alignment matrix sections.
- [x] Non-goals reject raw identity logging, broad auth redesign, CLI posture promotion, workflow pin changes, CO-449 expansion, and CO-450 expansion.

## Implementation
- [x] Cloud preflight recognizes `CODEX_AGENT_IDENTITY`. Evidence: `orchestrator/src/cli/utils/cloudPreflight.ts`, `orchestrator/tests/CloudPreflight.test.ts`.
- [x] Provider-worker runtime env provenance recognizes `CODEX_AGENT_IDENTITY`. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Provider-worker auth-event parsing recognizes safe Agent Identity labels while preserving redaction. Evidence: Agent Identity container and redaction regressions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Docs/help surfaces are updated only if user-visible wording changes. Evidence: no user-facing docs/help surface outside the task packet required a wording update.

## Validation
- [x] Docs-review completed before implementation edits. Evidence: `.runs/linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7-docs-review/cli/2026-05-01T00-57-58-020Z-c830f7ba/manifest.json`; the earlier CO-444 docs-freshness blocker no longer reproduces after current-main refresh.
- [x] Targeted CloudPreflight test passes. Evidence: `npm test -- --run orchestrator/tests/CloudPreflight.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts` passed 286 tests after final redaction fix.
- [x] Targeted ProviderLinearWorkerRunner test passes. Evidence: same targeted command passed 286 tests.
- [x] Required repo gates pass after current-main refresh. Evidence: delegation guard, spec guard, build, lint, clean-env full test, docs:check, docs:freshness, repo:stewardship, diff-budget, git diff --check, and pack:smoke passed.
- [x] Final manifest-backed standalone review rerun passes under `FORCE_CODEX_REVIEW=1`. Evidence: `.runs/linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7/cli/2026-05-01T16-41-57-405Z-39b1234f/review/telemetry.json` recorded `review_outcome=bounded-success` via command-intent retry with no actionable findings.
- [x] Elegance/minimality review completed. Evidence: `out/linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7/manual/elegance-review.md`.
- [ ] PR attached and `pr ready-review` drain clean before In Review. Evidence: pending PR creation, checks, feedback sweep, and drain.

## Handoff Status
- [x] Parent integrates child-lane provider-runner test patch. Evidence: accepted child lane `agent-identity-provider-tests`, run `2026-05-01T00-55-15-765Z-ec13a34d`.
- [ ] Parent opens and attaches PR. Evidence: pending after final standalone review and elegance completion.
- [ ] Parent refreshes Linear workpad and transitions to In Review only after clean validation and feedback drain. Evidence: pending PR checks and `pr ready-review` clean drain.
