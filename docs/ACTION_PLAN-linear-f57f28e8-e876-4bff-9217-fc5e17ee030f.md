# ACTION_PLAN - CO-458 source-root freshness drift

## Scope
Create the CO-458 docs-first packet and guide the parent implementation so control-host status/proof surfaces expose the actual control-host source root, command path, package root, git ref, and freshness relative to `origin/main`. This child lane owns docs only.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `actual control-host source root`
  - `command path`
  - `package root`
  - `git ref`
  - `origin/main`
  - `freshness relative to origin/main`
  - `shared checkout drift`
  - `supervised source-root drift`
  - `source-vs-dist drift`
  - `global binary/package provenance drift`
  - `provider-linear-worker-proof.json`
  - `provider-intake-state.json`
  - `co-status`
  - `control-host`
- Not done if:
  - status/proof output still relies on inferred source root or package provenance
  - shared checkout drift is treated as equivalent to supervised source-root drift
  - source-vs-dist freshness is treated as equivalent to source-root git freshness
  - global binary/package provenance drift is hidden behind the current shell's checkout
  - related lanes `CO-113`, `CO-25`, `CO-388`, or `CO-450` are reopened instead of referenced as historical context
- Pre-implementation issue-quality review:
  - 2026-05-01: docs child lane translated the parent prompt into a narrow source/root provenance contract. The issue is not plausibly satisfied by existing CO-113, CO-25, or CO-388 behavior because those lanes cover source-vs-dist execution, shared-root closeout, and stale checkout posture respectively; CO-458 requires the supervised control-host source root and launch provenance in status/proof surfaces.
- Fallback / refactor decision:
  - This task touches stale/cached/inferred provenance behavior. Decision: remove the inferred provenance seam by recording explicit source/root evidence on parent-owned status/proof surfaces.
- Durable retention evidence:
  - Not applicable; no fallback is retained by this docs packet.
- Large-refactor check:
  - A broad provider/control-host refactor is not required for docs packet readiness. Parent should prefer a small shared provenance helper only if multiple status/proof surfaces need the same structured fields.

## Plan
1. Register the CO-458 packet in the declared files: PRD, ACTION_PLAN, canonical TECH_SPEC, task checklist, `.agent` mirror, `tasks/index.json`, and `docs/TASKS.md`.
2. Parent inspects launch/proof/status paths that populate `co-status`, `provider-linear-worker-proof.json`, `provider-intake-state.json`, selected-run projection, and control-host freshness/status output.
3. Parent defines a source/root provenance bundle with actual control-host source root, command path, package root, git ref, `origin/main` comparison, source-vs-dist mode, and global binary/package provenance.
4. Parent persists or projects the provenance bundle from the running/supervised control-host source instead of inferring it from the operator's current checkout.
5. Parent renders distinct drift classifications for shared checkout drift, supervised source-root drift, source-vs-dist drift, and global binary/package provenance drift.
6. Parent adds focused regressions for fresh/stale source root, no `origin/main`, command path/package root mismatch, source-backed versus `dist/`-backed launch, and global binary/package mismatch.
7. Parent runs the required implementation gates, standalone review, elegance pass, PR checks, review feedback cleanup, and ready-review drain.

## Dependencies
- Local Git refs, especially `origin/main`
- `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
- Launch command path resolution
- Source checkout versus `dist/` launch detection
- Control-host status/proof persistence and projection
- Historical related context: `CO-113`, `CO-25`, `CO-388`, and `CO-450`

## Validation
- Child lane:
  - JSON parse for `tasks/index.json`
  - protected-term scan over the declared CO-458 packet/mirror files
  - `git diff --check` over the declared touched paths
- Parent lane:
  - focused status/proof tests for all four drift classes
  - no-fetch/no-mutation behavior when comparing to local `origin/main`
  - implementation gate
  - standalone review and elegance/minimality review
  - PR checks, actionable feedback cleanup, ready-review drain, and Linear handoff

## Risks & Mitigations
- Risk: parent conflates CO-458 with CO-388 stale checkout posture.
  - Mitigation: acceptance requires the actual supervised control-host source root, not just current checkout ahead/behind counts.
- Risk: parent conflates CO-458 with CO-113 source-vs-dist execution.
  - Mitigation: acceptance requires source-vs-dist mode as one field in a broader source/root provenance bundle.
- Risk: parent infers command/package provenance from the current shell.
  - Mitigation: acceptance requires command path and package root captured from the control-host launch/proof path.
- Risk: status/proof inspection starts mutating Git or Linear state.
  - Mitigation: status/proof comparison to `origin/main` must use local refs and remain read-only.

## Approvals
- Reviewer: CO-458 provider worker
- Date: 2026-05-01
