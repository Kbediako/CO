# ACTION_PLAN - CO-387 multi-surface Codex posture matrix

## Summary
- Goal: create the docs-first packet for CO-387 so the parent lane can implement matrix-backed Codex posture validation across docs, workflow pins, and pack-smoke expectations.
- Scope: child lane creates PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, `.agent` mirror, and `tasks/index.json` registration only.
- Assumptions:
  - the parent-provided issue text is authoritative for this child lane
  - this child checkout has no `.runs/` source payload available
  - parent owns docs-review, implementation, Linear state, workpad, PR lifecycle, and full validation

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-387`
  - `machine-readable Codex posture matrix`
  - `README`
  - docs/book index
  - `public posture`
  - `downstream setup docs`
  - `version policy`
  - `workflow pins`
  - `pack-smoke expectations`
  - `0.124 book case`
  - `preserve historical evidence through archive/demotion instead of deletion`
- Not done if:
  - active current-facing docs can disagree about Codex CLI/model/runtime/workflow posture while docs checks pass
  - book/current navigation can present superseded evidence as current guidance
  - stale active `0.124` release evidence residue is not covered by a failing test
  - implementation deletes historical evidence instead of demoting or archiving it
  - runtime targets or workflow pins move without a separate evidence-backed decision
- Pre-implementation issue-quality review:
  - 2026-04-26: issue is not a narrow cleanup; it asks for durable matrix-backed enforcement across multiple current-facing and workflow surfaces.
  - 2026-04-26: micro-task path is not appropriate because correctness depends on exact surface names, protected non-goals, and historical/current status semantics.

## Milestones & Sequencing
1. Child lane creates the CO-387 docs-first packet and task index registration.
2. Parent runs docs-review against the packet before implementation.
3. Parent chooses the smallest canonical structured source: preferred `docs/codex-posture-matrix.json`, or an equivalent `docs/docs-catalog.json` policy extension if that is less disruptive.
4. Parent implements matrix loading and validation in docs-catalog/docs-hygiene helpers.
5. Parent validates README, docs/book or current navigation, public posture, downstream setup docs, version policy, workflow pins, and pack-smoke expectations against the matrix.
6. Parent adds historical/archive status enforcement so superseded release evidence stays preserved but cannot remain current-facing without explicit status.
7. Parent adds focused tests for stale active release evidence residue, including a `0.124` book-style fixture.
8. Parent runs scoped tests, then the parent-owned docs validation floor and review gate.

## Dependencies
- `docs/docs-catalog.json`
- `scripts/lib/docs-catalog.js`
- `scripts/docs-hygiene.ts`
- `README.md`
- `docs/README.md`
- any concrete docs/book index or generated navigation source in the parent lane
- `docs/public/downstream-setup.md`
- `docs/guides/codex-version-policy.md`
- `.github/workflows/core-lane.yml`
- `.github/workflows/release.yml`
- `.github/workflows/pack-smoke-backstop.yml`
- `.github/workflows/cloud-canary.yml`
- `scripts/pack-smoke.mjs`
- `tests/docs-hygiene.spec.ts`
- `tests/pack-smoke.spec.ts`

## Validation
- Child-lane checks:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index ok')"`
  - scoped `git diff --name-only` review for declared-file scope
- Parent-owned checks:
  - focused docs-hygiene tests for matrix parsing and stale active `0.124` residue
  - focused pack-smoke/workflow-pin tests
  - `npm run docs:check`
  - `npm run docs:freshness`
  - normal parent validation/review floor as needed
- Rollback plan:
  - revert the matrix source, docs-hygiene integration, tests, and any docs/status metadata changes together, leaving historical evidence files intact

## Risks & Mitigations
- Risk: the matrix duplicates prose policy and drifts.
  - Mitigation: make the structured matrix authoritative and validate prose surfaces against it.
- Risk: historical evidence is removed to clear active-doc failures.
  - Mitigation: require archive/demotion/status metadata as the accepted fix path.
- Risk: workflow pins are treated as stale just because they do not match the active CLI target.
  - Mitigation: represent compatibility pins and canary pins as distinct matrix row types with reasons and expected capabilities.
- Risk: the parent implementation misses the docs/book surface because this child checkout has no book index.
  - Mitigation: spec requires parent discovery of the concrete book/current-navigation source when present and treats `docs/README.md` as the current local navigation fallback.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-26
- Parent docs-review / implementation approval: pending
