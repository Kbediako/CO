# Task Checklist - linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc

- Linear Issue: `CO-486` / `6a92b5d9-3293-4e27-9bc5-28c8c62becfc`
- MCP Task ID: `linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc`
- PRD: `docs/PRD-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`
- Checklist mirror: `.agent/task/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`
- Parent manifest: `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-checklist-scaffold/cli/2026-05-02T15-15-46-450Z-560e82b6/manifest.json`
- Source anchor: `ctx:sha256:c43c991f5bad4fef277b4bf219d3ff2c3ce1bb5e17e8fbfb0224249bb7752e38#chunk:c000001`

## Docs-First Scaffold
- [x] Source payload path checked and available. Evidence: `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-checklist-scaffold/cli/2026-05-02T15-15-46-450Z-560e82b6/memory/source-0/source.txt`; the adjacent index records `sha256:c43c991f5bad4fef277b4bf219d3ff2c3ce1bb5e17e8fbfb0224249bb7752e38`.
- [x] ACTION_PLAN drafted inside declared file scope. Evidence: `docs/ACTION_PLAN-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`.
- [x] Task checklist drafted inside declared file scope. Evidence: `tasks/tasks-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`.
- [x] Child lane avoided parent-owned docs, registries, source, tests, canary commands, validation scripts, Linear, GitHub, workpad, and PR lifecycle surfaces. Evidence: scoped changed-file review.

## Protected Issue Terms
- [x] live Codex CLI `0.128.0`
- [x] persisted `/goal` canary
- [x] manifest evidence contract
- [x] workpad evidence contract
- [x] provider-worker recovery classification
- [x] long-poll recovery classification
- [x] hook recovery classification
- [x] no hook/resume integration

## Parent-Owned Follow-On
- [x] Reconcile this scaffold against current CO-486 Linear issue/workpad truth before relying on it. Evidence: workpad `cc4448a5-d864-4bfa-90b7-6cff14b55b60` refreshed after child acceptance.
- [x] Refresh or confirm parent-owned PRD and TECH_SPEC without using this child lane to edit those files. Evidence: `docs/PRD-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `docs/TECH_SPEC-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`.
- [x] Run or record the live Codex CLI `0.128.0` persisted `/goal` canary under the authoritative runtime surface. Evidence: `codex-cli 0.128.0`, `features.goals=true`, app-server schema/type artifacts, direct model-tool goal state, and `codex exec` / `codex exec resume` persistence proof recorded in the TECH_SPEC.
- [x] Capture manifest evidence for the canary, including command/runtime version, setup, operation under test, persistence check, outcome, artifacts, and blocker classification if blocked. Evidence: `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc/manual/goal-surface-json-schema`, `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc/manual/goal-surface-ts`, `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc/manual/goal-persistence/resume-session-evidence.json`.
- [x] Capture workpad evidence that points to the manifest and summarizes canary outcome, recovery classifications, and remaining blockers. Evidence: Linear workpad `cc4448a5-d864-4bfa-90b7-6cff14b55b60`.
- [x] Classify provider-worker recovery behavior separately from long-poll recovery behavior and hook recovery behavior. Evidence: TECH_SPEC `Classification By Workflow Surface`.
- [x] Keep hook/resume integration out of scope; route any required hook/resume implementation to a separate owner lane. Evidence: follow-up `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73` covers advisory `goal_evidence` capture only.
- [x] Run parent-owned focused validation for imported docs changes. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, JSON parse checks, `git diff --check`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs`.
- [ ] Complete parent-owned PR lifecycle and Linear handoff, including final standalone review, elegance status, PR attachment, checks, and ready-review drain.

## Validation
- [x] Scoped trailing-whitespace hygiene passes. Evidence: scoped Perl scan for trailing whitespace over the three declared files exited cleanly.
- [x] Protected-term scan covers the three scaffold files. Evidence: scoped `rg` over protected CO-486 terms returned matches.
- [x] Scoped status review confirms edits stayed inside declared file scope. Evidence: `git status --short` and `git ls-files --others --exclude-standard` list only the three declared scaffold files.
- [x] Parent docs-review or equivalent packet review completed. Evidence: `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-review/cli/2026-05-02T15-25-40-851Z-0acbfb39/manifest.json`; P2 persistence concern addressed with resume-session evidence.
- [x] Parent live canary proof reviewed. Evidence: parent TECH_SPEC canary evidence section.
- [x] Parent manifest/workpad evidence contract reviewed. Evidence: parent TECH_SPEC evidence contract and refreshed Linear workpad.
- [x] Parent validation suite passed. Evidence: delegation/spec guards, JSON parse, diff hygiene, build, lint, test, docs:check, docs:freshness, repo:stewardship, and diff-budget commands completed cleanly.
- [x] Review-gate evidence is not self-authorized in tracked packet docs; final standalone/elegance status is recorded in the Linear workpad before PR review handoff.

## Progress Log
- 2026-05-02T16:15:44Z: Bounded same-issue docs child lane created the CO-486 ACTION_PLAN and checklist mirrors only. The scaffold preserves live `0.128.0` persisted `/goal` canary, manifest/workpad evidence contract, provider-worker/long-poll/hook recovery classification, and no hook/resume integration as protected terms.
- 2026-05-02T16:15:44Z: Parent canary and validation gates are clean; PR lifecycle remains open until final standalone/elegance status, PR attachment, checks, feedback drain, and Linear review handoff complete.

## Notes
- Do not edit PRD, TECH_SPEC, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, source code, tests, package files, canary commands, validation scripts, Linear, GitHub, workpad, or PR lifecycle surfaces in this child lane.
- Do not decide the final canary result in this child lane.
- Do not add hook/resume integration in this lane.
