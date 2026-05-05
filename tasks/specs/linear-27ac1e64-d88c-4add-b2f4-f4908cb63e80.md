---
id: 20260403-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80
title: CO: Automate docs truthfulness and relevance across README, shipped skills, and agent-facing docs
status: done
relates_to: docs/PRD-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md
related_prd: docs/PRD-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md
related_action_plan: docs/ACTION_PLAN-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md
risk: high
owners:
  - Codex
last_review: 2026-05-04
review_notes:
  - 2026-05-04: CO-444 parent-supplied live Linear evidence confirmed CO-75/27ac1e64 is `Done`/completed with PR #354; this completed-lane spec is reclassified to inactive terminal `done` under canonical owner key `spec-guard:active-specs:last_review=2026-04-03` so historical implementation evidence remains preserved without staying in active-spec freshness.
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: add a checked-in docs catalog plus deterministic truthfulness checks so front-door docs, agent-facing docs, shipped skills, and seeded templates fail fast when they drift from the live CO posture or shipped bundle.
- Scope:
  - docs-first packet for `CO-75`
  - a new docs catalog/config with explicit classes and pattern coverage
  - blocking truthfulness checks inside `docs:check`
  - class-separated reporting inside `docs:freshness`
  - weekly automation artifact emission
  - bounded alignment updates to README, shipped delegation docs, and any touched agent-facing docs/templates required for the gate to pass
- Constraints:
  - preserve existing docs hygiene and freshness failure conditions
  - keep the implementation deterministic and testable, not advisory-only
  - keep README changes bounded to front-door truthfulness and budget

## Issue-Shaping Contract
- User-request translation carried forward:
  - front-door, shipped-skill, and agent-facing docs need a real source-of-truth contract and a blocking gate, not just stale-date bookkeeping
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
  - only adding more freshness metadata
  - making the weekly report larger without class separation
  - treating the README as the only relevant surface
  - dropping task packets and mirrors entirely from reporting instead of demoting their dominance
- Explicit non-goals carried forward:
  - rewriting historical task packets
  - silent auto-fix behavior
  - weakening current docs gates
  - a full README redesign

## Parity / Alignment Matrix
- Current truth:
  - `docs:check` has no deterministic posture/roster/budget checks
  - `docs:freshness` is flat and task-packet-heavy
  - README and shipped delegation docs can drift from the current `0.117.0` / `gpt-5.4` / `appserver` posture
- Reference truth:
  - current posture: `docs/guides/codex-version-policy.md`, `AGENTS.md`, `docs/AGENTS.md`
  - shipped skill roster: `skills/*/SKILL.md` directories
  - seeded downstream contract: `templates/codex/**`
- Target truth / intended delta:
  - catalog classifies active and inventory surfaces by class/audience/owner/cadence/update triggers/source of truth
  - blocking gate covers tier-1 docs and shipped skill/template surfaces
  - `docs:freshness` report separates front-door/shipped surfaces from packets, mirrors, and archives
  - README stays under an explicit front-door size/section budget
- Explicitly out-of-scope differences:
  - semantic rewriting of every active guide
  - auto-generated issue creation instead of an artifact-first weekly report

## Readiness Gate
- Not done if:
  - the blocking gate cannot detect stale posture or bundled-skill roster drift on the touched front-door or shipped docs
  - task packets and mirrors still dominate the weekly report surface
  - README has no enforceable front-door budget after the change
- Pre-implementation issue-quality review evidence:
  - reviewed the Linear issue against the current tree before implementation. The lane is broader than a freshness-registry tweak and must cover catalog classification, a blocking gate in `docs:check`, class-separated `docs:freshness` reporting, a weekly artifact workflow, and bounded doc alignment for stale front-door/shipped surfaces.
- Safeguard ownership split:
  - this parent lane owns the docs packet, automation changes, doc alignment, validation, and review handoff
  - child-stream docs-review is bounded to pre-implementation approval evidence for this same task id

