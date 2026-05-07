# Docs Freshness Cohorts

## Purpose
`docs:freshness` remains a repo-wide truthfulness gate. It must fail for missing registry rows, registry entries that point at missing files, invalid registry metadata, uncatalogued docs, stale public or active guidance, and stale cohorts that are no longer inside an explicit rolling window.

The rolling cohort policy exists for one narrower case: a large historical task/report cohort can age one or more days past cadence at a date boundary while unrelated feature lanes still have healthy current diffs. In that case, the stale rows must stay machine-visible and owned by a baseline issue instead of forcing every active feature worker to refresh unrelated historical packets.

## Policy
The machine-readable policy lives in `docs/docs-catalog.json` under `policies.rolling_freshness_cohorts`.

Current CO policy:

- Owner issue: `CO-511`
- Canonical recurring owner key: `docs:freshness:maintain`
- Live-owner verification: `docs:freshness:maintain` must verify the configured owner issue as a non-terminal issue in the configured Linear project before owned rolling debt can pass. Terminal, canceled, duplicate, out-of-project, or unverifiable owners are evidence only and must route to canonical owner reuse/re-home action instead of remaining live owner metadata.
- Exact canonical owner overrides: `canonical_owner_issues[]` may map one `canonical_owner_key` to one live owner issue, such as `CO-320` for `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
- Historical owner lineage: `CO-175` established the Apr 14 baseline, `CO-267` owned the Apr 20/21 maintenance refreshes, `CO-300` owned the Apr 22 reset, `CO-324` owned the Apr 23 reset, `CO-343` owned the Apr 24/25 reset, `CO-401` owned the Apr 27 reset, `CO-420` temporarily re-homed the Mar 28 rolling cohort before reaching terminal `Done`, `CO-409` restored live same-project owner metadata after `CO-420` before also reaching terminal `Done`, `CO-423` restored live same-project owner metadata after `CO-409` before reaching terminal `Done`, `CO-425` restored live same-project owner metadata after `CO-423` before reaching terminal `Done`, `CO-430` briefly carried the integrated owner metadata from the CO-428 blocker-clear branch before also reaching terminal `Done`, `CO-427` restored live same-project owner metadata after `CO-425`/`CO-430` before reaching terminal `Done`, `CO-441` restored live same-project owner metadata after `CO-427` before reaching terminal `Done`, and `CO-444` restored live same-project owner metadata after `CO-441` before reaching terminal `Done`; these prior owners are now terminal or invalid evidence only and must not remain the live maintenance owner after they reach terminal or unverifiable states. `CO-511` is the current live same-project owner for the retained March 28 rolling cohort plus the April 6 completed-lane residue cleanup.
- Window: `7` days after the normal freshness cadence expires
- Maximum active rolling cohorts: `2`
- Maximum rolling rows: `300`
- Eligible doc classes: `Task Packet`, `Task Mirror`, and `Report Only`
- Declared baseline cohorts: `co-175-apr-14-march-14-tasks-1164-1195`, `co-343-apr-25-march-25-task-packets-1311-1318`, `co-420-apr-28-march-28-task-packet-mirror`
- Ineligible docs: Front Door, Public Guide, Repository Guide, Agent Policy, Active Guide, shipped skills, companions, templates, and uncatalogued docs

Eligibility is not class-only. A stale row must match a declared baseline cohort by `last_review`, `cadence_days`, path family, and either task-number range or declared path prefix before it can move from blocking stale failures into rolling debt. This prevents a newly stale feature-lane packet from being hidden just because it is in an eligible doc class and still inside the rolling window.

When an eligible declared cohort is inside policy bounds, `docs:freshness` exits successfully for blocking validation but still writes:

- `totals.rolling_cohort_entries`
- `rolling_cohort_entries`
- `rolling_freshness_cohorts`

Those report fields are not waivers. They are the repo-wide freshness debt ledger for the owner issue.

`spec-guard` uses the same catalog policy for stale active specs under the docs catalog. When the only stale specs are eligible, owner-backed, in-window entries from a declared baseline cohort, `spec-guard` prints the rolling spec cohort and exits successfully. It still fails for stale specs when the policy is missing, invalid, over budget, expired, outside the declared baseline, or when the spec class is not eligible.

## Maintenance Decision
`npm run docs:freshness:maintain` is the provider-gate maintenance entrypoint. It runs `docs:freshness`, runs `spec-guard`, computes the current git diff, and writes `out/<task-id>/docs-freshness-maintenance.json`.

The maintenance report is the machine-readable decision future workers should cite instead of manually reclassifying date-boundary cohorts. It includes:

- `freshness_decision`
- `owner_issue`
- `owner_issue_action`
- `owner_issue_verification`
- `owner_action_evidence`
- `fallback_expiry`
- `candidate_cohorts`
- `candidate_cohorts[].canonical_owner_key`
- `candidate_cohorts[].canonical_owner_marker`
- `blocking_changed_paths`
- `diff_status`
- `policy_capacity_status`
- `expires_after`
- `recommended_action`
- sample paths for changed blockers, candidate rows, and hard stale rows

Canonical owner routing uses the exact `canonical_owner_key` and `canonical_owner_marker` from the maintenance report. The marker is the stable owner identity, not the issue title, owner issue number, or a fuzzy title/body match. For the docs freshness maintenance owner family, the protected marker is `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`.

Before an owner is usable, automation must verify live owner state. Open same-project issues with the exact marker are reused and updated. Terminal, canceled, duplicate, out-of-project, or state-unverified owners are historical evidence only and require replacement action. Missing exact-marker owners must emit create-action evidence. Dry-run and no-token paths must not mutate Linear, but they must still emit copyable create/update bodies in `owner_action_evidence.actions[]` so the parent/provider lane can apply the action without re-inventing the issue text.

Provider-worker gates use this decision in `docs-review` and `implementation-gate`. They may pass with `pass_with_owned_rolling_debt` only when the debt is in an eligible historical class, the policy owner issue is present, the rows are still inside the rolling window and caps, `spec-guard` is clean, and the current diff/task packet has no blocking freshness paths. The underlying `docs:freshness` JSON still preserves the raw stale and rolling row evidence.

When the configured owner issue is terminal, canceled, duplicate, out-of-project, or unverifiable, `docs:freshness:maintain` must fail closed. Terminal or mismatched owner metadata is evidence only; the helper must require canonical `docs:freshness:maintain` owner reuse or a new live same-project owner issue instead of reusing a stale `Done`, `Duplicate`, `Canceled`, or project-mismatched owner path. The maintenance output must keep the owner action machine-readable so follow-up creation can pass `--canonical-owner-key docs:freshness:maintain` instead of creating duplicate recurring baseline owners.

Exact canonical owner overrides are narrower than the global owner issue. `docs:freshness:maintain` may surface a mapped live owner only when a candidate cohort's `canonical_owner_key` exactly matches an entry in `canonical_owner_issues[]`; unrelated candidate cohorts must keep the configured global owner evidence and remain blocked or independently owned. This keeps duplicate prevention keyed to `codex-orchestrator:canonical-owner-key=...` without broadening a cohort-specific owner into a repo-wide freshness owner.

Owned rolling debt is an `expire fallback`, not an indefinite exception. Every retained cohort emitted by `docs:freshness:maintain` carries `fallback_expiry` metadata with the owner, trigger, review date, maximum lifetime, `expires_after`, removal condition, and validation evidence. The maximum lifetime is the configured rolling window after normal cadence expiry, so the fallback must be removed by refreshing, archiving, reclassifying, or re-homing to a verified live same-project owner before that date.

## Preserved Historical Stub Status
Some historical task-key stubs remain authoritative because current repo tooling still resolves their canonical task key from that path even after the rest of the historical packet is gone. Those rows should use docs-freshness registry status `preserved_historical_stub`.

Use `preserved_historical_stub` only for intentionally minimal continuity surfaces under `tasks/tasks-*.md` and `.agent/task/*.md`, such as a preserved `tasks/tasks-linear-...md` stub and its matching mirror while that stub is still the authoritative canonical task key surface. The file itself should be an explicit historical continuity stub rather than a full packet, for example with heading `# Historical stub`. While a row is `preserved_historical_stub`:

- `docs:freshness` still validates path and registry metadata, but it does not age the row into ordinary active stale-doc debt.
- `implementation-docs-archive` must not auto-archive the row through registry-status, retention-age, or line-threshold triggers.
- the row stays non-archive-eligible until current repo tooling no longer depends on the stub as the authoritative canonical task key surface.

When the stub stops being authoritative, reclassify it to `archived` and let the normal archive flow manage it. Do not use `preserved_historical_stub` for full active packets, ordinary historical docs debt, or as a generic escape hatch from freshness review.

Blocking decisions are fail-closed:

- `block_missing_or_invalid_registry`: missing registry rows, registry references to missing files, invalid registry metadata, or uncatalogued docs.
- `block_diff_local`: current diff/task-packet freshness drift, a hard `spec-guard` failure, or an unavailable git base that prevents proving the current diff is clean.
- `block_policy_expired`: eligible historical rows are past the rolling window.
- `block_policy_over_budget`: eligible in-window historical rows exceed `max_entries` or `max_cohorts`.
- `block_unowned_repo_debt`: stale rows need direct owner action before provider-worker gates may pass, including terminal-owner replacement or missing exact-marker owner creation.

The scheduled docs truthfulness maintenance workflow runs near UTC date rollover with `--warn`, uploads the maintenance JSON, and records the owner/action evidence in the workflow summary. The summary must surface the decision, canonical owner key/marker, live owner action mode/reason, candidate cohort count, and any copyable create/update body emitted by dry-run or no-token execution. It does not silently bump `last_review`; it either reports a pass-with-owned-debt decision or a hard blocker that the owner issue must resolve through review, archive, or reclassification.

## Required Handling
A rolling cohort must be resolved before the window expires by one of these explicit outcomes:

- refresh the cohort after a real review
- archive completed historical packets through the repo archive policy
- reclassify docs only when their class is wrong
- file a new same-project owner issue with acceptance criteria and evidence when the debt is still intentionally deferred

Owner issue handling must follow the maintenance report instead of manual guesswork:

- reuse/update an open same-project issue only when it has the exact canonical owner marker
- replace a terminal, canceled, duplicate, out-of-project, or state-unverified owner with a new exact-marker owner action
- create a same-project owner when no exact-marker owner exists
- in dry-run or no-token execution, copy the emitted create/update body exactly rather than summarizing it

Feature lanes may cite the owner issue for the rolling cohort, but they must still fix their own docs packet drift and any blocking freshness failures in their diff.

## Not Allowed
- Do not use rolling cohorts for public docs, agent policy, active guides, skills, templates, or missing/invalid registry drift.
- Do not silently bump `last_review` dates without a review rationale.
- Do not increase the rolling window or row cap to make an unrelated validation failure disappear.
- Do not configure empty or malformed eligible classes; invalid policy fields make rolling deferral fail closed.
- Do not omit or broaden `baseline_cohorts`; stale docs outside the declared baseline must remain blocking.
- Do not treat a green `docs:freshness` exit as proof that rolling freshness debt is zero; inspect the report totals.
- Do not reuse terminal owners as active owner issues, even when their title or older metadata looks relevant.
- Do not create a fresh owner when an open same-project exact-marker owner can be reused or updated.

## Escaped Recurrence History
CO-188 and CO-323 were escaped historical root-cause attempts: they made the maintenance decision and owner-routing shape more explicit, but they did not fully close the loop on exact-marker live-owner reuse, terminal-owner replacement, and copyable dry-run/no-token owner actions.

CO-428, CO-429, and CO-430 are the recent recurrence shapes that CO-431 is meant to prevent from becoming manual rediscovery work:

- CO-428 proved stale active-spec debt owned by terminal issues must be reclassified or routed without weakening `spec-guard`.
- CO-429 proved narrow registry residue can clear `docs:freshness` while `docs:freshness:maintain` still fails closed on terminal owner debt.
- CO-430 proved live owner metadata can be repaired while a separate freshness/spec cohort remains blocking, so the owner action evidence must stay distinct from general freshness warnings.

## Apr 14 Baseline
CO-175 reproduced the Apr 14 baseline at `cac56ec89`:

- `221` stale entries
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- one cohort: `last_review=2026-03-14`, `cadence_days=30`, `age_days=31`
- classes: Task Packet `157`, Task Mirror `32`, Report Only `32`
- lineage: `1164-1195`
- declared cohort identity: `co-175-apr-14-march-14-tasks-1164-1195`

The saved baseline report is `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-docs-freshness-report.json`, and the cohort classification is `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-cohort-classification.json`.

## Apr 15 Reviewed Refresh
CO-184 reproduced the Apr 15 baseline failure in `out/linear-237c874c-c05f-4947-949a-573043fc575f/pre-fix-docs-freshness.json`:

- `173` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `124`, Task Mirror `25`, Report Only `24`
- blocking path families: `.agent/task` `25`, `tasks/specs` `24`, `tasks/tasks-*` `25`, `docs/findings` `24`, `docs/PRD-*` `25`, `docs/TECH_SPEC-*` `25`, `docs/ACTION_PLAN-*` `25`

The Apr 15 blocking cohort was reviewed in `docs/findings/linear-237c874c-c05f-4947-949a-573043fc575f-docs-freshness-classification.md` and refreshed instead of added to rolling deferral. Adding the `173` rows beside the existing CO-175 `221` rows would exceed `max_entries=300`, so CO-184 keeps the rolling policy unchanged and updates only the reviewed historical packet rows to `last_review=2026-04-15`.

## Apr 16 Reviewed Refresh
CO-201 reproduced the Apr 16 baseline failure in `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/docs-freshness.json`:

- `192` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `137`, Task Mirror `27`, Report Only `28`
- blocking path families: `.agent/task` `27`, `docs/findings` `28`, `tasks/specs` `26`, `tasks/tasks-*` `27`, `docs/PRD-*` `28`, `docs/TECH_SPEC-*` `28`, `docs/ACTION_PLAN-*` `28`
- date cohorts: `2026-01-15` / `90` days (`2` rows) and `2026-03-16` / `30` days (`190` rows)

The Apr 16 blocking cohort was reviewed in `docs/findings/linear-c101cb88-3097-4502-bcd7-723d80da7955-docs-freshness-classification.md` and refreshed instead of added to rolling deferral. Adding the `192` rows beside the existing CO-175 `221` rows would create `413` candidate rows and `10` candidate cohorts, exceeding both `max_entries=300` and `max_cohorts=2`, so CO-201 keeps the rolling policy unchanged and updates only the reviewed historical packet rows to `last_review=2026-04-16`.

CO-209 reproduced the Apr 17 baseline failure in `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness.json`:

- `263` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `187`, Task Mirror `38`, Report Only `38`
- blocking path families: `.agent/task` `38`, `docs/findings` `38`, `tasks/specs` `38`, `tasks/tasks-*` `38`, `docs/PRD-*` `37`, `docs/TECH_SPEC-*` `37`, `docs/ACTION_PLAN-*` `37`
- date cohort: `2026-03-17` / `30` days (`263` rows)

The Apr 17 blocking cohort was reviewed in `docs/findings/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-freshness-classification.md` and refreshed instead of added to rolling deferral. Adding the `263` rows beside the existing CO-175 `221` rows would create `484` candidate rows and `8` candidate cohorts, exceeding both `max_entries=300` and `max_cohorts=2`, so CO-209 keeps the rolling policy unchanged and updates only the reviewed historical packet rows to `last_review=2026-04-17`.

## Apr 18 Reviewed Refresh
CO-239 reproduced the Apr 18 baseline failure in `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness.json`:

- `70` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `50`, Task Mirror `10`, Report Only `10`
- blocking path families: `.agent/task` `10`, `docs/findings` `10`, `tasks/specs` `10`, `tasks/tasks-*` `10`, `docs/PRD-*` `10`, `docs/TECH_SPEC-*` `10`, `docs/ACTION_PLAN-*` `10`
- date cohort: `2026-03-18` / `30` days (`70` rows)
- lineage: `1289-1298`

The Apr 18 blocking cohort was reviewed in `docs/findings/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-freshness-classification.md` and refreshed instead of added to rolling deferral. Adding the `70` rows beside the existing CO-175 `221` rows would create `291` candidate rows and `8` candidate cohorts, staying within `max_entries=300` but still exceeding `max_cohorts=2`, so CO-239 keeps the rolling policy unchanged and updates only the reviewed historical packet rows to `last_review=2026-04-18`.

## Apr 19 Reviewed Refresh
CO-254 reproduced the Apr 19 baseline failure in `out/linear-5348c2fb-8897-48e3-a848-7831778b1b00/before/docs-freshness.json`:

- `47` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `31`, Task Mirror `6`, Report Only `6`, Active Guide `2`, Public Guide `2`
- blocking path families: `.agent/task` `6`, `docs/ACTION_PLAN-*` `7`, `docs/PRD-*` `7`, `docs/TECH_SPEC-*` `6`, `docs/findings` `6`, `docs/public` `2`, `docs/diagnostics-prompt-guide.md` `1`, `docs/FOLLOWUP-0951-true-rlm-symbolic.md` `1`, `tasks/specs` `5`, `tasks/tasks-*` `6`
- date cohorts: `2026-01-18` / `90` days (`5` rows), `2026-03-19` / `30` days (`40` rows), and `2026-04-04` / `14` days (`2` rows)
- task lineage: `1299-1304`
- `spec-guard --dry-run` separately reported `17` active spec frontmatters with `last_review=2026-03-19`

The Apr 19 blocking set was reviewed in `docs/findings/linear-5348c2fb-8897-48e3-a848-7831778b1b00-docs-freshness-classification.md` and refreshed instead of added to rolling deferral. The stale set includes Active Guide and Public Guide entries, which are ineligible for rolling deferral, and the matching `spec-guard` frontmatter rows require direct spec review. CO-254 keeps the rolling policy unchanged, preserves the existing CO-175 `221`-row advisory ledger, and updates only the reviewed Apr 19 stale docs plus the stale spec frontmatters to `last_review=2026-04-19`.

## Apr 20 Maintenance Refresh
CO-267 reproduced the Apr 20 baseline failure in `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness.json`:

- `66` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible at `overdue=7/7`
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Agent Policy `7`, Active Guide `4`, Shipped Skill `2`, Task Packet `40`, Task Mirror `6`, Report Only `7`
- blocking review cohorts: `2026-01-19` / `90` days (`21` rows) and `2026-03-20` / `30` days (`45` rows)
- `spec-guard --dry-run` separately reported stale active spec frontmatter rows with `last_review=2026-03-20`

The Apr 20 blocking set and the CO-175 rolling cohort were reviewed in `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md` and refreshed instead of weakening freshness gates. CO-267 keeps the rolling policy unchanged, preserves CO-266 terminal-blocker advisory scope, and updates only the reviewed stale registry rows, active spec frontmatter rows, and the CO-175 `1164-1195` rolling cohort rows to `last_review=2026-04-20`.

## Apr 21 Rework Refresh

### Reproduction / Baseline Findings
After PR #566 had already merged, CO-267 rework reproduced the Apr 21 current-main baseline failure in `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-reset/docs-freshness-baseline.json`:

- `37` blocking stale entries
- `0` rolling cohort entries
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `31`, Task Mirror `6`
- blocking review cohorts: `2026-01-20` / `90` days (`6` rows) and `2026-03-21` / `30` days (`31` rows)
- `docs:freshness:maintain` reported `block_policy_over_budget`, owner issue `CO-175`, `37` candidate rows, `12` candidate cohorts, and `blocking_changed_paths=0`

### Post-refresh Disposition
The Apr 21 blocking set was reviewed in `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md` and refreshed without changing freshness policy, rolling caps, or CO-266 scope. The live set is historical Task Packet and Task Mirror evidence for `0954` and the `1311`-`1316` Symphony publication lineage, so CO-267 updates the reviewed stale registry rows to `last_review=2026-04-21`; `tasks/specs/0954-rlm-orchestrator-validation.md` frontmatter is refreshed for consistency, while `1311`-`1316` spec frontmatter was already current on main.

## Apr 22 Owner Reset and Reviewed Refresh

### Reproduction / Baseline Findings
CO-300 reproduced the Apr 22 current-main baseline failure in `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness.json` and `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness-maintenance.json`:

- `16` stale entries
- `0` rolling cohort entries
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- live debt consisted of the Mar 22 `1317` / `1318` packet-and-mirror cohort, adjacent parity packet docs, and hard-stale `docs/codex-orchestrator-issues.md`
- the earlier issue-packet snapshot with `6` missing-on-disk rows did not reproduce on current `main`
- `docs:freshness:maintain` still reported `blocking_changed_paths=[]`, verified configured owner `CO-175` as terminal, and required a new live owner path instead of reusing terminal metadata

### Post-refresh Disposition
CO-300 re-homed the rolling-freshness owner metadata to live issue `CO-300`, refreshed the reviewed Mar 22 packet/spec rows plus the hard-stale issues guide, and added fail-closed regression coverage so terminal owners cannot be reused as the live maintenance path. Post-fix validation at `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/after/docs-freshness.json` and `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/after/docs-freshness-maintenance.json` returned `docs:freshness OK` with `0` stale rows and `docs:freshness:maintain=clean`, with owner verification resolved to live `CO-300` while that issue was active.

## Apr 23 Terminal Owner Reset and Reviewed Refresh

### Reproduction / Baseline Findings
CO-324 reproduced the Apr 23 current-main baseline failure in `out/linear-3c52bf66-f805-4537-8671-ad1dec2f4623/docs-freshness-baseline.json` and `out/linear-3c52bf66-f805-4537-8671-ad1dec2f4623/docs-freshness-maintenance-baseline.json`:

- `31` stale entries
- `0` rolling cohort entries
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- `27` eligible historical task/report rows from the adjacent `0955`, `1319`-`1321`, and `linear-856c1318-524f-4db3-8d4a-b357ec51c304` families
- `4` hard-stale Active Guide/reference rows: `docs/guides/collab-vs-mcp.md`, `docs/guides/evaluation-playbook.md`, `docs/reference/metrics-collab-context-rot.md`, and `docs/release-notes-template-addendum.md`
- `docs:freshness:maintain` reported `blocking_changed_paths=[]`, verified configured owner `CO-300` as terminal `Done`, and required a new live owner path instead of reusing terminal metadata

### Post-refresh Disposition
CO-324 re-homes the rolling-freshness owner metadata to live issue `CO-324`, preserves `CO-300` as historical terminal-owner evidence only, and reviews the current Apr 23 stale set directly instead of increasing rolling caps or weakening freshness gates. The reviewed disposition is recorded in `docs/findings/linear-3c52bf66-f805-4537-8671-ad1dec2f4623-docs-freshness-classification.md`; the stale rows are refreshed to `last_review=2026-04-23`. CO-321 remains out of scope and its refreshed `tasks/specs` cohort is not modified.

## Apr 24 Terminal Owner Reset and Reviewed Refresh

### Reproduction / Baseline Findings
CO-343 reproduced the Apr 24 current-main blocker during CO-341 validation:

- `node scripts/spec-guard.mjs --dry-run` printed five stale active-spec failures with `last_review=2026-03-24` while exiting zero.
- `node scripts/spec-guard.mjs` exited non-zero on the same five specs.
- `npm run docs:freshness` reported `24` stale task packet/mirror rows and no missing registry, missing-on-disk, invalid, or uncatalogued rows.
- `docs:freshness:maintain` verified configured owner `CO-324` as terminal `Done` and required a new live owner path.

### Post-refresh Disposition
CO-343 re-homes the rolling-freshness owner metadata to live issue `CO-343`, preserves `CO-324` as historical terminal-owner evidence only, and reviews the Apr 24 stale rows directly instead of changing rolling policy. The reviewed disposition is recorded in `docs/findings/co-343-apr-24-docs-freshness-classification.md`; the exact stale spec frontmatters and registry rows are refreshed to `last_review=2026-04-24`.

## Apr 25 Rolling Owner Deferral

### Reproduction / Baseline Findings
CO-352 replayed onto current `origin/main` on Apr 25 and reproduced a date-boundary freshness blocker unrelated to the CO-352 diff:

- `npm run docs:freshness` reported `38` stale historical task packet/mirror rows with `last_review=2026-03-25`, `cadence_days=30`, `age_days=31`, and `overdue_days=1`.
- The stale set contains only Task Packet and Task Mirror rows and has `0` missing registry, missing-on-disk, invalid, or uncatalogued rows.
- `docs:freshness:maintain` reported `blocking_changed_paths=[]`; the current CO-352 diff only prepends its own task snapshot and adds the CO-352 packet/registry entries.
- The stale lineage is the March 25 historical `1311`-`1318` task-packet/mirror set, not a public-guide, active-guide, agent-policy, skill, template, or current CO-352 packet failure.

### Rolling Disposition
CO-352 declares `co-343-apr-25-march-25-task-packets-1311-1318` as an in-window rolling cohort under the existing live maintenance owner `CO-343`. This does not refresh `last_review` dates or hide the debt: `docs:freshness` continues to emit the cohort in `rolling_freshness_cohorts`, and CO-343 remains responsible for resolving it by review, archive, reclassification, or a new owner path before the rolling window expires.

## Apr 26 Targeted CO-21 Reviewed Refresh

### Reproduction / Baseline Findings
CO-378 reproduced the remaining Apr 26 blocker while unblocking CO-375:

- `npm run docs:freshness` reported `6` stale rows, all for the completed CO-21 workpad-contract packet `linear-df2bd49b-2dd6-413f-8d90-af40d033dace`.
- `docs:freshness:maintain` reported `blocking_changed_paths=[]` but resolved the configured maintenance owner to `CO-343`, which live Linear showed as `Done` and outside the configured project.
- The original CO-378 missing-path blocker for `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` no longer reproduced on current `origin/main`.
- Live CO-21 evidence showed PR `#304` merged, the issue state is `Done`, and its single workpad comment already records terminal closeout and validation.

### Post-refresh Disposition
CO-378 reviews the CO-21 terminal packet directly instead of changing rolling policy, increasing caps, or hiding the debt under terminal `CO-343`. The exact CO-21 registry rows plus matching spec/task-index review dates are refreshed to `last_review=2026-04-26`; stale specs `0955` and `0956` are also refreshed as the hard spec-guard tail for this branch.

## Apr 27 Mar 27 Reviewed Refresh and Owner Re-home

### Reproduction / Baseline Findings
CO-401 reproduced the Apr 27 current-main blocker while unblocking unrelated clean feature diffs:

- `npm run docs:freshness` reported `30` stale task packet/mirror rows at `last_review=2026-03-27`, `cadence_days=30`, `age_days=31`, and `overdue_days=1`.
- `docs:freshness:maintain` reported `freshness_decision=block_diff_local`, `blocking_changed_paths=[]`, and owner verification failure for configured owner `CO-343`.
- Direct Linear verification showed `CO-343` was not a valid same-project live owner for the current maintenance scope.
- Parent review classified the five affected Mar 27 task packets before refreshing any metadata: CO-8 runtime proof, CO-23 DNS-aware runtime proof, CO-13 child-stream support, CO-7 operator observability, and CO-5 terminal cleanup.

### Post-refresh Disposition
CO-401 re-homes the live rolling-freshness owner metadata to same-project issue `CO-401`, preserves the canonical owner key `docs:freshness:maintain`, and keeps `CO-343` only as historical invalid-owner evidence. The exact reviewed Mar 27 registry rows plus matching spec/task-index review dates are refreshed to `last_review=2026-04-27`; post-fix `docs:freshness` and `docs:freshness:maintain` return clean with `0` stale rows, no candidate cohorts, and `blocking_changed_paths=[]`.

## Apr 28 Mar 28 Rolling Owner Re-home

### Reproduction / Baseline Findings
CO-420 reproduced the Apr 28 current-main blocker while keeping CO-415 timeout/core validation repair out of scope:

- `npm run docs:freshness` reported `33` stale rows: `28` Task Packet rows and `5` Task Mirror rows.
- `docs:freshness:maintain` reported `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-401`, `owner_issue_action.reason=configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, and `blocking_changed_paths=[]`.
- The candidate cohort date is `2026-03-28`, cadence `30`, age `31`, overdue `1`; affected path families are `.agent/task`, `docs/ACTION_PLAN-*`, `docs/PRD-*`, `docs/TECH_SPEC-*`, `tasks/specs`, and `tasks/tasks-*`.
- The preserved baseline reports are `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/before/docs-freshness.json` and `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/before/docs-freshness-maintenance.json`.

### Rolling Disposition
CO-420 re-homed the March 28 Task Packet / Task Mirror rows as declared rolling debt under `co-420-apr-28-march-28-task-packet-mirror`; this did not refresh `last_review` dates, delete rows, or weaken freshness policy. When CO-420 reached terminal `Done`, CO-409 became the live same-project `docs:freshness:maintain` owner for that retained rolling cohort. After CO-409 also reached terminal `Done`, CO-423 became the live same-project owner, preserving the canonical owner key while keeping terminal `CO-401`, terminal `CO-420`, and terminal `CO-409` as historical owner evidence only. Following CO-423 terminal `Done`, CO-425 became the live same-project owner.

## Apr 29 Terminal CO-409 Owner Re-home

### Reproduction / Baseline Findings
CO-423 reproduced the current-main owner blocker after CO-409 reached terminal `Done`:

- `docs:freshness:maintain` reported `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-409`, `owner_issue_action.reason=configured_owner_terminal`, and `blocking_changed_paths=[]`.
- Live Linear verification showed `CO-420` and `CO-409` as same-project terminal `Done` issues, while `CO-423` is the live same-project `docs:freshness:maintain` owner lane.
- The retained cohort remains `co-420-apr-28-march-28-task-packet-mirror`: `33` rolling rows, split into `28` Task Packet rows and `5` Task Mirror rows, with `last_review=2026-03-28` and `cadence_days=30`.

### Rolling Disposition
CO-423 re-homes only the live owner metadata for the existing March 28 rolling cohort. It keeps `docs:freshness:maintain` as the canonical owner key, preserves the `co-420-apr-28-march-28-task-packet-mirror` cohort identity, and does not refresh `last_review` dates, delete historical packet evidence, widen CO-422's Mar 29 `spec-guard` scope, or weaken `docs:freshness`.

## Apr 29 Terminal CO-423 Owner Re-home

### Reproduction / Baseline Findings
CO-425 reproduced the owner blocker after CO-423 reached terminal `Done`:

- `docs:freshness:maintain` reported `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-423`, `owner_issue_action.reason=configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, and `blocking_changed_paths=[]`.
- Live Linear verification showed `CO-423` as a same-project terminal `Done` issue, while `CO-425` is the live same-project `docs:freshness:maintain` owner lane.
- The retained cohort remains `co-420-apr-28-march-28-task-packet-mirror`: `33` rolling rows, split into `28` Task Packet rows and `5` Task Mirror rows, with `last_review=2026-03-28`, `cadence_days=30`, and `expires_after=2026-05-04`.

### Rolling Disposition
CO-425 re-homes only the live owner metadata for the existing March 28 rolling cohort. It keeps `docs:freshness:maintain` as the canonical owner key, preserves the `co-420-apr-28-march-28-task-packet-mirror` cohort identity, and does not refresh `last_review` dates, delete historical packet evidence, widen adjacent validation lanes, or weaken `docs:freshness`.

## Apr 30 Terminal CO-430 Owner Re-home

### Reproduction / Baseline Findings
CO-427 originally reproduced the owner blocker after CO-425 reached terminal `Done`, then reproduced the same live-owner failure shape after current main briefly moved the integrated owner to terminal `CO-430`:

- `docs:freshness:maintain` reported `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-425`, `owner_issue_action.reason=configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, and `blocking_changed_paths=[]`.
- After PR #728 merged, live Linear verification showed `CO-430` as a same-project terminal `Done` issue; terminal `CO-430` is therefore historical owner evidence only.
- Live Linear verification showed `CO-425` and `CO-430` as same-project terminal `Done` issues, while `CO-427` is the live same-project `docs:freshness:maintain` owner lane.
- The retained cohort remains `co-420-apr-28-march-28-task-packet-mirror`: `33` rolling rows, split into `28` Task Packet rows and `5` Task Mirror rows, with `last_review=2026-03-28`, `cadence_days=30`, and `expires_after=2026-05-04`.

### Rolling Disposition
CO-427 re-homes only the live owner metadata for the existing March 28 rolling cohort. It keeps `docs:freshness:maintain` as the canonical owner key, preserves the `co-420-apr-28-march-28-task-packet-mirror` cohort identity, preserves the CO-428/CO-429 March 30 repairs that already landed on current main, and does not refresh `last_review` dates, delete historical packet evidence, widen CO-428, CO-429, CO-430, or CO-431, or weaken `docs:freshness`.

## Apr 30 Terminal CO-427 Owner Re-home

### Reproduction / Baseline Findings
CO-441 reproduced the owner blocker after CO-427 reached terminal `Done`:

- `docs:freshness:maintain` reported `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-427`, `owner_issue_action.reason=configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, and `blocking_changed_paths=[]`.
- Live Linear verification showed `CO-427` as a same-project terminal `Done` issue, while `CO-441` is the live same-project `docs:freshness:maintain` owner lane.
- The retained cohort remains `co-420-apr-28-march-28-task-packet-mirror`: `33` rolling rows, split into `28` Task Packet rows and `5` Task Mirror rows, with `last_review=2026-03-28`, `cadence_days=30`, and `expires_after=2026-05-04`.

### Rolling Disposition
CO-441 re-homes only the live owner metadata for the existing March 28 rolling cohort. It keeps `docs:freshness:maintain` as the canonical owner key, preserves the `co-420-apr-28-march-28-task-packet-mirror` cohort identity, preserves CO-427 as historical terminal-owner evidence, and does not refresh `last_review` dates, delete historical packet evidence, widen CO-330 or CO-431, or weaken `docs:freshness`.

## Apr 30 Terminal CO-441 Owner Re-home

### Reproduction / Baseline Findings
CO-444 reproduced the owner blocker after CO-441 reached terminal `Done`:

- `docs:freshness:maintain` reported `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-441`, `owner_issue_action.reason=configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, and `blocking_changed_paths=[]`.
- Live Linear verification showed `CO-441` as a same-project terminal `Done` issue, while `CO-444` is the live same-project `docs:freshness:maintain` owner lane.
- The retained cohort remains `co-420-apr-28-march-28-task-packet-mirror`: `33` rolling rows, split into `28` Task Packet rows and `5` Task Mirror rows, with `last_review=2026-03-28`, `cadence_days=30`, and `expires_after=2026-05-04`.

### Rolling Disposition
CO-444 re-homes only the live owner metadata for the existing March 28 rolling cohort. It keeps `docs:freshness:maintain` as the canonical owner key, preserves the `co-420-apr-28-march-28-task-packet-mirror` cohort identity, preserves CO-441 as historical terminal-owner evidence, and does not refresh `last_review` dates, delete historical packet evidence, widen CO-443 or other implementation lanes, or weaken `docs:freshness`.

## May 4 April 3 Completed-Lane Residue Cleanup

### Reproduction / Baseline Findings
After CO-444 was reopened and returned to `In Progress`, `docs:freshness:maintain` stopped failing on terminal owner `CO-441` and verified `CO-444` as the live same-project non-terminal owner. The remaining failure changed shape to `freshness_decision=block_diff_local` with `owner_issue=CO-444`, `blocking_changed_paths=[]`, and seven April 3 residue cohorts: six `co-429-completed-lane-registry-residue` path-family cohorts plus one `co-428-stale-active-spec` cohort.

Live Linear issue-context reads on 2026-05-04 confirmed the source issues behind that April 3 residue are terminal: `CO-68` (`11672de5-eb62-4942-bfdf-1d8282d786d2`), `CO-75` (`27ac1e64-d88c-4add-b2f4-f4908cb63e80`), `CO-76` (`44a18317-8afe-47e4-b4ba-5424aae86dc5`), `CO-73` (`6bed26fd-ea66-43c1-8324-b10871769435`), and `CO-74` (`c4c32123-af51-4552-b55a-03d17917659c`) are all `Done` / `completed`.

### Rolling Disposition
CO-444 preserves `docs:freshness:maintain`, the live owner marker, and the March 28 `co-420-apr-28-march-28-task-packet-mirror` rolling cohort. The April 3 residue is not a new active owner path: the affected task-packet rows are archived as completed-lane historical metadata, the stale active specs are reclassified to terminal `done`, and the task index records the live Linear terminal evidence instead of blindly bumping active freshness or widening product-scope implementation lanes.

## May 4 Public / Bundled Skill Freshness Refresh

After the April 3 packet residue was cleared, `docs:freshness:maintain` found no candidate cohorts and no changed-path blockers, but still reported ten hard-stale active public/skill docs. CO-444 reviewed `docs/public/downstream-setup.md`, `docs/public/provider-onboarding.md`, and the affected bundled skill docs (`chrome-devtools`, `collab-deliberation`, `collab-evals`, `collab-subagents-first`, `delegate-early`, `elegance-review`, and `land`) against the current CO-local Codex `0.128.0` / `gpt-5.5` posture, provider onboarding contract, and provider-worker lifecycle guidance.

Those surfaces remain active guidance rather than rolling task-packet debt, so CO-444 refreshed only their registry `last_review` metadata. No public setup text, bundled skill behavior, `docs:freshness`, `docs:freshness:maintain`, or spec-guard policy was weakened.

## May 5 April 4 Completed-Lane Residue Cleanup

### Reproduction / Baseline Findings
After the May 4 cleanup, the calendar rollover to 2026-05-05 exposed the next rolling task-packet cohort. `docs:freshness:maintain` verified CO-444 as the live same-project owner, then failed with `freshness_decision=block_diff_local`, `blocking_changed_paths=[]`, and six April 4 `co-429-completed-lane-registry-residue` cohorts plus one `co-428-stale-active-spec` cohort.

Live Linear issue-context reads on 2026-05-05 confirmed the source issues behind the April 4 residue are terminal: `CO-79` (`486fd104-53d7-4657-b26f-c477f7e730a3`), `CO-81` (`529457d9-5636-4394-a21e-b96e4f4fae74`), `CO-78` (`bea56fb8-c601-4554-8ece-0a63c5fd34bc`), and `CO-77` (`da28812d-8367-4d94-a273-d0652535f818`) are all `Done` / `completed`.

### Rolling Disposition
CO-444 keeps `docs:freshness:maintain` and the live owner marker unchanged. The April 4 residue is not a new product implementation lane: the affected task-packet rows are archived as completed-lane historical metadata, stale active specs are reclassified to terminal `done`, and `tasks/index.json` records the live Linear terminal evidence. This follows the same owner-renewal rule as the April 3 cleanup: preserve historical evidence, avoid blind active `last_review` bumps, and keep product-scope implementation lanes out of recurring docs-freshness maintenance.

After the April 4 packet residue was cleared, the only remaining hard-stale row was active seeded template guidance in `templates/README.md`. CO-444 reviewed it as current initializer guidance and refreshed only the registry `last_review` metadata; no template behavior or public docs policy changed.

## May 7 April 6 Completed-Lane Residue Cleanup

### Reproduction / Baseline Findings

CO-511 reproduced the owner blocker after CO-444 reached terminal `Done`:

- `docs:freshness:maintain -- --format json` reported configured owner `CO-444` with `owner_issue_action.reason=configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, and `blocking_changed_paths=[]`.
- The same report surfaced the April 6 cleanup cluster: six task-packet / task-mirror path-family cohorts with `last_review=2026-04-06`, plus one stale active-spec cohort for April 6 task specs.
- Live Linear issue-context reads on 2026-05-07 confirmed the source issues behind the April 6 residue are terminal: `CO-100` (`179fd570-c493-49a7-9eaf-9222beca114a`), `CO-99` (`7f1931f8-cfd0-4698-951e-df1c3984a337`), `CO-102` (`f0d312eb-055f-4926-80df-8fcaaf56839c`), and `CO-97` (`bd8f3cc3-0871-470b-8c86-2f3815b326f2`) are all `Done` / `completed`.

### Rolling Disposition

CO-511 re-homes the live `docs:freshness:maintain` owner metadata from terminal `CO-444` to live same-project issue `CO-511`. The April 6 residue is not a new product implementation lane: the affected task-packet rows are archived as completed-lane historical metadata, the stale active specs are reclassified to terminal `done`, and `tasks/index.json` records the live Linear terminal evidence. This preserves historical packet evidence, avoids blind `last_review` churn, and keeps `docs:freshness` / `spec-guard` enforcement unchanged.
