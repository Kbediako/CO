# Action Plan: CO-430 re-home live docs freshness maintenance owner

## Scope

- Task id: `linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c`
- Registry id: `20260430-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c`
- Linear issue: `CO-430`
- Issue id: `b78c98eb-8ed4-4e19-9099-81d5e34bb33c`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Plan

1. Register the CO-430 packet and mirror references required before the helper-created follow-up can leave `Backlog`.
2. Preserve the issue-shaping contract: terminal `CO-425`, canonical owner key `docs:freshness:maintain`, CO-429 six-row boundary, CO-428 active-spec boundary, and no policy weakening.
3. Normalize acceptance criteria into real Markdown checkboxes.
4. Reproduce `docs:freshness:maintain` terminal-owner output for `CO-425` and save the before evidence.
5. Re-home `docs/docs-catalog.json` owner metadata to active same-project `CO-430` and update the docs freshness cohort guide.
6. Validate implementation with freshness gates, review, and PR lifecycle before unblocking CO-429.

## Acceptance Criteria

- [x] Reproduce `docs:freshness:maintain` terminal-owner output.
- [x] Reuse or create the live same-project `docs:freshness:maintain` owner.
- [x] Keep `docs:freshness` policy and rolling/candidate debt visible.
- [x] `docs:freshness:maintain` reports a non-terminal same-project owner or a justified replacement blocker.

## Validation

- [x] Packet files exist and mirror entries include `linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c`.
- [x] `tasks/index.json` and `docs/docs-freshness-registry.json` parse as JSON.
- [x] Protected-term scan covers `CO-430`, `docs:freshness:maintain`, and `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`.
- [x] Provider implementation runs `docs:freshness`, `docs:freshness:maintain`, and required handoff gates without weakening policy. Owner re-home validation is complete; standalone review handoff was blocked by separate March 30 spec/candidate debt, and the CO-428 integration branch now validates both repairs together.

## Risks

- CO-430 and CO-427 can look like duplicate owner lanes unless the packet states the boundary explicitly.
- Promoting CO-430 before packet setup would bypass the follow-up traceability guard.
- Treating terminal `CO-425` as live would hide owner drift instead of repairing it.
- Combining CO-428, CO-429, and CO-430 into an implicit mega-patch would make review and blocker ownership opaque.
