# PRD - CO-454 resolve March 31 docs freshness candidate cohorts

## Traceability
- Linear issue: `CO-454` / `9aedac3e-09df-4859-b818-b6f2d4dc8ccc`
- Linear URL: https://linear.app/asabeko/issue/CO-454/co-resolve-march-31-docs-freshness-candidate-cohorts
- Source issue: `CO-452` / `d412792b-9a2a-43d9-96dc-ca021e728d09`
- Task id: `linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc`
- Canonical spec: `tasks/specs/linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- Task checklist: `tasks/tasks-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- Agent mirror: `.agent/task/linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- Canonical registry id: `20260501-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Immediate Traceability
- Backlog hold target: `backlog_head_follow_up_traceability_pending`.
- Packet prefix: `linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc`.
- Packet files:
  - `docs/PRD-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
  - `docs/TECH_SPEC-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
  - `docs/ACTION_PLAN-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
  - `tasks/specs/linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
  - `tasks/tasks-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
  - `.agent/task/linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- Registry mirrors:
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`

## Summary
- Problem Statement: CO-452 reproduced `docs:freshness:maintain` returning `block_diff_local` on clean `origin/main`, so the blocker is not owned by the CO-452 js_repl posture diff. The live follow-up is CO-454, which must carry traceability for the March 31 docs freshness candidate cohorts under `co-429-completed-lane-registry-residue`.
- Desired Outcome: create the CO-454 docs-first packet and registry mirrors so autopilot no longer blocks `Backlog -> Ready` on `backlog_head_follow_up_traceability_pending`, then reclassify the completed March 31 source-issue packet families with live Linear review evidence and fresh validator proof.

## User Request Translation
- User intent / needs:
  - create the minimal CO-454 docs-first packet and registry mirrors
  - preserve source lineage from CO-452 into CO-454
  - preserve `docs:freshness:maintain` and canonical owner marker `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
  - preserve the exact blocker shape: March 31 docs freshness candidate cohorts, `block_diff_local`, `co-429-completed-lane-registry-residue`, and `blocking_changed_paths=[]`
  - make clear that this branch resolves only the reviewed completed-lane March 31 rows, while preserving the separate CO-444 rolling cohort and owner-rehome boundaries
- Success criteria / acceptance:
  - all six packet files exist for `linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc`
  - `tasks/index.json` registers `20260501-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc`
  - `docs/TASKS.md` includes a CO-454 traceability snapshot
  - `docs/docs-freshness-registry.json` covers the six packet files with `last_review=2026-05-01`
  - the completed CO-54, CO-45, CO-52, CO-55, and CO-56 packet families are archived with `last_review=2026-05-01` after live Linear review
  - `spec-guard`, `docs:freshness`, and `docs:freshness:maintain -- --format json` pass for this diff
  - protected terms are visible across packet/checklist surfaces
- Constraints / non-goals:
  - do not change CO-452 js_repl posture docs or tests
  - do not weaken `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`
  - do not delete registry rows or historical task packets to pass gates
  - do not blindly bump March 31 `last_review` dates without review rationale
  - do not claim owner re-home, row refresh, archive, or reclassification is complete without fresh validator evidence

## Intent Checksum
- Exact phrases to preserve:
  - `CO-454`
  - source `CO-452`
  - `docs:freshness:maintain`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
  - March 31 docs freshness candidate cohorts
  - `block_diff_local`
  - `co-429-completed-lane-registry-residue`
  - `candidate-2026-03-31-cadence-30-age-31`
  - `docs_freshness_candidate`
  - `last_review:2026-03-31`
  - `blocking_changed_paths=[]`
  - `backlog_head_follow_up_traceability_pending`
