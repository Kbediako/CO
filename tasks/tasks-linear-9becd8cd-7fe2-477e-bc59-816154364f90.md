# Task Checklist - linear-9becd8cd-7fe2-477e-bc59-816154364f90

- Linear Issue: `CO-423` / `9becd8cd-7fe2-477e-bc59-816154364f90`
- Primary PRD: `docs/PRD-linear-9becd8cd-7fe2-477e-bc59-816154364f90.md`
- TECH_SPEC: `tasks/specs/linear-9becd8cd-7fe2-477e-bc59-816154364f90.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9becd8cd-7fe2-477e-bc59-816154364f90.md`
- Canonical owner key: `docs:freshness:maintain`

## Docs-First
- [x] CO-423 packet drafted with protected terms and non-goals. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and task checklist paths above.
- [x] Current owner evidence preserved: `docs:freshness:maintain`, `block_unowned_repo_debt`, `configured_owner_terminal`, `owner_issue=CO-409`, `CO-409 Done`, `blocking_changed_paths=[]`, `docs:freshness`, and `canonical owner key`.
- [x] Historical-only CO-420 context preserved without promoting it to current truth: `owner_issue=CO-420`, `CO-420`, and `co-420-apr-28-march-28-task-packet-mirror`.
- [x] Pre-implementation issue-quality review captured. Evidence: canonical task spec `review_notes`.

## Investigation
- [x] Static child-lane context inspected. Evidence: `docs/docs-catalog.json` currently names `CO-409`; `docs/guides/docs-freshness-cohorts.md` frames `CO-420` as historical lineage.
- [x] Parent live `docs:freshness:maintain` reproduction. Evidence: `out/linear-9becd8cd-7fe2-477e-bc59-816154364f90/before/docs-freshness-maintenance.json` reported `block_unowned_repo_debt`, `configured_owner_terminal`, `owner_issue=CO-409`, and `blocking_changed_paths=[]`.
- [x] Parent live issue-state confirmation for CO-423, terminal `CO-420`, and terminal `CO-409 Done`. Evidence: parent `linear issue-context` reads.

## Implementation
- [x] Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, task checklist, and `.agent` mirror. Evidence: current child diff.
- [x] Parent owner metadata repair in `docs/docs-catalog.json`. Evidence: rolling owner metadata points to live `CO-423` and keeps `docs:freshness:maintain`.
- [x] Parent registration or mirror updates in `docs/docs-freshness-registry.json`, `tasks/index.json`, and `docs/TASKS.md`. Evidence: CO-423 registry rows, task index entry, and task snapshot are present.

## Validation
- [x] Child protected-term scan. Evidence: child command output.
- [x] Child trailing-whitespace scan. Evidence: child command output.
- [x] Child file-scope check. Evidence: child `git diff --name-only`.
- [x] Parent `npm run docs:freshness`. Evidence: `docs:freshness OK - 4935 docs, 4938 registry entries`; rolling cohort `CO-423` has `33` docs.
- [x] Parent `npm run docs:freshness:maintain`. Evidence: `freshness_decision=pass_with_owned_rolling_debt`, `owner_issue=CO-423`, live owner verification succeeded, and `blocking_changed_paths=[]`.
- [x] Parent repo validation gates before review. Evidence: delegation guard OK, spec guard OK, build OK, lint OK with three existing warnings, focused metadata check OK, `docs:check` OK, `repo:stewardship` OK, diff budget OK, and `npm run test` retry passed `357` files / `5026` tests after the exact initial timing failure passed in isolation.
- [x] Parent standalone review and elegance pass. Evidence: review telemetry `.runs/linear-9becd8cd-7fe2-477e-bc59-816154364f90/cli/2026-04-29T13-11-39-282Z-352d6793/review/telemetry.json` reported `status=succeeded`, `review_outcome=clean-success`; elegance pass recorded `out/linear-9becd8cd-7fe2-477e-bc59-816154364f90/manual/elegance-review.md`.

## Handoff
- [x] Parent imports child patch artifact. Evidence: accepted `.runs/linear-9becd8cd-7fe2-477e-bc59-816154364f90-docs-packet/cli/2026-04-29T13-26-35-576Z-37f0d4ba/manifest.json`.
- [x] Parent opens or updates PR, attaches it to CO-423, and waits for required checks. Evidence: PR #721 attached to CO-423; Cloud Canary, Core Lane, and CodeRabbit passed at head `2caecb404`.
- [x] Parent runs ready-review drain and resolves or pushes back on actionable feedback. Evidence: CodeRabbit threads resolved after commits `6282382a4` and `2caecb404`; `pr ready-review --pr 721 --quiet-minutes 10` completed with `unresolved_threads=0` and `unack_bot_feedback=0`.
- [x] Parent moves CO-423 to `In Review` only after validation, PR attachment, checks, and ready-review drain are clean. Evidence: pending Linear transition.

## Notes
- This child lane must not edit `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, source code, package files, or validation scripts.
- This child lane must not call Linear mutation helpers or launch PR/Linear transitions.
- `blocking_changed_paths=[]` is not a waiver; it is part of the fail-closed owner evidence the parent must preserve.

## CO-575 terminal lifecycle reconciliation

- 2026-05-22: Historical open checklist residue was reconciled under CO-575 after tasks/index and live Linear terminal evidence showed this task is already complete. This allows implementation-docs archival to preserve the full packet on doc-archives without keeping active docs-freshness debt open on main.
