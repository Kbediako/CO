# ACTION_PLAN - CO-409 March 28 docs freshness cohort maintenance

## Summary
- Goal: create the CO-409 docs-first packet and task mirror docs for the March 28 `task packet` / `task mirror` docs freshness cohort.
- Scope: six packet/mirror files only.
- Assumptions:
  - parent handoff carries the authoritative CO-409 protected issue terms
  - parent owns reproduction, registry/catalog refresh, task registry/snapshot updates, Linear state, workpad, PR lifecycle, and final validation
  - this child lane leaves changes uncommitted for patch export

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`
  - `docs freshness`
  - `docs-freshness-registry.json`
  - `last_review`
  - `cadence_days`
  - `task packet`
  - `task mirror`
  - `March 28 cohort`
  - `docs:freshness:maintain`
  - `CO-399`
- Not done if:
  - the packet omits or renames any protected term
  - the plan expands CO-399 fallback-expiry repo guard scope
  - the plan hides the failure in CO-399 guard code
  - the plan deletes stale docs, loosens `docs:freshness`, or bypasses validation
  - parent-owned reproduction and registry/catalog refresh are not explicit
- Pre-implementation issue-quality review:
  - 2026-04-28: CO-409 is not plausibly a CO-399 guard-code fix; it is a separate docs freshness maintenance lane for the March 28 cohort.
  - 2026-04-28: the micro-task path is unavailable because correctness depends on exact protected wording, exact docs freshness surfaces, and parent-owned validation.
- Fallback / refactor decision: this child docs packet does not add, retain, or touch fallback/seam behavior; CO-399 fallback-expiry repo guard scope is mentioned only as an explicit non-goal.

## Milestones & Sequencing
1. Create the CO-409 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Verify protected terms and scoped diff hygiene in the child lane.
3. Parent imports the patch and performs live reproduction with `docs:freshness` / `docs:freshness:maintain`.
4. Parent classifies the March 28 `task packet` / `task mirror` cohort.
5. Parent refreshes reviewed `last_review` / `cadence_days` metadata in `docs-freshness-registry.json`, catalog, and affected docs as needed.
6. Parent reruns validation and owns Linear/GitHub lifecycle.

## Dependencies
- Linear issue `CO-409`
- Source anchor `ctx:sha256:cd4c97fc45e4da25d8e08e2702395eb99b47822855dfbcce2725814f34b57479#chunk:c000001`
- `npm run docs:freshness`
- `npm run docs:freshness:maintain`
- `docs/docs-freshness-registry.json`
- `docs/docs-catalog.json`

## Validation
- Child checks:
  - `if rg -n "[[:blank:]]+$" <six scoped files>; then exit 1; else exit 0; fi`
  - `rg -n "docs:freshness|docs freshness|docs-freshness-registry\\.json|last_review|cadence_days|task packet|task mirror|March 28 cohort|docs:freshness:maintain|CO-399" <six scoped files>`
  - `git status --short -- <six scoped files>` and `git ls-files --others --exclude-standard -- <six scoped files>`
- Parent-owned validation commands:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `npm run docs:check`
  - `node scripts/spec-guard.mjs --dry-run`
- Rollback plan:
  - parent can revert only the six CO-409 packet/mirror files if the patch import is not needed or the issue is relaunched with different scope

## Risks & Mitigations
- Risk: CO-409 is misread as permission to widen CO-399 fallback-expiry repo guard scope.
  - Mitigation: packet explicitly rejects CO-399 guard expansion and hiding the failure in guard code.
- Risk: freshness is repaired by deletion or blind date bumps.
  - Mitigation: packet requires parent-owned reproduction, March 28 cohort review, and validation.
- Risk: child patch drifts into parent-owned registry/catalog files.
  - Mitigation: file scope is limited to six packet/mirror files and checked with `git diff --name-only`.
- Risk: validation is skipped because this child lane cannot run full suites.
  - Mitigation: child records scoped checks and parent validation responsibilities.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-28
- Parent docs-review / implementation approval: pending
