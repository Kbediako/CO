# PRD - CO-446 target-keyed last_audit_operation projection

## Traceability
- Linear issue: `CO-446` / `552f2825-b9e0-4f14-afe0-21b072aa9bb5`
- Linear URL: https://linear.app/asabeko/issue/CO-446
- Task id: `linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5`
- Canonical spec: `tasks/specs/linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5.md`
- Canonical registry id: `20260430-linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5`
- Source anchor: `ctx:sha256:2a4e2273e36ecf9d026dd8224bb505b531aca97dbb560f4191c678cbed955cb5#chunk:c000001`
- Source manifest: `.runs/linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5-co-446-docs/cli/2026-04-30T15-05-22-251Z-426bef02/manifest.json`
- Source payload note: the referenced `.runs/.../memory/source-0/source.txt` path was not present in this child-lane checkout, so this packet is anchored on the bounded child-lane prompt.

## Summary
- Problem Statement: `co-status` can project a `last_audit_operation` from `provider-linear-worker-linear-audit.jsonl` for the wrong Linear target. The concrete issue checksum is that an audit operation targeting `CO-444` must not appear as `CO-445` current audit state.
- Desired Outcome: key `last_audit_operation` selection by target issue identity so `co-status` only shows audit state whose `issue_identifier` and issue id match the selected issue/run, while preserving `issue-context`, `Blocked`, and audit visibility for the right target.

## User Request Translation
- User intent / needs:
  - create the CO-446 docs-first packet and task mirrors
  - preserve the exact target-keyed invariant: `co-status` must not project an audit operation targeting `CO-444` as `CO-445` current audit state
  - keep `last_audit_operation`, `issue_identifier`, issue id, `provider-linear-worker-linear-audit.jsonl`, and `issue-context` as protected surfaces
  - leave Linear state, workpad, PR lifecycle, and implementation edits to the parent lane
- Success criteria / acceptance:
  - packet docs and mirrors exist for `linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5`
  - `tasks/index.json` registers the canonical TECH_SPEC and task mirrors
  - `docs/TASKS.md` records the CO-446 snapshot
  - `docs/docs-freshness-registry.json` covers the six new docs with `last_review=2026-04-30`
  - the implementation plan requires target-keyed audit selection, mismatched-target rejection, and focused regressions for `CO-444` versus `CO-445`
- Constraints / non-goals:
  - do not delete, truncate, or rewrite `provider-linear-worker-linear-audit.jsonl`
  - do not hide unrelated audit rows globally; filter only the projected `last_audit_operation`
  - do not weaken `co-status`, `issue-context`, or `Blocked` state visibility
  - do not treat run recency, file recency, or operation timestamp alone as target ownership
  - do not change Linear state, workpad, PR lifecycle, provider admission, docs freshness policy, or owner routing in this child lane

## Intent Checksum
- Exact phrases to preserve:
  - `co-status`
  - `last_audit_operation`
  - `issue_identifier`
  - issue id
  - `provider-linear-worker-linear-audit.jsonl`
  - `issue-context`
  - `CO-444`
  - `CO-445`
  - `Blocked`
- Nearby wrong interpretations to reject:
  - a display-only rename that still lets `CO-444` audit state appear under `CO-445`
  - choosing the newest audit row across the whole run without checking target identity
  - suppressing all audit projection when only the mismatched target should be rejected
  - treating missing `issue_identifier` or issue id as a match for any selected issue
  - rewriting historical audit files instead of fixing the read-model projection

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `co-status` projection | `last_audit_operation` can be selected from the newest audit operation even when it targets another issue. | Selected status rows must describe the selected Linear issue/run. | `last_audit_operation` is keyed by target issue identity and cannot cross from `CO-444` to `CO-445`. | Broad dashboard redesign or unrelated status fields. |
| Audit source | `provider-linear-worker-linear-audit.jsonl` remains cumulative and can contain operations for more than one target. | Cumulative audit history stays intact; projections decide what is current for a target. | Keep the audit log intact and filter projection by `issue_identifier` and issue id. | Deleting, truncating, or rewriting audit history. |
| Target identity | `issue_identifier` and issue id may be available on audit/proof/manifest/current issue surfaces. | Identity matching should fail closed when target ownership is ambiguous. | Mismatched or missing target identity cannot become current `last_audit_operation` for another issue. | New Linear mutation helpers or issue ownership repair. |
| Operator state | `issue-context` and `Blocked` remain live operator evidence. | Status projection must preserve real state while avoiding cross-target audit bleed. | `CO-445` can remain visibly `Blocked` without inheriting `CO-444` audit operations. | Hiding `Blocked` state, suppressing `issue-context`, or changing workflow transitions. |

## Not Done If
- `co-status` for `CO-445` can still show a `last_audit_operation` whose target is `CO-444`.
- `last_audit_operation` is still selected from the newest operation in `provider-linear-worker-linear-audit.jsonl` without target-key validation.
- A row with mismatched or missing `issue_identifier` / issue id is treated as current audit state for another issue.
- The fix deletes audit history, rewrites `provider-linear-worker-linear-audit.jsonl`, or hides all audit visibility to avoid the mismatch.
- `issue-context` or `Blocked` truth is weakened, hidden, or reclassified.
- `tasks/index.json`, `docs/TASKS.md`, or `docs/docs-freshness-registry.json` omit the CO-446 packet registration.

## Goals
- Create and register the CO-446 docs-first packet.
- Require target-keyed `last_audit_operation` projection for `co-status`.
- Preserve cumulative audit history and operator-visible issue state.
- Add focused parent-lane implementation and validation requirements for the `CO-444` / `CO-445` mismatch.

## Non-Goals
- No Linear state, workpad, PR lifecycle, provider admission, or docs freshness policy changes.
- No audit-file deletion, truncation, rewrite, or global hiding.
- No broad `co-status` redesign beyond target-keying the audit projection.
- No source or test edits in this docs-only child lane.

## Stakeholders
- Product: CO operators relying on `co-status` to distinguish issue-specific current state.
- Engineering: parent CO-446 provider worker implementing the projection fix.
- Review: parent lane accepting the docs patch artifact and validating behavior.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six packet/mirror files exist
  - registry and task mirrors link the canonical spec
  - protected-term scan finds every required term
  - parent focused regressions prove `CO-444` audit operations are not projected as `CO-445`
  - matching-target audit operations still appear as `last_audit_operation`
- Guardrails:
  - zero implementation/test changes by this child lane
  - zero Linear/GitHub lifecycle calls by this child lane
  - zero audit-history mutation

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the stale cross-target projection seam by requiring explicit target-key matching before `last_audit_operation` is shown.
- Rationale: cumulative audit history is valid, but treating unrelated latest audit rows as current issue state is stale/cached projection behavior and should fail closed.

## Open Questions
- None for the docs packet. Parent owns source inspection and final implementation surface selection.

## Approvals
- Product: CO-446 child-lane prompt, accepted as packet contract
- Engineering: bounded docs-only child lane
- Design: N/A
