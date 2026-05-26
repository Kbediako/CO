# Task Checklist - linear-43b226d3-abcc-42e8-a873-a1372d0ac128

- Linear Issue: `CO-569` / `43b226d3-abcc-42e8-a873-a1372d0ac128`
- MCP Task ID: `linear-43b226d3-abcc-42e8-a873-a1372d0ac128`
- Primary PRD: `docs/PRD-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
- TECH_SPEC: `tasks/specs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
- Shared source anchor: `ctx:sha256:c8af3976f2797b2c26a63723a434192feb3b3b84545710ef72467d2da74a98c7#chunk:c000001`
- Shared source payload from shared CO root: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source payload from provider issue worktree root to shared CO root: `../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source payload from this document directory to shared CO root: `../../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source manifest from shared CO root: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Shared source manifest from provider issue worktree root to shared CO root: `../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Shared source manifest from this document directory to shared CO root: `../../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Child docs-packet manifest: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Canonical owner key: `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
- Cohort id: `co-558-may-20-apr-19-task-report-maintenance`
- Configured historical owner evidence: `CO-558 terminal`
- Source breakdown: `{"rolling_window":68}`
- Sample paths:
  - `.agent/task/1299-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
  - `.agent/task/1300-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
  - `.agent/task/1301-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`

## Docs-First
- [x] PRD created for the CO-569 retained cohort owner packet. Evidence: `docs/PRD-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`.
- [x] TECH_SPEC created with protected terms, route language, and parent-owned boundaries. Evidence: `tasks/specs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`, `docs/TECH_SPEC-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`.
- [x] ACTION_PLAN created for packet-only child-lane output and parent-owned validation. Evidence: `docs/ACTION_PLAN-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`.
- [x] `tasks/index.json` registered with the exact canonical owner marker. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` registered the six packet/mirror rows. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` snapshot added. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`. Evidence: `.agent/task/linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared file scope. Evidence: final diff.
- [x] Child lane did not edit implementation, tests, scripts, workflows, `docs/docs-catalog.json`, or `docs/guides/docs-freshness-cohorts.md`. Evidence: final diff.
- [x] Child lane did not call Linear, GitHub, or lifecycle helpers. Evidence: this checklist and final command history.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Acceptance Criteria
- [x] Exact `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance` appears in every packet artifact and `tasks/index.json`.
- [x] Exact marker `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance` appears in every packet artifact and `tasks/index.json`.
- [x] Packet preserves `CO-558 terminal`, `co-558-may-20-apr-19-task-report-maintenance`, `{"rolling_window":68}`, and sample paths.
- [x] Packet preserves `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, `co-430-terminal-owner-replacement`, and `dry-run/no-token copyable body`.
- [x] Packet rejects blind `last_review` bumps, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, docs catalog edits, cohort guide edits, validation logic edits, Linear/GitHub/PR lifecycle mutation, and unrelated provider-worker behavior.
- [x] Parent verifies source payload in the authoritative workspace before owner or lifecycle work. Evidence: `shasum -a 256 ../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt` returned `c8af3976f2797b2c26a63723a434192feb3b3b84545710ef72467d2da74a98c7`.
- [x] Parent verifies live owner truth before any owner update or lifecycle transition. Evidence: `docs:freshness:maintain` post-change owner verification confirmed CO-569 live `In Progress` for this canonical owner key and no active CO-569 candidate remained.
- [x] Parent runs focused docs freshness validation after importing this packet. Evidence: `out/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/post3-docs-freshness.json` and `out/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/post3-docs-freshness-maintain.json`.

