# Task Checklist - linear-2a51671e-14fa-46c8-bce4-bcfd71e66066

- Linear Issue: `CO-581` / `2a51671e-14fa-46c8-bce4-bcfd71e66066`
- MCP Task ID: `linear-2a51671e-14fa-46c8-bce4-bcfd71e66066`
- Primary PRD: `docs/PRD-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
- TECH_SPEC: `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
- Parent source anchor: `ctx:sha256:8824b9aeafca297dd598861836955314d72ed9c6909cafd917eb485e571fa786#chunk:c000001`
- Parent source payload from shared CO root: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/memory/source-0/source.txt`
- Parent source manifest from shared CO root: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/manifest.json`
- Child docs-packet manifest: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/manifest.json`
- Canonical owner key: `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
- Cohort id: `co-558-may-19-apr-18-task-report-maintenance`
- Terminal historical owner evidence: `CO-568 terminal`
- Configured global owner evidence: `CO-579`
- Live exact owner issue: `CO-581`
- Source breakdown: `{"rolling_window":71}`
- Sample paths:
  - `.agent/task/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction.md`
  - `.agent/task/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md`
  - `.agent/task/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md`

## Docs-First
- [x] PRD created for the CO-581 retained cohort owner packet. Evidence: `docs/PRD-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] TECH_SPEC created with protected terms, route language, and parent-owned boundaries. Evidence: `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`, `docs/TECH_SPEC-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] ACTION_PLAN created for packet-only child-lane output and parent-owned validation. Evidence: `docs/ACTION_PLAN-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] `tasks/index.json` registered with the exact canonical owner marker. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` registered the six packet/mirror rows. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` snapshot added. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`. Evidence: `.agent/task/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] 2026-05-26 resume scope added for expired May 19 retained cohort cleanup. Evidence: `docs/PRD-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`, `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`, `docs/ACTION_PLAN-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared file scope. Evidence: final diff.
- [x] Child lane did not edit implementation, tests, scripts, workflows, `docs/docs-catalog.json`, or `docs/guides/docs-freshness-cohorts.md`. Evidence: final diff.
- [x] Child lane did not call Linear, GitHub, or lifecycle helpers. Evidence: this checklist and final command history.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Acceptance Criteria
- [x] Exact `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance` appears in every packet artifact and `tasks/index.json`.
- [x] Exact marker `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance` appears in every packet artifact and `tasks/index.json`.
- [x] Packet preserves `CO-568 terminal`, `co-558-may-19-apr-18-task-report-maintenance`, source anchor, and sample paths.
- [x] Packet preserves `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, `co-430-terminal-owner-replacement`, and `dry-run/no-token copyable body`.
- [x] Packet rejects blind `last_review` bumps, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, catalog mutation from this child lane, and unrelated provider-worker behavior.
- [x] Parent verifies source payload in the authoritative workspace after import.
- [x] Parent verifies live owner truth before any owner update, catalog update, or lifecycle transition.
- [x] Parent runs focused docs freshness validation after importing this packet.
- [x] Expired May 19 retained cohort rows are reviewed with evidence and classified as retained terminal history. Evidence: `out/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066/co581-may19-terminal-classification.json`, `docs/docs-freshness-registry.json`, `tasks/index.json`.
- [x] `docs:freshness:maintain -- --format json` no longer reports the May 19 CO-581 cohort as expired retained debt. Evidence: `out/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066/post-retained-docs-freshness-maintain.json` reports active owner issues `CO-569` and `CO-579`, with no `co-558-may-19-apr-18-task-report-maintenance` candidate.
- [x] Remaining freshness blockers are separately owned and named. Evidence: `docs:freshness:maintain` reports `CO-569` for `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance` and `CO-579` for `docs_freshness_candidate|doc_class:report_only|path_family:docs/findings|last_review:2026-04-25|cadence_days:30`.

## Fallback Expiry / Refactor Decision
- [x] Fallback / refactor decision captured for the parent-owned guide/catalog owner re-home.
- [x] Large-refactor check recorded: CO-581 stays scoped to the exact May 19 owner re-home; CO-580 remains the broader lifecycle/finalizer consolidation lane.
- [x] Minor-seam decision recorded: acceptable only because one bounded fallback decision exists for the exact canonical owner key and retained rolling-window expiry.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs freshness` exact-key owner override | May 19 retained rolling cohort remains owner-backed through `canonical_owner_issues[]` instead of blind `last_review` refresh or historical packet deletion. | expire fallback | CO-581 | Terminal `CO-568` could no longer serve as live owner while the May 19 rolling cohort was still inside its freshness window. | 2026-05-18 | 2026-05-24 | 2026-05-25 | Refresh, archive, reclassify, or let the May 19 cohort expire; if live owner verification fails before expiry, reuse or create the exact canonical owner and intentionally re-home `docs/docs-catalog.json`. | `node scripts/spec-guard.mjs --dry-run`, `npm run docs:freshness`, and `npm run docs:freshness:maintain -- --format json`. |

