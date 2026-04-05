# ACTION_PLAN — AttnRes-Inspired Fixed-Model Memory + Autonomy Backlog Shaping

## Summary
- Goal: complete the deep audit and backlog-shaping pass for the AttnRes-inspired fixed-model memory initiative in CO.
- Scope: audit docs, code surfaces, eval/metrics, and current backlog; maintain a parent synthesis ledger; shape dependency-ordered backlog issues or drafts.
- Assumptions: current docs partially cover autonomy/RLM/externalized context, but the initiative still needs a precise delta map and deduped backlog.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `source 0`
  - `block memory`
  - `run memory controller`
  - `role-specific retrieval`
  - `competitive scoring`
  - `anti-dominance normalization`
  - `experience retrieval`
  - `externalized context`
- Not done if:
  - backlog is shaped before dedupe
  - the parent ledger does not carry the final matrix/dedupe/dependency decisions
  - issues/drafts do not specify exact surfaces and evaluation hooks
- Pre-implementation issue-quality review:
  - compare candidate items to `0303`, `0940`, RLM quick wins, and current memory/experience-related issue ownership before creating anything

## Milestones & Sequencing
1. Read brief and baseline docs, create branch, initialize docs-first packet and parent ledger.
2. Run four mandatory deep-audit subagents and update the parent ledger after each return.
3. Build the covered/partial/missing matrix, dedupe map, and dependency graph.
4. Shape backlog by updating existing issues where possible and creating only missing slices.
5. Produce final recommendation on `0303` extension vs sibling stream vs new umbrella.

## Dependencies
- remote brief reference `origin/docs/attnres-backlog-brief:docs/CODEX_BRIEF-attnres-memory-backlog.md`
- current autonomy/RLM docs and existing issue ownership
- Linear write access for live issue creation/update

## Validation
- Checks / tests:
  - verify branch is not `main`
  - verify all mandatory audit scopes were covered
  - verify issue creation/update results in no direct duplicates
- Rollback plan:
  - if backlog shaping is not safe, stop at markdown issue drafts and keep the audit ledger as the canonical handoff artifact

## Risks & Mitigations
- Risk: the audit drifts into vague research without backlog output.
  - Mitigation: parent ledger carries dependency-ordered issue proposals as findings come in.
- Risk: duplicate issues get created around already-owned autonomy surfaces.
  - Mitigation: mandatory issue-dedupe stream before any issue creation.
- Risk: context bloat at the parent layer.
  - Mitigation: compress all subagent findings into the ledger; do not preserve raw transcript dumps in parent context.

## Approvals
- Reviewer: Pending
- Date: 2026-04-05
