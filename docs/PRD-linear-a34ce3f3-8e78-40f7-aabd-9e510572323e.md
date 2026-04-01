# PRD - CO: clear repo-wide docs:freshness baseline blocking review handoffs

## Added by Bootstrap 2026-04-01

## Traceability
- Linear issue: `CO-63` / `a34ce3f3-8e78-40f7-aabd-9e510572323e`
- Linear URL: https://linear.app/asabeko/issue/CO-63/co-clear-repo-wide-docsfreshness-baseline-blocking-review-handoffs
- Related source issue: `CO-62`

## Summary
- Problem Statement: worker lanes such as `CO-62` can finish their scoped implementation diff and PR checks, but still cannot hand off truthfully because `npm run docs:freshness` is already failing on repo-wide stale-doc debt unrelated to the lane diff. The initial reproduction in this lane confirmed a seeded stale baseline (`171` stale registry entries) rather than a `CO-62` regression.
- Desired Outcome: restore a truthful repo-wide docs-freshness baseline on current `main` by refreshing genuinely active stale docs and intentionally reclassifying or archiving non-active implementation material, without weakening the gate or pretending the stale set belongs to `CO-62`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-63` in the current provider-worker workspace by treating the stale-doc backlog as a repo-wide baseline repair lane, not as a `CO-62` implementation bug, and leave the repository in a state where review handoffs can pass `docs:freshness` honestly again.
- Success criteria / acceptance:
  - `npm run docs:freshness` passes on the final branch state
  - any remaining stale-doc exceptions are explicitly reclassified truthfully rather than hidden behind silent waivers
  - worker lanes no longer need draft holds purely because the repo-wide baseline is already red
- Constraints / non-goals:
  - do not reopen `CO-62` implementation logic or its Linear rate-limit scope
  - do not remove or weaken `docs:freshness` from the required validation chain
  - do not solve the problem by silently bumping review dates or statuses without a truthful review or archive rationale

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness`
  - `stale docs`
  - `last_review`
  - `cadence_days`
  - `review handoff`
  - `repo-wide baseline`
- Protected terms / exact artifact and surface names:
  - `docs/docs-freshness-registry.json`
  - `npm run docs:freshness`
  - `out/linear-95b040bc-b150-4c39-bc56-64b13f55579f-co-62-docs-review/docs-freshness.json`
  - `CO-62`
- Nearby wrong interpretations to reject:
  - "just update the `CO-62` docs packet again"
  - "waive the baseline only for one PR"
  - "disable or soften the `docs:freshness` gate"
  - "turn this into unrelated runtime or Linear workflow work"

## Parity / Alignment Matrix
- Current truth: this branch now restores a truthful green baseline. The original `171`-entry stale set now resolves to `77` archived historical docs and `94` active docs. `41` docs were restored from an earlier archived intermediate classification: `38` after task-status review showed their tasks are still non-terminal in `tasks/index.json`, and `3` more when the live `0303` autonomy packet was restored locally because the overview docs still route readers through that still-open planning task. The overview-linked archived docs with existing `doc-archives` payloads were converted into explicit stubs, and the `13` payload-gap docs remained `active` rather than being silently hidden as archived. `npm run docs:freshness` now reports `docs:freshness OK - 3166 docs, 3176 registry entries`.
- Reference truth: review-handoff lanes should be able to run the required validation floor on top of a truthful green baseline, with stale docs either refreshed as active guidance or clearly archived/deprecated when they are historical implementation material.
- Target truth / intended delta: keep the repo in a state where `docs:freshness` stays green without hiding active stale docs, and where overview docs no longer present archived primary docs as live full-content files.
- Explicitly out-of-scope differences: `CO-62` feature changes, runtime behavior changes unrelated to docs freshness, and long-range docs tooling redesign beyond the minimum truthful baseline repair needed now.

## Not Done If
- `npm run docs:freshness` still fails on current `main` because unrelated repo-wide stale entries remain active.
- worker lanes still need to keep otherwise-ready PRs in draft only because the baseline was already red.
- the closeout cannot explain which entries were refreshed as active docs versus intentionally moved to non-active status.

## Goals
- Reproduce the current repo-wide stale-doc baseline in the issue workspace.
- Separate the stale set into genuinely active guidance versus historical implementation material that should be archived or reclassified.
- Land the smallest truthful registry or archive repair needed to make `docs:freshness` pass again.
- Keep the lane clearly separate from `CO-62` feature scope while recording enough evidence for later worker handoffs.

## Non-Goals
- Reopening `CO-62` implementation logic or its PR scope.
- Broad docs authoring workflow redesign beyond what is needed to clear the current truthful baseline.
- Papering over stale active docs with fake review dates or silent status downgrades.

## Stakeholders
- Product: CO operators and reviewers blocked on truthful review handoffs
- Engineering: Codex / docs registry maintainers / worker-lane owners
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `npm run docs:freshness` exits `0`
  - stale active docs are either freshly reviewed or intentionally reclassified with explicit rationale recorded in the archive/classification report or equivalent audit artifact, without adding per-entry rationale fields to `docs/docs-freshness-registry.json`
  - `CO-62` and future worker lanes can hand off without inheriting this unrelated baseline debt
- Guardrails / Error Budgets:
  - keep the repair bounded to docs packets, registry metadata, archive policy use, and supporting docs evidence
  - preserve truthfulness around which docs remain active versus archived
  - create a follow-up issue instead of expanding scope if the lane uncovers a larger policy/tooling redesign need

## User Experience
- Personas: provider-worker owner, reviewer verifying a handoff lane, maintainer auditing docs freshness drift
- User Journeys:
  - a worker runs `npm run docs:freshness` and gets a truthful green baseline instead of inherited stale-doc debt
  - a reviewer can see which docs were refreshed and which were archived or reclassified
  - a maintainer can audit the registry and archive policy without re-triaging `CO-62`

## Technical Considerations
- Architectural Notes:
  - the stale set is repo-wide, not issue-local, so the repair likely spans `docs/docs-freshness-registry.json`, archive policy use, and a bounded active-doc review pass
  - existing implementation-docs archive automation already defines how completed task packets move off the active baseline, so this lane should prefer that policy where it fits
  - if a doc is kept `archived` while still surfaced through `docs/PRD.md`, `docs/TECH_SPEC.md`, or `docs/ACTION_PLAN.md`, the file itself must read as an archive stub rather than as live full content
  - docs without matching `doc-archives` payloads must stay `active` until they can be archived truthfully
  - still-active guidance under `.agent/`, `.ai-dev-tasks/`, `docs/guides/`, `docs/reference/`, and similar roots must stay truthful if kept `active`
- Dependencies / Integrations:
  - `scripts/docs-freshness.mjs`
  - `docs/docs-freshness-registry.json`
  - `scripts/implementation-docs-archive.mjs`
  - `docs/implementation-docs-archive-policy.json`
  - `tasks/index.json`
  - `docs/TASKS.md`

## Open Questions
- Initial reproduction already answered the immediate blocker question: the baseline was genuinely red before `CO-62` touched it.
- Remaining follow-up question for later lanes: whether the `13` payload-gap docs restored to `active` should gain `doc-archives` payloads and move back into the archive path, or stay active as current guidance.

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending docs-review, stale-set classification, validation, and pre-handoff review/elegance gates
- Design: N/A
