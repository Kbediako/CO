# Task Checklist - linear-f1d8b29c-b048-4816-96dd-a38f272dabb7

- Linear Issue: `CO-198` / `f1d8b29c-b048-4816-96dd-a38f272dabb7`
- MCP Task ID: `linear-f1d8b29c-b048-4816-96dd-a38f272dabb7`
- Primary PRD: `docs/PRD-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- TECH_SPEC: `tasks/specs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- Evidence finding: `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`
- Parent manifest: `../../.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-15T22-57-06-636Z-d82a867f/manifest.json`

## Docs-First
- [x] PRD drafted with protected app-server and provider proof terms. Evidence: `docs/PRD-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`.
- [x] TECH_SPEC drafted with release proof, schema capture, runtime canary, provider parity, and hold/go requirements. Evidence: `tasks/specs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`, `docs/TECH_SPEC-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`.
- [x] ACTION_PLAN drafted for evidence capture, validation, review, and handoff. Evidence: `docs/ACTION_PLAN-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`.
- [x] `tasks/index.json` updated under canonical `items[]`. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` snapshot updated. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`. Evidence: `.agent/task/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`.
- [x] `docs/docs-freshness-registry.json` coverage added for packet and evidence files. Evidence: `docs/docs-freshness-registry.json`.
- [x] Docs-review evidence captured before review handoff. Evidence: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-review/cli/2026-04-15T23-19-30-605Z-079b362f/manifest.json`, `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-review/cli/2026-04-15T23-19-30-605Z-079b362f/review/telemetry.json`.

## Workflow
- [x] Live issue context inspected before transition. Evidence: `linear issue-context` showed live workflow states and no PR attachment.
- [x] Issue moved into the team's started state. Evidence: live state moved to `In Progress`.
- [x] One active `## Codex Workpad` created and maintained. Evidence: Linear comment `2242584f-27ff-4ae0-ac8c-a2973d401009`.
- [x] Pre-turn decomposition and parallelization decision recorded. Evidence: `parallelize_now` / `independent_scope_available`.
- [x] Same-issue child lane completed successfully. Evidence: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-source-evidence/cli/2026-04-15T23-01-24-245Z-8e91c159/manifest.json`.
- [x] Child lane patch accepted after scope review. Evidence: child lane manifest and parent canary finding.

## Acceptance Criteria
- [x] Confirm stable `0.121.0` release evidence and exact app-server surfaces. Evidence: `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`.
- [x] Capture schemas or observed payloads for account/rate limits, Guardian review, realtime transcript, MCP app tools, thread/turn injection, and instruction-source fields. Evidence: `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`.
- [x] Produce parity matrix mapping app-server event classes to CO provider proof fields currently sourced from JSONL/session logs. Evidence: PRD parity matrix and finding provider matrix.
- [x] Run local app-server smoke plus runtime canary and record artifacts. Evidence: finding runtime canary summary.
- [x] Prove no provider truth replacement is safe without parity. Evidence: hold decision in finding.
- [x] If app-server evidence is incomplete, document hold decision and keep JSONL/session logs authoritative. Evidence: finding `Decision` section.
- [x] Mirror issue validation provenance. Evidence: original draft validation by independent subagent Hegel preserved in workpad and checklist.

## Not Done If
- [ ] Any provider precedence change is made without field-level app-server parity.
- [ ] JSONL/session-log fallback authority is weakened.
- [ ] App-server raw prompt/instruction payloads are committed.
- [ ] CO STATUS loses provider proof richness.
- [ ] The final workpad omits the hold decision or validation status.

## Validation
- [x] `git diff --check`.
- [x] `node scripts/delegation-guard.mjs`.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] `npm run build`.
- [x] `npm run lint`.
- [x] `npm run test`.
- [x] `npm run docs:check`.
- [x] `npm run docs:freshness`.
- [x] `npm run repo:stewardship`.
- [x] `node scripts/diff-budget.mjs`.
- [x] `node scripts/runtime-mode-canary.mjs`. Evidence: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/runtime-canary-summary.json` recorded `20/20` passing iterations for default app-server mode, app-server success, forced fallback, and unsupported-combo checks.
- [x] Required cloud canary configuration blocker recorded for `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`. Evidence: provider-worker execution failed closed with `Missing CODEX_CLOUD_ENV_ID`; hold remains in force until a real cloud environment id is available.
- [x] Fallback contract blocker recorded for `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`. Evidence: fallback manifest `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-15T23-59-13-984Z-8bf4380e/manifest.json` and run summary `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-15T23-59-13-984Z-8bf4380e/run-summary.json`; command failed required mode because `CODEX_CLOUD_ENV_ID` is absent.
- [x] Manifest-backed standalone review. Evidence: `../../.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-15T22-57-06-636Z-d82a867f/review/telemetry.json` (`clean-success`).
- [x] Explicit elegance/minimality pass. Result: docs-only packet stayed minimal; duplicate child-manifest evidence was removed; required `docs/TASKS.md` mirror was added through the existing archive path; no runtime/provider change or new abstraction was introduced.
- [ ] PR attached and automated feedback drain clean before review handoff.

## Progress Log
- 2026-04-15: Issue context read, live state moved to `In Progress`, workpad created, parallelization decision recorded, and docs-only child lane launched.
- 2026-04-15: Child lane `docs-source-evidence` succeeded and parent summarized accepted evidence in `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`.
- 2026-04-15: Parent release proof, schema capture, app-server smoke, runtime canary, and provider parity matrix documented. Decision: hold; JSONL/session logs remain authoritative.
- 2026-04-15: Docs-review, repo validation gates, and manifest-backed standalone review passed. Standalone review outcome: `clean-success`.
- 2026-04-15: Elegance/minimality pass completed. Result: keep the docs-first packet, required `docs/TASKS.md` mirror, and registry/index updates; no additional artifact document or runtime helper is needed.
- 2026-04-15: Standalone review P2 fixed by adding the `docs/TASKS.md` snapshot and preserving the line-budget archive path.
- 2026-04-16: PR review feedback addressed by adding newer-version runtime/cloud/fallback canary gates, docs-review approval evidence, and Markdown table spacing fixes.
