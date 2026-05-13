# Task Checklist - linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94

- Linear Issue: `CO-525` / `ce8a2ed3-ae5c-4c50-87b7-79368ac22f94`
- Canonical owner key: `docs:freshness:preventive-lifecycle`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:preventive-lifecycle`
- Source issue: `CO-522` / `b642e879-ba50-45ef-b0d9-b059afa9e932`

## Scope
- [x] Read live Linear issue context and move CO-525 from `Ready` to `In Progress`.
- [x] Record pre-turn decomposition matrix and parallelization decision.
- [x] Capture fresh baseline artifacts for freshness, maintenance, spec guard, archive dry-run, repo stewardship, and guide/catalog parity.
- [x] Implement lifecycle-driven packet registry prevention across all packet surfaces.
- [x] Implement mechanical archive/reclassification dry-run/self-heal action planning.
- [x] Implement public/current/shipped docs direct pre-expiry routing.
- [x] Implement status JSON/UI `repo_gates.docs_freshness_maintain`.
- [x] Implement provider intake/handoff repo-gate context.
- [x] Implement or accept guide/catalog declared-cohort parity machine check.

## Acceptance Criteria
- [x] Terminal task/Linear state deterministically prevents completed packet rows from remaining ordinary `active` stale debt.
- [x] Scheduled docs truthfulness forecasts T-7/T-3/T-1/expired states and emits an actionable self-heal PR path or exactly one owner/workpad path.
- [x] Public/current/shipped docs cannot enter rolling freshness deferral.
- [x] `co-status --format json` and status UI expose `repo_gates.docs_freshness_maintain` with severity, owner, spec_guard, capacity, next expiry, and action-required counts.
- [x] Provider intake/handoff records repo-gate context early and distinguishes unrelated-lane blockers from handoff/doc-touch blockers.
- [x] Guide/catalog declared-cohort drift is machine checked.
- [x] No strict gate is weakened, no historical evidence is deleted, and no blind `last_review` bumps are used.

## Validation
- [x] Baseline artifacts captured under `out/linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94/`.
- [x] Focused lifecycle/archive/freshness/status/provider tests pass: 101 focused tests.
- [x] `node scripts/delegation-guard.mjs`: OK, 2 subagent manifests found.
- [x] `node scripts/spec-guard.mjs --dry-run`: exits 0 while reporting known stale spec/fallback metadata baseline blockers.
- [x] `npm run build`.
- [x] `npm run lint`: 0 errors, 3 existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`: 360 files / 5570 tests passed.
- [x] `npm run docs:check`.
- [x] `npm run docs:freshness`: strict gate intentionally remains red on current repo debt; warn/report artifact saved under `out/linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94/final/`.
- [x] `npm run docs:freshness:maintain -- --format json`: strict gate intentionally remains red with `freshness_decision=block_diff_local`; warn/report artifact saved under `out/linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94/final/`.
- [x] `npm run repo:stewardship`: OK, 0 action-required.
- [x] `node scripts/diff-budget.mjs`: strict budget exceeded; explicit CO-525 large-refactor override accepted.
- [x] Manifest-backed standalone review reports semantic `review_verdict: clean`.
- [x] Explicit elegance/minimality pass completed.
- [x] `npm run pack:smoke` if CLI/package/review-wrapper surfaces change.

## Non-Goals
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, docs checks, archive policies, provider review gates, or fallback-expiry metadata.
- Do not widen rolling caps/windows.
- Do not blindly bump `last_review`.
- Do not delete useful historical packet evidence.
- Do not file duplicate canonical owner issues.
- Do not broaden CO-431, CO-522, CO-519, or CO-516 beyond their stated adjacent scopes.

## Evidence
- Workpad comment: `c82ffd2e-8753-4a48-9296-d75ae3595cfa`
- Parallelization decision: `parallelize_now` / `independent_scope_available` for `guide-catalog-parity`.
- Baseline artifact directory: `out/linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94/`.
- Final validation artifact directory: `out/linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94/final/`.
- Standalone review telemetry: `.runs/linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94/cli/2026-05-13T01-04-48-293Z-adc5ba11/review/telemetry.json`.

## Fallback Decision Table

Large-refactor decision: CO-525 intentionally performs the lifecycle refactor because another cap/window/date seam would leave terminal state, registry metadata, scheduled automation, and status/provider handoff split.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scheduled docs truthfulness | Warn/report-only closure | remove fallback | CO-525 | Scheduled stale debt without action path | 2026-05-13 | 2026-05-13 | immediate | Action planner emits self-heal PR path or one owner/workpad path | Scheduled/action tests |
| Terminal packet lifecycle | Terminal packets remain active stale rows | remove fallback | CO-525 | Terminal state plus active registry rows | 2026-05-13 | 2026-05-13 | immediate | Lifecycle classifier emits archive/reclassify/review outcome | Lifecycle tests |
| Repo-gate reporting | Late handoff discovery of repo gate | remove fallback | CO-525 | `docs:freshness:maintain` blocks with `blocking_changed_paths=[]` | 2026-05-13 | 2026-05-13 | immediate | Status/provider surfaces expose repo-gate context early | Status/provider tests |
