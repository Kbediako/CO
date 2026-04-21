# Task Checklist - linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6

- Linear Issue: `CO-292` / `d2306cf9-2c2f-4242-bbaa-2e86456221a6`
- MCP Task ID: `linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6`
- Primary PRD: `docs/PRD-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`
- TECH_SPEC: `tasks/specs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-control-host-refresh-retained-released-not-active-claim-metadata.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`
- Shared source 0 anchor: `ctx:sha256:5574aa4af60d136430e7ea00cd74f65b764189a922ceb18aa44debc230b470c9#chunk:c000001`

## Docs-First
- [x] PRD drafted for retained released/not_active metadata refresh. Evidence: `docs/PRD-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`.
- [x] Canonical TECH_SPEC drafted with user-request translation, protected terms, wrong-interpretation boundaries, parity matrix, and validation plan. Evidence: `tasks/specs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-control-host-refresh-retained-released-not-active-claim-metadata.md`.
- [x] ACTION_PLAN drafted for parent-owned diagnosis, metadata-only implementation, focused regression, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`.
- [x] TECH_SPEC mirror, task registry, docs task snapshot, and `.agent` mirror updated. Evidence: `docs/TECH_SPEC-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`, `tasks/index.json`, `docs/TASKS.md`, and `.agent/task/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`.
- [x] Pre-implementation issue-quality review recorded in the spec readiness gate. Evidence: `tasks/specs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-control-host-refresh-retained-released-not-active-claim-metadata.md`.
- [x] Parent captured bounded same-issue child-lane docs evidence before implementation. Evidence: `.runs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-docs-packet/cli/2026-04-21T08-42-08-368Z-fc919095/manifest.json`.

## Implementation Acceptance
- [x] Detect retained `provider-intake-state.json` rows with `state=released` and `reason=provider_issue_released:not_active`. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Refresh only `issue_state`, `issue_state_type`, and `issue_updated_at` when newer live same-issue truth exists. Evidence: focused retained metadata regressions in `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Preserve `released/not_active` claim state, reason, audit fields, run identifiers, and no-admission behavior. Evidence: retained metadata-only and release-cancellation regressions in `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Align retained claim metadata with dependent blocker snapshots for newer same-issue non-active truth such as `Blocked -> Rework`. Evidence: dependent blocker snapshot regression in `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Avoid active-claim metadata refresh, Ready reclaim/admission, refresh-stuck restart recovery, destructive cleanup, and unbounded direct issue-by-id reads. Evidence: bounded blocker-snapshot direct-read guard plus terminal release-path regressions in `orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Validation
- [x] Child-lane scoped JSON parse, `git diff --check`, and protected-term grep pass. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index.json ok')"`, `git diff --check -- <touched-doc-files>`, and protected-term scan passed on 2026-04-21.
- [x] Parent focused metadata-refresh regression passes. Evidence: `npm exec vitest -- --run orchestrator/tests/ProviderIssueHandoff.test.ts -t "retained.*metadata|release cancellation|terminal retained|cached active blocker"`.
- [x] Adjacent no-regression coverage for `CO-64`, `CO-202`, `CO-212`, `CO-248`, `CO-41`, and `CO-276` boundaries passes where touched. Evidence: `npm exec vitest -- --run orchestrator/tests/ProviderIssueHandoff.test.ts` and full `npm run test`.
- [x] Parent required validation/review/elegance gates pass before PR handoff. Evidence: focused retained/deferred regressions, build, lint, full test (`4482` tests), delegation guard, spec guard dry-run, pack smoke, clean standalone review rerun `.runs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6/cli/2026-04-21T21-44-13-763Z-2c7478ee/review/telemetry.json` (`status=succeeded`, `review_outcome=bounded-success`), explicit elegance artifact `out/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6/manual/20260421T215300Z-final-elegance-review.md`, and final `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` reruns all passed on the updated packet.

## Handoff
- [x] Parent imports the child-lane patch and refreshes the authoritative workpad. Evidence: Linear workpad comment `3ff9b712-e6d6-4885-96ee-9b1687a12a89`.
- [ ] Parent attaches PR, drains checks/review feedback, and owns Linear state transitions. Evidence: validation, review rerun, elegance, and final docs/repo gate reruns are complete; PR creation, attachment, ready-review drain, and `In Review` transition remain pending.

## Progress Log
- 2026-04-21: bounded same-issue docs child lane created the CO-292 docs-first packet and registry mirrors only. Parent verified and corrected the packet source anchor to the worker prompt payload before implementation.
- 2026-04-21: parent implementation refreshed retained released/not_active metadata from newer tracked issue and dependent blocker truth, preserved release cancellation and terminal release behavior, and added focused plus full provider handoff regression coverage.
- 2026-04-21: the first standalone review surfaced two concrete defects in the deferred retained-blocker refresh helper; parent patched terminal fresh-discovery release handling plus per-claim failure containment, added matching regressions, and reran build, lint, full test (`4482` tests), pack smoke, and a clean standalone review rerun.
- 2026-04-21: explicit elegance/minimality review recorded no further simplification patch, and the updated packet reran clean through `docs:check`, `docs:freshness`, `repo:stewardship`, and `diff-budget`; PR attach and ready-review drain remain pending before `In Review`.