## Technical Requirements
- Functional requirements:
  - add a checked-in catalog that classifies documentation surfaces by audience, doc class, source of truth, owner, freshness cadence, and update triggers
  - classify active front-door docs, agent-facing docs, shipped skills, seeded templates, task packets, mirrors, and archives without requiring manual enumeration of every historical packet
  - make `npm run docs:check` fail when a tier-1 or shipped surface references an older active Codex posture than `docs/guides/codex-version-policy.md`
  - make `npm run docs:check` fail when the documented bundled-skill roster diverges from the shipped `skills/` tree
  - make `npm run docs:check` fail when README exceeds a configured front-door verbosity or structure budget
  - make `npm run docs:freshness` emit class-separated totals and failure details so front-door/shipped drift remains visible
  - add weekly automation that emits the class-separated report as an artifact
- Non-functional requirements (performance, reliability, security):
  - keep the checks deterministic and local
  - avoid shelling out to network services for docs truthfulness
  - keep config readable and easy to update when policy or shipped skills change
- Interfaces / contracts:
  - blocking gate entrypoint: `scripts/docs-hygiene.ts`
  - report entrypoint: `scripts/docs-freshness.mjs`
  - shared helpers/config: `scripts/lib/docs-helpers.js`, new docs catalog helper(s), `docs/docs-catalog.json`
  - downstream front-door docs: `README.md`, `docs/README.md`
  - agent-facing docs: `AGENTS.md`, `docs/AGENTS.md`, `docs/guides/**/*.md`
  - shipped docs/templates: `skills/**`, `templates/codex/**`

## Architecture & Data
- Architecture / design adjustments:
  - add a catalog file with explicit surface entries for front-door, agent-facing, shipped-skill, shipped-support, and seeded-template docs, plus glob-style class rules for task packets, mirrors, and archives
  - add reusable helper(s) that resolve catalog coverage, classify doc files, and expose truthfulness policies to both gates
  - extend `docs:check` with deterministic truthfulness rules rather than creating a second blocking command
  - extend `docs:freshness` to enrich the JSON report and CLI summary with class-separated totals/failures
- Data model changes / migrations:
  - new `docs/docs-catalog.json`
  - new `out/<task-id>/docs-freshness.json` fields for class summaries and catalog coverage
  - no migration required for historical docs beyond pattern coverage
- External dependencies / integrations:
  - GitHub Actions weekly workflow for artifact upload
  - package scripts for `docs:check` and `docs:freshness`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` once the docs packet exists
  - focused unit coverage for docs truthfulness checks and class-separated reporting
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review` with `FORCE_CODEX_REVIEW=1`
  - `npm run pack:smoke` because this lane touches packaged docs/skills/templates
- Rollout verification:
  - mutate a fixture or touched doc locally to prove the new gate fails on stale posture, roster drift, and README budget drift via focused tests
  - confirm the live tree now passes with aligned README/shipped docs
  - confirm weekly workflow uploads the class-separated report artifact
- Monitoring / alerts:
  - rely on core-lane `docs:check`
  - rely on the scheduled workflow artifact for recurring drift visibility

## Open Questions
- Whether README roster parity should stay canonical in README or move to the new catalog while README renders the user-facing subset. This lane should pick one canonical documented roster and make the gate enforce it.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-03


## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Completed-lane historical packet/spec freshness hold | `expire fallback` | CO-444 | Terminal Linear source issues left task-packet/spec metadata active past cadence | 2026-05-05 | 2026-05-05 | 2026-05-12 | Archive packet mirrors and reclassify specs under a live owner; otherwise block handoff | `docs:freshness:maintain -- --format json` |

- Large refactor decision: bounded metadata cleanup under the existing `docs:freshness:maintain` owner; no runtime or policy authority split is added.
- Minor seam decision: bounded temporary freshness-hold cleanup is acceptable; unresolved rows must be archived, reclassified, or blocked by 2026-05-12.
