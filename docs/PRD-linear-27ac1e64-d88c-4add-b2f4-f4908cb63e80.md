# PRD - CO: Automate docs truthfulness and relevance across README, shipped skills, and agent-facing docs

- Linear issue: `CO-75` / `27ac1e64-d88c-4add-b2f4-f4908cb63e80`
- Problem Statement: CO's current docs automation verifies structural hygiene and review cadence, but it does not keep front-door docs, shipped skills, and agent-facing guidance truthful to the live Codex posture, bundled skill tree, or intended front-door scope.
- Desired Outcome: add a checked-in docs catalog plus a blocking truthfulness gate and class-separated drift reporting, then align the currently stale front-door and shipped docs so those checks pass on the live tree.

## User Request Translation (Context Anchor)
- User intent / needs: make README, bundled skills, and agent-facing docs fail fast when they drift from the current CO posture or shipped skill tree, and make weekly reporting highlight those surfaces instead of burying them under task packets and mirrors.
- Success criteria / acceptance:
  - a checked-in docs catalog classifies active surfaces by audience, class, source of truth, owner, cadence, and update triggers
  - blocking automation covers README, `docs/README.md`, `AGENTS.md`, `docs/AGENTS.md`, active guides, shipped skills, and seeded templates
  - the gate fails on stale front-door posture, bundled-skill roster divergence, and README front-door budget drift
  - weekly automation emits a class-separated drift artifact
- Constraints / non-goals:
  - keep existing docs hygiene and docs freshness checks intact
  - do not silently auto-edit drifted docs
  - do not rewrite historical task packets
  - avoid a wholesale README rewrite; keep changes bounded to making the front door truthful and budgeted

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs truthfulness and relevance`
  - `front-door docs`
  - `shipped skills`
  - `agent-facing docs`
  - `front-door size/section-budget check`
  - `class-separated drift report`
- Protected terms / exact artifact and surface names:
  - `README.md`
  - `docs/README.md`
  - `AGENTS.md`
  - `docs/AGENTS.md`
  - `docs/guides/`
  - `skills/*/SKILL.md`
  - `skills/**`
  - `templates/codex/**`
  - `scripts/docs-hygiene.ts`
  - `scripts/docs-freshness.mjs`
  - `docs-relevance-advisory`
- Nearby wrong interpretations to reject:
  - treating this as only a freshness-registry metadata tweak
  - solving the issue by making docs-relevance advisory louder but still non-blocking
  - hiding front-door drift inside the existing task-packet-heavy report
  - turning the issue into a full historical docs rewrite or auto-fix bot

## Parity / Alignment Matrix
- Current truth:
  - `docs:check` validates scripts, pipeline ids, paths, and task snapshot shape
  - `docs:freshness` validates flat registry coverage, owners, dates, and missing files
  - front-door and shipped docs can still state stale posture, miss bundled skills, or keep growing without a front-door budget
- Reference truth:
  - current posture lives in `docs/guides/codex-version-policy.md`, `AGENTS.md`, and `docs/AGENTS.md`
  - shipped bundled skills are the directories under `skills/`
  - downstream-seeded posture lives under `templates/codex/**`
- Target truth / intended delta:
  - checked-in catalog drives doc classification and truth-source wiring
  - `docs:check` becomes a blocking truthfulness gate for tier-1 and shipped surfaces
  - `docs:freshness` emits class-separated results so front-door/shipped drift stays visible
  - README becomes a short front door that points deeper detail at structured docs
- Explicitly out-of-scope differences:
  - rewriting old task packets for new catalog semantics
  - broad semantic fact-checking for every archived or generated doc
  - automatic drift correction without review-visible diffs

## Not Done If
- README, shipped skills, or agent-facing docs can still name an older active Codex posture without the gate failing.
- The documented bundled skill roster can diverge from the actual `skills/` tree without the gate failing.
- Weekly automation still emits only a flat or task-packet-dominated docs report.

## Goals
- Add a checked-in catalog for active and inventory surfaces.
- Add blocking truthfulness checks for front-door, agent-facing, shipped-skill, and seeded-template surfaces.
- Make the weekly report class-separated and front-door-biased.
- Trim and realign current front-door and shipped docs just enough for the new gate to pass truthfully.

## Non-Goals
- Rewriting every historical packet, mirror, or archive.
- Weakening the current `docs:check` or `docs:freshness` failure conditions.
- Building a generic LLM semantic reviewer for docs.
- Fully redesigning the README information architecture beyond the bounded front-door budget change.

## Stakeholders
- Product: CO operators and downstream users who start from `README.md` and shipped skills.
- Engineering: maintainers of docs automation, runtime policy, packaging, and downstream templates.
- Design: not applicable for this lane.

## Metrics & Guardrails
- Primary Success Metrics:
  - `npm run docs:check` fails on seeded stale posture or bundled-skill roster drift in tier-1 docs
  - `npm run docs:freshness` report includes class-separated totals and failures
  - weekly automation publishes the class-separated report artifact
- Guardrails / Error Budgets:
  - preserve existing docs hygiene and freshness coverage
  - avoid false canonical skill lists that omit shipped directories
  - keep README changes bounded and link deeper detail to `docs/README.md`

## User Experience
- Personas:
  - downstream operator reading the package README
  - repo contributor reading `docs/README.md` and `docs/AGENTS.md`
  - Codex agent consuming shipped skills and seeded templates
- User Journeys:
  - user lands on `README.md` and gets current posture plus short next steps
  - contributor runs docs gates and sees front-door drift separated from task-packet noise
  - weekly maintainer review opens one artifact and sees which doc class drifted

## Technical Considerations
- Architectural Notes:
  - keep truthfulness blocking inside the existing `docs:check` lane
  - keep `docs:freshness` as the broader reporting lane, but drive classification from the new catalog
  - represent task packets, mirrors, and archives by patterns so the catalog is maintainable
- Dependencies / Integrations:
  - `scripts/docs-hygiene.ts`
  - `scripts/docs-freshness.mjs`
  - `scripts/lib/docs-helpers.js`
  - `package.json`
  - `.github/workflows/*.yml`

## Open Questions
- Whether active guides should all share one posture-lock policy, or whether only specifically tagged guides should enforce current-posture wording. This lane should choose the smallest truthful policy that still covers the acceptance surfaces.

## Approvals
- Product: self-serve provider-worker lane
- Engineering: pending docs-review
- Design: not applicable
