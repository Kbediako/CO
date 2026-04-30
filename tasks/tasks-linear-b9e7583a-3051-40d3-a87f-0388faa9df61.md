# Task Checklist - linear-b9e7583a-3051-40d3-a87f-0388faa9df61

- Linear Issue: `CO-441` / `b9e7583a-3051-40d3-a87f-0388faa9df61`
- Primary PRD: `docs/PRD-linear-b9e7583a-3051-40d3-a87f-0388faa9df61.md`
- TECH_SPEC: `tasks/specs/linear-b9e7583a-3051-40d3-a87f-0388faa9df61.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b9e7583a-3051-40d3-a87f-0388faa9df61.md`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Source manifest: `.runs/linear-b9e7583a-3051-40d3-a87f-0388faa9df61-docs-packet/cli/2026-04-30T05-13-56-467Z-10e9a902/manifest.json`

## Docs-First
- [x] CO-441 packet drafted with protected terms, non-goals, Not Done If, acceptance criteria, and parity matrix. Evidence: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, and mirrors above.
- [x] Tactical owner interpretation recorded. Evidence: packet states CO-441 is a narrow current live-owner hold, CO-330 stays scoped, and CO-431 remains structural/root automation owner.
- [x] Terminal-owner context preserved. Evidence: packet references `CO-427`, `configured_owner_terminal`, `rolling freshness cohort`, and canonical owner key `docs:freshness:maintain`.
- [x] Parent ownership split recorded. Evidence: packet and plan state the child lane stayed packet-only while the parent owns the narrow `docs/docs-catalog.json` and `docs/guides/docs-freshness-cohorts.md` owner re-home, Linear state, workpad, PR lifecycle, and full validation.

## Registration
- [x] `tasks/index.json` registration added. Evidence: item `20260430-linear-b9e7583a-3051-40d3-a87f-0388faa9df61`.
- [x] `docs/TASKS.md` snapshot added. Evidence: CO-441 top snapshot.
- [x] `docs/docs-freshness-registry.json` packet rows added. Evidence: six rows for CO-441 packet and mirror files.

## Not Done If
- CO-441 packet or mirrors omit `docs:freshness:maintain`, `rolling freshness cohort`, `CO-427`, `configured_owner_terminal`, or canonical owner key `docs:freshness:maintain`.
- The packet implies CO-330 should absorb docs freshness owner repair.
- The packet implies CO-441 replaces `CO-431`.
- The child lane edits `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, source code, validation scripts, package files, Linear state, workpad, or PR lifecycle surfaces.
- Parent catalog/cohort-guide edits exceed the narrow CO-441 owner re-home and lineage evidence.
- Historical evidence is deleted or `docs:freshness` / `docs:freshness:maintain` behavior is weakened.

## Acceptance Criteria
- [x] Create or update packet docs using recent `docs:freshness:maintain` owner re-home patterns.
- [x] Register the task in `tasks/index.json` using canonical task id format.
- [x] Add docs-freshness registry coverage for new packet/mirror docs with current last_review evidence.
- [x] Keep acceptance criteria and Not Done If conditions visible in packet/checklist surfaces.
- [x] Parent accepted the patch artifact and ran full validation. Evidence: child lane `docs-packet` accepted; parent validation includes `docs:freshness` and `docs:freshness:maintain` with live `owner_issue=CO-441`.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: scoped child-lane parse check.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: scoped child-lane parse check.
- [x] Targeted packet path scan. Evidence: scoped child-lane `rg` check for `linear-b9e7583a-3051-40d3-a87f-0388faa9df61` and `CO-441`.
- [x] Targeted protected-term scan. Evidence: scoped child-lane `rg` check for `docs:freshness:maintain`, `rolling freshness cohort`, `CO-427`, `configured_owner_terminal`, canonical owner key `docs:freshness:maintain`, `CO-330`, and `CO-431`.
- [x] Parent full validation. Evidence: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, docs:freshness:maintain, repo stewardship, diff-budget, JSON parse, and `git diff --check` passed before standalone review.
- [x] Standalone review finding addressed. Evidence: review rerun completed as `bounded-success` with no actionable issues after the P2 packet-scope contradiction was corrected by aligning the packet with the parent-owned catalog/cohort-guide repair.
- [x] Explicit elegance review completed. Evidence: `out/linear-b9e7583a-3051-40d3-a87f-0388faa9df61/manual/elegance-review.md` found no simplification patch.

## Notes
- This lane intentionally edits `docs/docs-catalog.json` and `docs/guides/docs-freshness-cohorts.md` only for the narrow CO-441 owner re-home and lineage evidence.
- This lane intentionally does not change CO-330 provider-refresh code.
- This lane intentionally does not replace CO-431.
- `configured_owner_terminal` is owner-truth evidence, not a waiver.
