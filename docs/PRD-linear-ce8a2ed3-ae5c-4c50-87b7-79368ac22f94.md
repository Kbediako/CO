# PRD - CO-525 docs freshness preventive lifecycle automation

## Traceability
- Linear issue: `CO-525` / `ce8a2ed3-ae5c-4c50-87b7-79368ac22f94`
- Task id: `linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94`
- Canonical registry id: `20260513-linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94`
- Canonical owner key: `docs:freshness:preventive-lifecycle`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:preventive-lifecycle`
- Source issue: `CO-522` / `b642e879-ba50-45ef-b0d9-b059afa9e932`

## Summary
- Problem Statement: docs freshness debt currently appears as late gate failure after task packets, public docs, or active specs have already aged into stale rows. CO-431 added canonical-owner routing and CO-522 restored the live `docs:freshness:maintain` owner, but the lifecycle loop still lets terminal task packets remain `status=active`, lets report-only maintenance stop at warnings, and leaves status/provider surfaces blind to repo-gate context until handoff.
- Desired Outcome: make docs freshness preventive and lifecycle-driven so creation metadata is complete, terminal task state reclassifies or archives every packet surface, public/current docs get direct pre-expiry action, scheduled maintenance opens or updates a concrete action path, and status/provider intake reports `repo_gates.docs_freshness_maintain` early without counting repo-gate ownership as provider WIP.

## User Request Translation (Context Anchor)
- User intent / needs: implement the root-cause refactor for `docs:freshness`, `docs:freshness:maintain`, terminal task lifecycle, registry/catalog metadata, archive automation, scheduled docs truthfulness, and status/provider gate reporting.
- Success criteria / acceptance: fresh baseline artifacts exist; terminal packet rows cannot remain active stale debt; mechanical archival/reclassification has deterministic dry-run/self-heal behavior; public/current docs bypass rolling deferral; `co-status --format json` and the status UI expose `repo_gates.docs_freshness_maintain`; provider intake/handoff consumes repo-gate context; guide/catalog declared-cohort parity is machine checked; scheduled maintenance is actionable rather than warn-only.
- Constraints / non-goals: no weakening of `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, `docs:check`, archive policies, provider review gates, or fallback-expiry metadata; no blind `last_review` bumps; no deletion of useful historical packets; no duplicate owner issue; no treating CO-431 or CO-522 as the entire fix.

## Intent Checksum
- Exact user wording / phrases to preserve: `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, `terminal task lifecycle`, `docs freshness registry`, `docs catalog`, `implementation-docs archive automation`, `terminal_pending_archive`, `preserved_historical_stub`, `repo_gates.docs_freshness_maintain`, `canonical owner key`, `CO-431`, `CO-522`, `CO-519`, `CO-516`, `block_policy_over_budget`, `block_diff_local`, `blocking_changed_paths=[]`.
- Protected terms / exact artifact and surface names: `.agent/task`, `docs/PRD-*`, `docs/TECH_SPEC-*`, `docs/ACTION_PLAN-*`, `tasks/specs`, `tasks/tasks-*`, `docs/findings`, `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, `.github/workflows/docs-truthfulness-weekly.yml`, `scripts/docs-freshness*.mjs`, `scripts/implementation-docs-archive.mjs`, `co-status --format json`, `packages/orchestrator-status-ui`.
- Nearby wrong interpretations to reject: merely bumping `last_review`, widening rolling caps/windows, deleting historical evidence, creating another owner re-home only, counting repo-gate ownership as provider WIP, treating report-only weekly maintenance as sufficient closure, or hiding public/current docs inside rolling deferral.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Task packet lifecycle | Completed packet rows can stay `active` until `docs:freshness` trips. | Terminal issue/task state is authoritative lifecycle evidence. | Terminal packets become `terminal_pending_archive`, `preserved_historical_stub`, or reviewed active docs before stale debt accrues. | Deleting useful historical packet content. |
| Weekly docs truthfulness | Warn/report artifacts can be published without closing the loop. | Maintenance should produce a concrete owner/action path. | Scheduled automation forecasts T-7/T-3/T-1/expired states and opens/updates a self-heal PR or exactly one canonical owner/workpad path. | Auto-merging or bypassing review gates. |
| Rolling policy | CO-522 is live owner, but baseline debt can remain over `300/2`. | Rolling deferral is exceptional and owner-routed. | Lifecycle automation prevents large active backlogs and keeps `blocking_changed_paths=[]` evidence visible. | Widening caps/windows. |
| Public/current docs | Strict rows can become stale and surprise validation. | Public/current docs are not rolling-debt eligible. | Pre-expiry direct review/action routing; never rolling deferral. | Lowering public/shipped validation strictness. |
| Status monitor | Provider WIP is visible; repo docs gate is not first-class. | Repo gates should be visible without becoming provider WIP. | `repo_gates.docs_freshness_maintain` includes severity, owner, spec_guard, capacity, next expiry, and action counts. | Counting repo-gate owner state as provider WIP. |
| Guide/catalog policy | `co-420` guide-vs-catalog drift candidate must be verified. | Guide declared cohorts and catalog baseline cohorts should match by machine check. | Parity test catches declared-cohort drift. | Reintroducing retired cohorts as active policy without evidence. |

