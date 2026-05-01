# PRD - CO-458 source-root freshness drift

## Traceability
- Linear issue: `CO-458` / `f57f28e8-e876-4bff-9217-fc5e17ee030f`
- Linear URL: https://linear.app/asabeko/issue/CO-458
- Task id: `linear-f57f28e8-e876-4bff-9217-fc5e17ee030f`
- Canonical spec: `tasks/specs/linear-f57f28e8-e876-4bff-9217-fc5e17ee030f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f57f28e8-e876-4bff-9217-fc5e17ee030f.md`
- Task checklist: `tasks/tasks-linear-f57f28e8-e876-4bff-9217-fc5e17ee030f.md`
- Agent mirror: `.agent/task/linear-f57f28e8-e876-4bff-9217-fc5e17ee030f.md`
- Source anchor: `ctx:sha256:574bd8d4264b6ff98102b84cdb1968660a10226102286ef392f76c7647b0ac89#chunk:c000001`
- Source manifest: `.runs/linear-f57f28e8-e876-4bff-9217-fc5e17ee030f-docs-packet/cli/2026-05-01T03-00-41-368Z-0d6554a3/manifest.json`
- Source payload: `.runs/linear-f57f28e8-e876-4bff-9217-fc5e17ee030f-docs-packet/cli/2026-05-01T03-00-41-368Z-0d6554a3/memory/source-0/source.txt`
- Source payload note: this child checkout does not contain `.runs/` at its root; the payload was read from the parent workspace path `../../.runs/.../memory/source-0/source.txt` and carries run/issue provenance only. The parent prompt supplies the issue-shaping contract.

## Summary
- Problem Statement: control-host status/proof surfaces can present a worker as current without proving that the command path, package root, and actual control-host source root are aligned with the current local `origin/main` ref. That leaves operators unable to tell whether a stale surface is shared checkout drift, supervised source-root drift, source-vs-dist drift, or global binary/package provenance drift.
- Desired Outcome: parent implementation makes source/root provenance and freshness explicit on control-host status/proof surfaces so operators can see the actual control-host source root, command path, package root, git ref, and freshness relative to `origin/main`, without reopening historical lanes or changing product behavior in this docs packet.

## User Request Translation
- User intent / needs:
  - create the CO-458 docs-first packet and checklist/index mirrors before implementation starts
  - preserve the exact protected terms: actual control-host source root, command path, package root, git ref, freshness relative to `origin/main`
  - distinguish four drift classes: shared checkout drift, supervised source-root drift, source-vs-dist drift, and global binary/package provenance drift
  - treat `CO-113`, `CO-25`, `CO-388`, and `CO-450` as historical related context, not reopened scope
  - keep product implementation, Linear state, workpad, PR lifecycle, and full validation with the parent lane
- Success criteria / acceptance:
  - PRD, ACTION_PLAN, canonical TECH_SPEC, task checklist, `.agent` mirror, `docs/TASKS.md`, and `tasks/index.json` are updated inside the declared file scope
  - parent implementation contract requires source/root provenance on control-host status/proof surfaces
  - parent implementation contract requires freshness comparison against local `origin/main`
  - parent implementation contract separates source-root freshness from shared checkout state, source-vs-dist state, and global binary/package provenance
  - packet explicitly prevents broad source-execution, merge-closeout, stale-checkout-advisory, or package-provenance work from being absorbed into CO-458
- Constraints / non-goals:
  - child lane owns docs only and must not edit implementation, tests, Linear state, workpad, PR surfaces, or freshness registry files outside the declared file scope
  - parent owns source inspection, implementation, validation, docs-review, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff
  - do not run full repo validation from this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `source/root freshness drift`
  - `control-host status/proof surfaces`
  - `actual control-host source root`
  - `command path`
  - `package root`
  - `git ref`
  - `freshness relative to origin/main`
  - `shared checkout drift`
  - `supervised source-root drift`
  - `source-vs-dist drift`
  - `global binary/package provenance drift`
  - `CO-113`
  - `CO-25`
  - `CO-388`
  - `CO-450`
