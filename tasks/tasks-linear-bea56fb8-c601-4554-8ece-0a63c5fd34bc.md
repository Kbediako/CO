# Task Checklist - linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc

- Linear Issue: `CO-78` / `bea56fb8-c601-4554-8ece-0a63c5fd34bc`
- MCP Task ID: `linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc`
- Primary PRD: `docs/PRD-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`
- TECH_SPEC: `tasks/specs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`

## Docs-First
- [x] PRD drafted for the `CO-78` truthful default CO STATUS telemetry and Symphony parity lane. Evidence: `docs/PRD-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`; docs-review manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`.
- [x] TECH_SPEC drafted with the full visible default CO STATUS contract, parity matrix, and bounded implementation scope. Evidence: `tasks/specs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`, `docs/TECH_SPEC-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`; docs-review manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`.
- [x] ACTION_PLAN drafted for docs-review, implementation, live proof capture, and review handoff. Evidence: `docs/ACTION_PLAN-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`; docs-review manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`; docs-review manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`; docs-review manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`; docs-review manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`.
- [x] Checklist mirrored to `.agent/task/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`. Evidence: `.agent/task/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`; docs-review manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`.
- [x] Standalone pre-implementation self-review captured in the spec review notes. Evidence: `tasks/specs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`; docs-review manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`.
- [x] docs-review approval captured for `linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc`. Evidence: `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`, `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/review/telemetry.json`.

## Implementation
- [ ] Remove HTTP dashboard auto-start and the default `Dashboard:` URL line from the non-JSON `co-status` operator path. Evidence: pending.
- [ ] Restore truthful live header `Tokens` and `Throughput` values or explicit `n/a` semantics when authoritative data is unavailable. Evidence: pending.
- [ ] Surface Codex usage limits as the top-line rate-limit signal and clean up Linear budget rendering. Evidence: pending.
- [ ] Add/operator-align row semantics for `PID`, meaningful `EVENT`, truthful `AGE / TURN`, `TOKENS`, and `SESSION`. Evidence: pending.
- [ ] Keep the fix bounded to the current visible status truth path; file a follow-up if a larger upstream telemetry seam is discovered. Evidence: pending.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-78-docs-review --format json`. Evidence: `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`, `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/review/telemetry.json`.
- [ ] Capture terminal screenshot proof showing the exact command and normal live `CO STATUS` surface on this device. Evidence: pending.
- [ ] Capture terminal screenshot proof for paused/inspect state on this device. Evidence: pending.
- [ ] Capture terminal screenshot proof for compact or constrained-height state on this device. Evidence: pending.
- [ ] Capture terminal screenshot proof for empty or idle state on this device. Evidence: pending.
- [ ] Capture terminal screenshot proof for retry or degraded/unavailable telemetry state on this device. Evidence: pending.
- [ ] Focused regression coverage for launch/default behavior, telemetry aggregation, rate-limit rendering, row semantics, and degraded or empty states. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run pack:smoke`. Evidence: pending.
- [ ] Explicit elegance/minimality pass recorded after standalone review findings are addressed. Evidence: pending.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `fa4d6da0-c2f6-4bdb-bfe2-6a09b6533c9a`.
- [x] PR attached to the Linear issue before review-state transition. Evidence: `https://github.com/Kbediako/CO/pull/359`.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
