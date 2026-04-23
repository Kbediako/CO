# PRD - CO: scope provider-linear parallelization proof invariants to the current turn

## Traceability
- Linear issue: `CO-326` / `4ea68a3d-3832-4161-bab7-84dceeceeb46`
- Linear URL: https://linear.app/asabeko/issue/CO-326
- Task id: `linear-4ea68a3d-3832-4161-bab7-84dceeceeb46`
- Canonical spec: `tasks/specs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- Docs packet child lane: `.runs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46-docs-packet/cli/2026-04-23T03-59-42-098Z-c11737dd/manifest.json`
- Source anchor: `ctx:sha256:b6dfe577e25cc512757f1fba35bab57fb685d968fa340ea712648248f38b1fd5#chunk:c000001`

## Summary
`CO-326` fixes a false-failure classification in `provider-linear-worker-proof`. A provider-linear worker can complete a lane truthfully, move the issue through review handoff, and later close out successfully, while the run still ends with `owner_status=failed` / `end_reason=parallelization_decision_multiple` because valid same-issue parallelization decisions from earlier turns are counted again.

The observed `CO-319` shape is successful operationally: the worker moved `CO-319` from `In Progress` to `In Review`, review telemetry succeeded, Linear later moved the issue through `Merging` to `Done`, and PR `#610` merged. The failure is the proof invariant scope, not the lane outcome.

This child lane owns only this docs-first packet. The parent lane owns implementation, tests, registry mirrors, review, PR lifecycle, Linear transitions, and workpad updates.

## User Request Translation
- Preserve the exact bug: valid parallelization decisions recorded across multiple turns in one successful provider-linear run are being treated as a same-turn duplicate.
- Scope the proof invariant to the `current-turn same-issue parallelization decision`.
- Keep the fail-closed rule that each active turn records exactly one valid decision.
- Keep true same-turn duplicate or missing decisions as failures with explicit evidence.
- Keep historical audit rows in `provider-linear-worker-linear-audit.jsonl`; do not delete or hide earlier-turn evidence.
- Align `provider-linear-worker-proof`, `manifest.status`, `runs.json`, and operator diagnostics with the real lane outcome.

## Intent Checksum
- Protected terms and surfaces:
  - `provider-linear-worker-proof`
  - `parallelization_decision_multiple`
  - `owner_status=failed`
  - `manifest.status`
  - `runs.json`
  - `provider-linear-worker-linear-audit.jsonl`
  - `current-turn same-issue parallelization decision`
- Nearby wrong interpretations to reject:
  - weakening the parallelization contract
  - ignoring true same-turn duplicate decisions
  - hiding real worker failures behind success-shaped summaries
  - deleting historical audit rows to avoid the duplicate count
  - changing successful lane closeout semantics unrelated to the invariant scope

## Parity / Alignment Matrix

| Surface | Current / Reported Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| `provider-linear-worker-linear-audit.jsonl` | Contains valid `linear parallelization` rows across multiple turns in one run. | Audit history is cumulative and should preserve all turn decisions. | Historical rows remain preserved, but failure checks select only current-turn rows. |
| `provider-linear-worker-proof` | Can end with `owner_status=failed` and `parallelization_decision_multiple` after a successful multi-turn lane. | Proof status should represent the current turn and final lane truth. | Successful closeout is not failed solely because earlier turns also recorded valid decisions. |
| `manifest.status` | Can report failed even when handoff/closeout succeeded. | Manifest status should align with terminal worker outcome. | `manifest.status` stays successful unless a real current-turn invariant or worker failure occurs. |
| `runs.json` | Can inherit the false failed status. | Run summaries should not contradict the actual terminal lane outcome. | `runs.json` aligns with proof and manifest status after current-turn scoping. |
| Same-turn duplicates | Multiple decisions in one turn must fail closed. | The invariant is exactly one decision per active turn. | True same-turn duplicates still produce `parallelization_decision_multiple` with evidence. |
| Missing current-turn decision | No decision in the active turn must fail closed. | Each active turn requires an explicit decision. | Missing current-turn decisions still fail with the existing missing-decision reason. |

## Acceptance Criteria
1. Provider-linear worker proofing scopes the parallelization-decision invariant to the current turn rather than aggregating valid decisions across the full run.
2. A lane that truthfully completes handoff/closeout no longer lands with `owner_status=failed` or failed `manifest.status` solely because earlier turns also recorded valid decisions.
3. Summary surfaces, including `provider-linear-worker-proof`, `manifest.status`, `out/.../runs.json`, and operator diagnostics, stay aligned with the real lane outcome.
4. True same-turn duplicate parallelization decisions still fail closed with `parallelization_decision_multiple`.
5. Missing current-turn parallelization decisions still fail closed with explicit evidence.
6. `provider-linear-worker-linear-audit.jsonl` remains cumulative historical audit evidence and is not truncated or rewritten to make the proof pass.

## Non-Goals
- No Linear mutation or workpad mutation from this docs child lane.
- No implementation, source, test, registry, or PR lifecycle changes from this child lane.
- Do not weaken the requirement that each active turn records a valid same-issue parallelization decision.
- Do not mask genuine worker failures, stale control-host errors, or failed child-lane outcomes.
- Do not change successful lane closeout semantics outside the proof invariant scope.
- Do not remove, rewrite, or compact historical audit evidence.

## Not Done If
- A lane can still move to `In Review`, `Merging`, or `Done` while its manifest and proof end failed because valid decisions from earlier turns are counted again.
- `runs.json`, `manifest.status`, or operator surfaces can still report failure for a lane that actually completed successfully.
- Fixing the bug also suppresses true same-turn duplicate parallelization decisions.
- The implementation deletes earlier `provider-linear-worker-linear-audit.jsonl` entries instead of scoping the read.
- Missing current-turn decisions no longer fail closed.

## Guardrails
- Parent lane owns all source inspection, implementation, validation, registry mirrors, Linear state, workpad updates, review, and PR lifecycle.
- Keep the invariant strict and current-turn bounded.
- Prefer a deterministic turn-boundary selection mechanism over string filtering that can drift under timestamp format differences.
- Preserve auditability: the proof should make clear which current-turn decision was evaluated and why earlier-turn rows were excluded.

## User Experience
- Operators can trust a provider-linear worker closeout summary after a multi-turn run.
- Reviewers can distinguish true same-turn duplicate decisions from normal per-turn decisions across one long run.
- Retry and closeout logic no longer escalates a successful lane as failed solely because cumulative audit history contains more than one valid decision.