## Validation
- [x] Child scoped JSON parse check. Evidence: `jq empty tasks/index.json` and `jq empty docs/docs-freshness-registry.json` exited 0.
- [x] Child scoped registration checks. Evidence: `tasks/index.json` contains `20260524-linear-43b226d3-abcc-42e8-a873-a1372d0ac128`; `docs/docs-freshness-registry.json` contains six active `CO-569` rows.
- [x] Child source anchor check. Evidence: `shasum -a 256 ../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt` returned `c8af3976f2797b2c26a63723a434192feb3b3b84545710ef72467d2da74a98c7`.
- [x] Child scoped protected-term check over the packet, mirrors, registry, task index, and docs task snapshot. Evidence: protected-term check found all required terms and sample paths.
- [x] Child scoped whitespace / diff check on touched files. Evidence: trailing-whitespace scan returned no matches, and `git diff --check -- <declared CO-569 files>` exited 0.
- [x] Child scoped ASCII check. Evidence: diff-only ASCII check for tracked additions plus all new packet files passed; whole-file `docs/TASKS.md` can contain unrelated historical non-ASCII text.

## Progress Log
- 2026-05-24: Bounded same-issue child lane created the CO-569 docs-first packet and registry evidence. The packet preserves `docs:freshness:maintain`, exact canonical owner key/marker, `CO-558 terminal`, `co-558-may-20-apr-19-task-report-maintenance`, `{"rolling_window":68}`, sample paths, terminal-owner replacement, completed-lane registry residue, rolling-debt cohort, `co-430-terminal-owner-replacement`, and dry-run/no-token copyable body while rejecting blind `last_review` bumps, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, docs catalog edits, cohort guide edits, validation logic edits, Linear/GitHub/PR lifecycle mutation, and unrelated provider-worker behavior.
- 2026-05-24: Child scoped validation passed for source-anchor hash, JSON parse, registry/task registration, protected terms, changed-file scope, whitespace/diff check, and diff-only ASCII.

## 2026-05-26 Retained Cohort Resume
- [x] CO-569 resumed from Blocked to In Progress with guarded transition. Evidence: Linear transition at 2026-05-26T04:04:59.655Z.
- [x] Parallelization decision recorded as stay_serial / overlapping_scope. Evidence: Linear parallelization audit for CO-569.
- [x] Baseline May 20 rolling cohort captured. Evidence: out/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/baseline-docs-freshness.json, out/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/baseline-docs-freshness-maintain.json.
- [x] Live Linear issue-context verified CO-260 and CO-254 Done/completed. Evidence: linear issue-context --issue-id CO-260, linear issue-context --issue-id CO-254.
- [x] Task specs 1299-1302 reviewed as done with zero local open checklist obligations. Evidence: task specs 1299-1302 and checklist grep returned no open items.
- [x] Expired May 20 retained cohort rows reclassified as retained terminal history. Evidence: out/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/co569-may20-terminal-classification.json, docs/docs-freshness-registry.json, tasks/index.json.
- [x] Delegation and diff budget gates recorded. Evidence: `DELEGATION_GUARD_OVERRIDE_REASON=delegation_mcp_transport_closed_parent_used_serial_revalidation node scripts/delegation-guard.mjs` and `node scripts/diff-budget.mjs`.
- [x] Post-change docs freshness and maintenance validation. Evidence: `docs:freshness` still reports external stale debt but `terminal_lifecycle_entries=0`; `docs:freshness:maintain` reports `freshness_decision=block_spec_guard_pre_expiry`, `blocking_changed_paths=[]`, active owners `CO-579` and `CO-581`, and no active CO-569 candidate.
- [x] Explicit elegance/minimality review completed. Evidence: `out/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/manual/elegance-review.md`.
- [x] Shared PR #898 review quota waiver recorded. Evidence: external CO-581/CO-579 docs freshness debt is cleared on PR #898 at `d25821252f`; `out/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066/manual/20260526T050822Z-review-quota-waiver.md` records the Codex quota waiver, green checks, CodeRabbit approval, and zero unresolved review threads.
- 2026-05-26: Parent corrected the imported packet source path from a non-existent `-docs-packet` artifact to the authoritative `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3` manifest/source pair and verified source hash `c8af3976f2797b2c26a63723a434192feb3b3b84545710ef72467d2da74a98c7`.