- Nearby wrong interpretations to reject:
  - treating the CO-452 js_repl posture diff as owner of March 31 stale packet/mirror debt
  - clearing the traceability packet and then claiming `block_diff_local` is fixed without live source-issue review and fresh validator evidence
  - weakening docs freshness checks or deleting registry rows
  - broadening into general Codex CLI `0.128.0` release intake
  - re-homing canonical owner metadata without a fresh `docs:freshness:maintain -- --format json` proof

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Backlog traceability | CO-454 includes Immediate Traceability in Linear but no repo packet or registry mirrors. | Helper-created follow-ups must create six packet files and mirror them into task and freshness registries before leaving Backlog. | Repo contains the CO-454 packet plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` mirrors. | Linear transition, provider launch, workpad, PR review lifecycle. |
| Freshness blocker | CO-452 and clean `origin/main` reproduced `block_diff_local` under `co-429-completed-lane-registry-residue`. | The blocker belongs to canonical owner key `docs:freshness:maintain`, not the CO-452 js_repl posture lane. | CO-454 archives the completed-lane March 31 packet families after live Linear review and fresh validator proof. | CO-444 rolling cohort re-home or release-intake work. |
| March 31 candidate cohorts | Candidate paths include `.agent/task`, `docs/ACTION_PLAN-*`, `docs/PRD-*`, `docs/TECH_SPEC-*`, `tasks/specs`, and `tasks/tasks-*`. | March 31 docs freshness candidate cohorts need explicit review rationale and preserved historical content. | CO-54, CO-45, CO-52, CO-55, and CO-56 rows remain on disk as archived historical packet records with `last_review=2026-05-01`. | Blind `last_review` bumps, row deletion, or policy weakening. |
| Canonical owner evidence | Current validator evidence names `owner_issue=CO-444`, `blocking_changed_paths=[]`, and action-required routes. | Owner evidence must remain machine-readable and current. | Packet says owner re-home or owner action is not complete without fresh validator evidence. | Claiming live owner repair is complete from this packet alone. |

## Not Done If
- Any required packet file or registry mirror is missing.
- The packet omits `CO-454`, source `CO-452`, `docs:freshness:maintain`, the canonical owner marker, March 31 docs freshness candidate cohorts, `block_diff_local`, or `co-429-completed-lane-registry-residue`.
- The packet suggests weakening `docs:freshness` or `docs:freshness:maintain`.
- The packet deletes registry rows, historical task packets, or March 31 candidate evidence.
- The packet claims owner re-home, row refresh, archive, or reclassification is complete without fresh validator evidence.

## Goals
- Create and register the CO-454 docs-first packet.
- Clear the repo-side traceability prerequisites that drive `backlog_head_follow_up_traceability_pending`.
- Preserve CO-452 source lineage and the exact docs freshness route evidence.
- Keep the completed-lane repair and separate rolling-owner boundary explicit.

## Non-Goals
- No source code, test, validation script, package, Linear state, or GitHub lifecycle changes.
- No docs freshness policy weakening.
- No registry row deletion or blind review-date refresh.
- No claim that the separate CO-444 rolling cohort is resolved by this completed-lane repair.
- No owner re-home claim without a fresh machine-readable validator report.

## Stakeholders
- Product: CO operators relying on autopilot promotion holds to reflect actionable queue truth.
- Engineering: CO-454 provider worker and docs freshness maintainers.
- Review: PR reviewers checking that the packet is traceable and scoped.

## Metrics & Guardrails
- Primary Success Metrics:
  - six packet files exist
  - `tasks/index.json` contains the CO-454 item
  - `docs/TASKS.md` contains the CO-454 snapshot
  - `docs/docs-freshness-registry.json` contains six active packet rows
  - protected-term scan finds the required blocker and owner terms
  - completed-lane packet rows for CO-54, CO-45, CO-52, CO-55, and CO-56 are archived with current review evidence
  - `spec-guard`, `docs:freshness`, and `docs:freshness:maintain -- --format json` pass
- Guardrails:
  - docs metadata-only diff
  - no stale-row deletion
  - no docs freshness weakening
  - no owner re-home or green-validator claim without fresh evidence

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: expire the temporary Backlog traceability hold by adding the missing packet and mirrors.
- Rationale: `backlog_head_follow_up_traceability_pending` is an intentional guard that should disappear after the repo carries the required packet and registry mirrors. This packet does not alter the underlying freshness policy or owner route.
- Removal condition: CO-454 repo packet and mirrors land on the branch consumed by autopilot.

## Open Questions
- None for the completed-lane March 31 cohort repair. CO-444 rolling cohort ownership remains separate.

## Approvals
- Product: CO-454 Linear issue and current worker prompt
- Engineering: bounded traceability packet branch
- Design: N/A
