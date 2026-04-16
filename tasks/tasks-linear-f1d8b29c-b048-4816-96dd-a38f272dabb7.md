# Task Checklist - linear-f1d8b29c-b048-4816-96dd-a38f272dabb7

- Linear Issue: `CO-198` / `f1d8b29c-b048-4816-96dd-a38f272dabb7`
- MCP Task ID: `linear-f1d8b29c-b048-4816-96dd-a38f272dabb7`
- Canonical Registry ID: `20260416-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7`
- Primary PRD: `docs/PRD-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- TECH_SPEC: `tasks/specs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- Evidence finding: `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`
- Rework parent manifest: `../../.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-16T11-26-54-445Z-ce65b23d/manifest.json`
- Rework child lane manifest: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-source-evidence-rework/cli/2026-04-16T11-30-38-094Z-926472c7/manifest.json`

## Docs-First
- [x] PRD refreshed with protected app-server and provider proof terms. Evidence: `docs/PRD-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`.
- [x] TECH_SPEC refreshed with release proof, schema capture, runtime canary, provider parity, and hold/go requirements. Evidence: `tasks/specs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`, `docs/TECH_SPEC-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`.
- [x] ACTION_PLAN refreshed for rework reset, evidence capture, validation, review, and handoff. Evidence: `docs/ACTION_PLAN-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`.
- [x] `tasks/index.json` updated under canonical `items[]`. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` snapshot updated. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`. Evidence: `.agent/task/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`.
- [x] `docs/docs-freshness-registry.json` coverage refreshed for packet and evidence files. Evidence: `docs/docs-freshness-registry.json`.
- [x] Fresh docs-review evidence captured before review handoff. Evidence: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-co-198-docs-review-rework-r2/cli/2026-04-16T11-57-15-726Z-2b6ad40c/manifest.json`, `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-co-198-docs-review-rework-r2/cli/2026-04-16T11-57-15-726Z-2b6ad40c/review/telemetry.json` (`review_outcome=clean-success`).

## Workflow
- [x] Live issue context inspected before transition/reset. Evidence: `linear issue-context` showed live state `Rework`, previous workpad, and attached PR `#491`.
- [x] Rework reset performed. Evidence: PR `#491` closed; previous workpad `2242584f-27ff-4ae0-ac8c-a2973d401009` deleted.
- [x] Fresh branch created from current `origin/main`. Evidence: branch `linear/co-198-codex-0121-appserver-contract-canary-rework` from `origin/main` `b65a12bbd`.
- [x] One active `## Codex Workpad` created and maintained. Evidence: Linear comment `817c4ebb-b0e9-484f-b4e8-4bc22fdda76c`.
- [x] Pre-turn decomposition and parallelization decision recorded. Evidence: `parallelize_now` / `independent_scope_available`.
- [x] Same-issue child lane launched. Evidence: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-source-evidence-rework/cli/2026-04-16T11-30-38-094Z-926472c7/manifest.json`.
- [x] Same-issue child lane completed successfully and parent accepted/rejected/invalidated the patch artifact. Evidence: child run succeeded at `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-source-evidence-rework/cli/2026-04-16T11-30-38-094Z-926472c7/manifest.json`; zero-byte patch was helper-rejected as advisory, so parent retained patch ownership.

## Acceptance Criteria
- [x] Confirm stable `0.121.0` release evidence and exact app-server surfaces. Evidence: `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`.
- [x] Capture schemas or observed payloads for account/rate limits, Guardian review, realtime transcript, MCP app tools, thread/turn injection, and instruction-source fields. Evidence: `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`.
- [x] Produce parity matrix mapping app-server event classes to CO provider proof fields currently sourced from JSONL/session logs. Evidence: PRD parity matrix and finding provider matrix.
- [x] Run local app-server smoke plus runtime canary and record artifacts. Evidence: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/appserver-smoke-rework-20260416.json`, `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/runtime-canary-summary.json`.
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
- [x] `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (6 subagent manifest(s) found)`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `npm run build`. Evidence: `tsc -p tsconfig.build.json` succeeded.
- [x] `npm run lint`. Evidence: ESLint completed successfully.
- [x] `npm run test`. Evidence: `342` test files and `3965` tests passed.
- [x] `npm run docs:check`. Evidence: `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 3965 docs, 3968 registry entries`.
- [x] `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 5053 tracked files, 0 action-required`.
- [x] `node scripts/diff-budget.mjs`. Evidence: working-tree scope `files=0/25`, `lines=0/1200`; advisory stacked aggregate `files=8/25`, `lines=471/1200`.
- [x] `node scripts/runtime-mode-canary.mjs`. Evidence: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/runtime-canary-summary.json` recorded `20/20` passing iterations for default app-server mode, app-server success, forced fallback, and unsupported-combo checks on `2026-04-16T11:40:44.487Z`.
- [x] Required cloud canary configuration blocker or pass recorded for `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`. Evidence: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/cloud-canary-required-rework/step-summary.md` records `Missing CODEX_CLOUD_ENV_ID`.
- [x] Fallback contract blocker or pass recorded for `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`. Evidence: fallback manifest `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-16T11-48-13-664Z-46aaeae4/manifest.json`, run summary `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-16T11-48-13-664Z-46aaeae4/run-summary.json`, and wrapper failure summary `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/cloud-canary-fallback-rework/step-summary.md` record required-mode `configuration` blocker from missing `CODEX_CLOUD_ENV_ID`.
- [x] Manifest-backed standalone review under `FORCE_CODEX_REVIEW=1`. Evidence: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-16T11-26-54-445Z-ce65b23d/review/telemetry.json` reported `status=succeeded`, `review_outcome=bounded-success` after command-intent retry; read-only retry found no actionable regressions.
- [x] Explicit elegance/minimality pass. Evidence: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/elegance-review-rework.md`.
- [x] PR attached and automated feedback drain clean before review handoff. Evidence: PR `#500` (`https://github.com/Kbediako/CO/pull/500`) attached to CO-198; CodeRabbit findings fixed in `54e3a01bf` and `fa8e6a68a`; `pr ready-review --pr 500 --quiet-minutes 10` completed at `2026-04-16T12:45:01.833Z` with merge state `CLEAN`, checks `3/3`, required checks `1/1`, unresolved threads `0`, unacknowledged bot feedback `0`, and `Ready for review`.