2026-05-26 resolution: the expired May 19 fallback was removed by reclassifying all 71 cohort rows to `retained_terminal_packet` with explicit terminal task status, closed local checklist evidence, and CO-239 Done/completed evidence for the classification report.

## Validation
- [x] Child scoped JSON parse check. Evidence: `jq empty tasks/index.json` and `jq empty docs/docs-freshness-registry.json` exited 0.
- [x] Child scoped registration checks. Evidence: `tasks/index.json` contains `20260524-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066`; `docs/docs-freshness-registry.json` contains six active `CO-581` rows.
- [x] Child scoped protected-term check over the packet, mirrors, registry, task index, and docs task snapshot. Evidence: Node protected-term check found all required owner terms, source anchor, and sample paths.
- [x] Child scoped whitespace / diff check on touched files. Evidence: trailing-whitespace scan returned no matches, and `git diff --check -- docs/TASKS.md docs/docs-freshness-registry.json tasks/index.json` exited 0.
- [x] Child scoped minimality review confirms no implementation/catalog/guide drift. Evidence: changed-file scope check listed only declared files.
- [x] Parent live owner validation passed. Evidence: `npm run docs:freshness:maintain -- --format json` reports CO-581 usable/In Progress for exact key and owner_finalizer.status=`passed_exact_canonical_owner_precedence`.
- [x] Baseline `npm run docs:freshness` captured for resumed CO-581 work. Evidence: `out/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066/baseline-after-co579-docs-freshness.json`.
- [x] Baseline `npm run docs:freshness:maintain -- --format json --dry-run-linear-actions --warn` captured for resumed CO-581 work. Evidence: `out/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066/baseline-after-co579-docs-freshness-maintain.json`.
- [x] Post-change `node scripts/spec-guard.mjs --dry-run` passes. Evidence: command exited 0 with `Spec guard: OK`.
- [x] Post-change `npm run docs:freshness` reports only separately owned blockers. Evidence: `out/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066/post-retained-docs-freshness.json` has no CO-581 May 19 stale cohort, with remaining `CO-569` rolling rows and one CO-579 report-only stale row.
- [x] Post-change `npm run docs:freshness:maintain -- --format json` reports only separately owned blockers. Evidence: `out/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066/post-retained-docs-freshness-maintain.json` reports `freshness_decision=block_unowned_repo_debt`, active owner issues `CO-569` and `CO-579`, and no May 19 CO-581 candidate.
- [x] Broader local gates passed or produced expected external blockers. Evidence: delegation guard override recorded, `npm run build` passed, `npm run lint` exited 0 with existing `DelegationMcpHealth.test.ts` warnings only, `npm run test` passed 367 files / 6380 tests, `npm run docs:check` passed, `npm run repo:stewardship` passed, `node scripts/diff-budget.mjs` passed, and `IMPLEMENTATION_DOCS_ARCHIVE_BASE_REF=HEAD node scripts/implementation-docs-archive.mjs --dry-run` archived 0 docs.

## Progress Log
- 2026-05-24: Bounded same-issue child lane created the CO-581 docs-first packet and registry evidence. The packet preserves `docs:freshness:maintain`, exact canonical owner key/marker, `CO-568 terminal`, `co-558-may-19-apr-18-task-report-maintenance`, sample paths, terminal-owner replacement, completed-lane registry residue, rolling-debt cohort, `co-430-terminal-owner-replacement`, and dry-run/no-token copyable body while rejecting blind `last_review` bumps, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, catalog mutation from this child lane, and unrelated provider-worker behavior.
- 2026-05-24: Child scoped validation passed for JSON parse, registry/task registration, protected terms, changed-file scope, trailing whitespace, and diff check.
- 2026-05-24: Parent re-homed exact-key catalog/guide owner metadata from terminal `CO-568` to live `CO-581`; maintenance evidence now reports `pass_with_owned_rolling_debt`, candidate owner_issue=`CO-581`, action mode=`update_existing`, and owner_finalizer.status=`passed_exact_canonical_owner_precedence`.
- 2026-05-26: Parent resumed CO-581 from `Blocked` to `In Progress` after current CO-582 maintainer evidence showed the May 19 retained cohort expired at `2026-05-25`. A fresh worktree was created at `.workspaces/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-retained-refresh`; parallelization was recorded as `stay_serial` / `overlapping_scope`.
- 2026-05-26: Parent classified all 71 expired May 19 cohort rows as terminal retained history after verifying tasks 1289-1298 are `done` with zero local open checklist obligations and live CO-239 is `Done/completed`; `docs:freshness:maintain` no longer reports the CO-581 cohort and now blocks only on separately owned CO-569/CO-579 debt.
