# Task Checklist - linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc

- Linear Issue: `CO-98` / `bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc`
- MCP Task ID: `linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc`
- Primary PRD: `docs/PRD-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`
- TECH_SPEC: `tasks/specs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`

## Docs-First
- [x] PRD drafted for the `CO-98` root live `CO STATUS` telemetry lane. Evidence: `docs/PRD-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`.
- [x] TECH_SPEC drafted with the root runtime/proof/aggregation/rendering seams and direct root-host validation requirements. Evidence: `tasks/specs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`, `docs/TECH_SPEC-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`. Evidence: `.agent/task/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`.
- [x] Standalone pre-implementation self-review captured in the spec review notes. Evidence: `tasks/specs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`.
- [ ] docs-review approval captured for `linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc`. Evidence: pending.

## Implementation
- [ ] Diagnose the remaining root live telemetry gap so the fix stays on the authoritative truth path rather than the screenshot/workspace path. Evidence: pending.
- [ ] Restore truthful root header `Tokens` and `Throughput` during active provider-worker runs when telemetry exists. Evidence: pending.
- [ ] Restore truthful running-row `TOKENS` and `SESSION` during active provider-worker runs when telemetry exists. Evidence: pending.
- [ ] Surface authoritative Codex `5-hour` and `weekly` segments on root `Rate Limits` when telemetry exists. Evidence: pending.
- [ ] Keep the fix bounded to the root telemetry path and file a follow-up if a larger seam is discovered. Evidence: pending.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-98-docs-review --format json`. Evidence: pending.
- [ ] Capture terminal screenshot proof showing corrected live root `CO STATUS` output during active usage on this device and embed it directly in Linear. Evidence: pending.
- [ ] Focused parser/projection/dashboard regressions for token/session extraction, throughput, and Codex `5-hour` / `weekly` rendering. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run pack:smoke`. Evidence: pending if downstream-facing paths are touched.
- [ ] Explicit elegance/minimality pass recorded after standalone review findings are addressed. Evidence: pending.

## Handoff
- [ ] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