- Protected terms / exact artifact and surface names:
  - `actual control-host source root`
  - `command path`
  - `package root`
  - `git ref`
  - `origin/main`
  - `provider-linear-worker-proof.json`
  - `provider-intake-state.json`
  - `co-status`
  - `control-host`
  - `source-vs-dist`
  - `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
  - `dist/`
- Nearby wrong interpretations to reject:
  - "This is just CO-388 stale checkout posture again."
  - "This is just CO-113 source-checkout execution again."
  - "This is just CO-25 shared-root closeout sync again."
  - "Any global `codex-orchestrator` binary proves the supervised control-host source root."
  - "A clean shared checkout proves that a running control-host was launched from that checkout."
  - "Fresh `dist/` proves the source root is current relative to `origin/main`."
  - "Only the package root matters; command path and git ref can be inferred."
  - "Parent should mutate Linear or Git state from the status/proof read path."

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Control-host status/proof provenance | Status/proof artifacts can show active worker/control-host state without a complete, machine-checkable source-root provenance bundle. | Operators need proof of the launched source root, not assumptions from the current shell. | Status/proof surfaces expose actual control-host source root, command path, package root, git ref, and freshness relative to local `origin/main`. | Full control-host lifecycle redesign or admission policy changes. |
| Shared checkout drift | CO-25 covers safe shared-root reconciliation after merge closeout, and CO-388 covers non-destructive checkout posture advisory. | Shared checkout state is separate from the source root used by a supervised control-host process. | CO-458 reports shared checkout drift only as a separate context field, not as proof of the supervised source root. | Reopening CO-25 merge closeout sync or CO-388 stale checkout advisory. |
| Supervised source-root drift | A long-running control-host may continue from a source root that differs from the checkout the operator is inspecting. | The supervised process should identify its own source root and git ref. | CO-458 requires the actual control-host source root to be recorded and compared to `origin/main` for freshness. | Restarting, killing, or relaunching the control host from this read path. |
| Source-vs-dist drift | CO-113 made source checkouts prefer fresh source execution while packaged installs remain dist-only. | Source-vs-dist freshness is not the same as source-root git freshness. | CO-458 shows whether the command path is source-backed or `dist/`-backed and whether that choice is expected for the package root. | Reworking CO-113 source-authoritative execution or package install policy. |
| Global binary/package provenance drift | A global binary or package install can point at a different package root than the active checkout. | Operators need to know which binary/package launched the control-host surface. | CO-458 records command path and package root provenance so global binary/package drift is visible and distinct. | Global install management, npm publish changes, or package provenance enforcement beyond status/proof surfacing. |

## Not Done If
- `co-status` or control-host proof still omits actual control-host source root, command path, package root, git ref, or freshness relative to `origin/main`.
- A clean shared checkout is treated as proof that the supervised control-host source root is fresh.
- The fix collapses shared checkout drift, supervised source-root drift, source-vs-dist drift, and global binary/package provenance drift into one generic stale warning.
- A global `codex-orchestrator` binary or `CODEX_ORCHESTRATOR_PACKAGE_ROOT` value is accepted without showing the resolved package root and command path.
- `provider-linear-worker-proof.json` or `provider-intake-state.json` remains unable to support operator audit of source/root provenance for the running control-host path.
- Parent implementation changes merge-closeout, source-authoritative execution, checkout posture, package distribution, Linear state, or PR lifecycle beyond the smallest status/proof provenance surface.
- `tasks/index.json` or `docs/TASKS.md` omits the CO-458 docs packet registration.

## Goals
- Create the CO-458 docs-first packet and declared mirrors.
- Define a narrow parent implementation contract for source/root provenance and freshness on control-host status/proof surfaces.
- Require a field-level distinction between shared checkout drift, supervised source-root drift, source-vs-dist drift, and global binary/package provenance drift.
- Preserve related historical lanes as context only: `CO-113`, `CO-25`, `CO-388`, and `CO-450`.

## Non-Goals
- No implementation, test, Linear, workpad, PR, package, or runtime behavior edits in this child lane.
- No rework of CO-113 source-checkout execution.
- No rework of CO-25 shared-root merge closeout.
- No rework of CO-388 stale checkout posture advisory.
- No global binary/package install cleanup or npm release work.
- No automatic fetch, checkout, reset, rebuild, restart, or relaunch behavior from the status/proof read path.

## Stakeholders
- Product: CO operators deciding whether a control-host status/proof surface is current enough to trust.
- Engineering: parent CO-458 provider worker implementing the provenance fields and focused coverage.
- Review: parent lane accepting this docs patch and validating the later implementation.

## Metrics & Guardrails
- Primary Success Metrics:
  - declared packet/checklist/index files exist and preserve protected terms
  - `tasks/index.json` remains valid JSON
  - parent focused tests cover stale/current source root, command path/package root mismatch, source-backed versus `dist/`-backed launch, and global binary/package mismatch cases
  - operator-facing JSON/text surfaces distinguish all four drift classes
- Guardrails:
  - zero implementation/test edits in this child lane
  - zero Linear/GitHub lifecycle calls in this child lane
  - no registry edits outside declared scope
  - parent implementation remains read-only for status/proof inspection unless a separate lifecycle path explicitly owns mutation

## Technical Considerations
- Architectural Notes:
  - likely parent surfaces include `co-status`, `provider-linear-worker-proof.json`, `provider-intake-state.json`, selected-run/control-host status projection, and control-host freshness/proof helpers
  - the provenance bundle should be structured enough for tests and concise enough for text status output
  - freshness relative to `origin/main` should use local refs and fail closed when the ref is unavailable; it should not fetch or mutate by default
  - command path and package root should be resolved at launch/proof time, not inferred from the operator's current shell later
- Dependencies / Integrations:
  - local Git refs, especially `origin/main`
  - `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
  - source checkout versus `dist/` launch detection
  - control-host status/proof persistence and projection
  - historical context from `CO-113`, `CO-25`, `CO-388`, and `CO-450`

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the stale/inferred provenance seam by requiring explicit source/root provenance fields on control-host status/proof surfaces.
- Rationale: inferred source roots are stale/cached operator assumptions. The parent implementation should expose actual command/source/package/git evidence instead of adding another compatibility fallback.

## CO-382 Fallback Metadata
- Large-refactor check: keep this scoped to one governed status/proof provenance surface and one lifecycle phase; a shared helper is acceptable only when it removes duplication across proof, intake, and status projection.
- Minor-seam behavior is acceptable only because CO-458 removes inferred source-root provenance and records one bounded fallback decision.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| control-host status/proof provenance | inferred or cached source root, package root, command path, and freshness from the current shell, global binary, or prior projection | remove fallback | CO-458 | status/proof output can look current while the supervised control-host actually runs from a stale or different source root | 2026-05-01 | 2026-05-01 | 0 days | `co-status`, doctor, `/api/v1/state`, `/ui/data.json`, and proof snapshots expose explicit read-only command/package/source/git provenance and drift classes | focused provenance tests, full core suite, docs checks, standalone review |

## Open Questions
- Which parent-owned proof artifact should become canonical for the source/root provenance bundle: `provider-linear-worker-proof.json`, `provider-intake-state.json`, the status dataset, or a shared helper feeding all three?
- Should text `co-status` show only summarized freshness while `--format json` carries the full provenance bundle?

## Approvals
- Product: CO-458 child-lane prompt, accepted as packet contract
- Engineering: bounded docs-only child lane
- Design: N/A