## Not Done If
- A clean latest main can still accumulate task-packet stale rows because completed tasks remain `status=active`.
- Daily docs truthfulness can only warn/report while gates fail later.
- `co-status --format json` lacks `repo_gates.docs_freshness_maintain`.
- Owner re-home lanes can be marked Done while unresolved baseline debt remains assigned to that same live owner.
- Public/current docs are hidden in rolling deferral.
- Guide/catalog policy drift can recur without a parity check.
- The fix is another cap/window/last_review patch rather than lifecycle prevention.

## Goals
- Make docs packet creation metadata canonical and complete enough for lifecycle automation.
- Drive registry lifecycle state from terminal task/Linear state across all packet surfaces.
- Add deterministic self-heal dry-run and scheduled action routing for mechanical archive/reclassification cases.
- Add direct pre-expiry action routing for public/current and shipped docs.
- Add first-class repo-gate status projection and provider intake/handoff context.
- Preserve strict gates and visible baseline debt while preventing recurrence.

## Non-Goals
- No weakening of freshness, spec, docs, archive, review, or fallback gates.
- No blind freshness date refresh.
- No useful historical evidence deletion.
- No duplicate canonical owner issue creation.
- No reopening CO-431 unless fresh evidence proves regression.
- No expanding CO-522 beyond current-debt live ownership unless superseded with explicit evidence.

## Stakeholders
- Product: CO operator workflow and downstream provider-worker lanes.
- Engineering: Codex-Orchestrator maintainers and review agents.
- Design: Status UI maintainers for repo-gate presentation.

## Metrics & Guardrails
- Primary Success Metrics: zero newly terminal packet rows left as ordinary active stale debt; scheduled maintenance emits actionable self-heal/owner outputs; status JSON/UI includes repo-gate severity/action counts; provider intake records repo-gate classification before handoff.
- Guardrails / Error Budgets: `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, `docs:check`, archive policies, and provider review gates remain fail-closed; public/current docs never enter rolling deferral.

## User Experience
- Personas: provider workers, top-level CO operators, review agents, and maintainers watching scheduled docs truthfulness runs.
- User Journeys: a terminal task moves to lifecycle reclassification before stale age; a public doc nearing expiry gets direct action; an unrelated provider lane sees repo-gate context at intake instead of late handoff.

## Technical Considerations
- Architectural Notes: centralize lifecycle classification so docs freshness, archive automation, scheduled maintenance, provider intake, and status UI consume the same repo-gate model instead of recomputing separate seams.
- Dependencies / Integrations: Linear issue state, `tasks/index.json`, docs freshness registry/catalog, implementation-docs archive policy, docs truthfulness workflow, control/status dataset, and provider intake/handoff helpers.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor check: the issue explicitly requires a root lifecycle refactor. A minor cap/window/date patch is rejected because authority is split across terminal state, active registry rows, scheduled warning artifacts, and status/provider gate reporting.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Docs truthfulness schedule | Warn/report-only maintenance as sufficient closure | remove fallback | CO-525 | Scheduled maintenance reports stale debt but opens no action path | 2026-05-13 | 2026-05-13 | immediate removal in this lane | Forecast output either opens/updates a self-heal PR path or exactly one owner/workpad path | Scheduled/action tests and dry-run artifacts |
| Terminal task packets | Terminal packets remain ordinary `active` registry rows | remove fallback | CO-525 | Task/Linear terminal state exists while packet rows age as active stale debt | 2026-05-13 | 2026-05-13 | immediate removal in this lane | Lifecycle classifier emits archive/reclassify/review state for every packet surface | Focused terminal lifecycle tests |
| Public/current docs | Public/current stale rows discovered only at validation time | remove fallback | CO-525 | Strict docs near expiry without pre-expiry action routing | 2026-05-13 | 2026-05-13 | immediate removal in this lane | Pre-expiry direct action routing and no rolling eligibility | Public/shipped docs freshness tests |

## Open Questions
- Whether GitHub PR creation for scheduled self-heal should be fully automatic in this lane or exposed as deterministic dry-run plus workflow PR creation using existing repo credentials.
- Whether status UI should show repo-gate details in the existing provider summary panel or a separate repo gates section.

## Approvals
- Product: CO-525 Linear issue scope, accepted for implementation.
- Engineering: Pre-implementation issue-quality review self-approved by provider worker on 2026-05-13; the issue is intentionally broad enough for the lifecycle refactor and not merely a CO-522 owner re-home.
- Design: Status UI changes to follow existing quiet operational UI patterns.