## Progress Log
- 2026-04-16: Issue context read; live state was `Rework`. Old PR `#491` was closed, old workpad was deleted, and fresh branch `linear/co-198-codex-0121-appserver-contract-canary-rework` was created from current `origin/main`.
- 2026-04-16: Fresh workpad `817c4ebb-b0e9-484f-b4e8-4bc22fdda76c` created with required pre-turn decomposition matrix; required parallelization decision recorded as `parallelize_now` / `independent_scope_available`.
- 2026-04-16: Same-issue child lane `docs-source-evidence-rework` launched with docs-only ownership of `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/child-docs-source-evidence-rework.md`.
- 2026-04-16: Child lane `docs-source-evidence-rework` reached `status=succeeded` and produced a zero-byte patch; helper disposition rejected it as advisory, leaving parent-owned packet changes as the final implementation path.
- 2026-04-16: Previous reviewed docs packet replayed onto fresh `origin/main`, then refreshed with current `codex-cli 0.121.0`, npm/GitHub release evidence, generated app-server schemas, redacted stdio app-server smoke, and runtime-mode canary evidence. Decision remains HOLD; JSONL/session logs remain authoritative.
- 2026-04-16: Required cloud canary failed closed before cloud execution because `CODEX_CLOUD_ENV_ID` is absent; fallback contract produced local MCP fallback manifest `2026-04-16T11-48-13-664Z-46aaeae4` but still failed the required wrapper classification as `configuration`. HOLD remains in force.
- 2026-04-16: Rework docs-review rerun succeeded after current-main merge and TASKS archive-budget trim. Evidence: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-co-198-docs-review-rework-r2/cli/2026-04-16T11-57-15-726Z-2b6ad40c/manifest.json`, `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-co-198-docs-review-rework-r2/cli/2026-04-16T11-57-15-726Z-2b6ad40c/review/telemetry.json`.
- 2026-04-16: Local validation gates passed: `git diff --check`, delegation guard, spec guard, build, lint, test (`342` files / `3965` tests), docs:check, docs:freshness, repo:stewardship, and diff-budget.
- 2026-04-16: Standalone review completed with `review_outcome=bounded-success` after command-intent retry; read-only retry found no actionable regressions. Explicit elegance pass kept the docs/artifact-only HOLD packet with no simplification patch.
- 2026-04-16: Replacement PR `#500` opened and attached. CodeRabbit feedback was addressed in `54e3a01bf` and `fa8e6a68a`; final ready-review drain completed clean at `2026-04-16T12:45:01.833Z`.
