# PRD - CO-514 Serialize Provider-Worker Goal Evidence Manifest Patches

## Summary
- Problem Statement: CO-492 added advisory provider-worker `goal_evidence` manifest capture, but the remaining patch path can still write a whole stale manifest snapshot while command-runner or control-host persistence writes unrelated fields.
- Desired Outcome: provider-worker advisory `goal_evidence` updates use manifest-level serialization, compare/retry, or an equivalent field-level merge contract so unrelated manifest fields survive concurrent writes.

## User Request Translation
- User intent / needs: close the PR #793 review gap by making provider-worker manifest patching safe against concurrent manifest writers without changing Linear, workpad, PR, review, or check authority.
- Success criteria / acceptance: `goal_evidence` patching cannot overwrite concurrent unrelated fields, known command-runner/control-host/provider-worker manifest writers participate in the same contract or are proven non-overlapping, focused concurrency tests pass, and advisory-only authority denial markers remain unchanged.
- Constraints / non-goals: no broad manifest schema redesign, no lifecycle authorization from goal state, no hook/resume/long-poll control integration, and no replacement of existing proof locks unless compatibility is proven.

## Intent Checksum
- Protected terms: provider-worker manifest patch, `goal_evidence`, manifest-level serialization, field-level merge, compare/retry, command-runner manifest persistence, control-host manifest persistence, `advisory_only`.
- Nearby wrong interpretations to reject:
  - weakening `goal_evidence` validation
  - treating `goal_evidence` as lifecycle authority
  - fixing only one call site while known concurrent manifest writers stay unlocked
  - broad manifest schema redesign

## Traceability
- Source issue: `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73`
- Follow-up issue: `CO-514` / `2be8cd2c-f0c8-4e90-8588-fb70dc387faf`
- Source review thread: PR #793, thread `PRRT_kwDOQE1BPc6AbZTH`
- Source anchor: `ctx:sha256:6da76c74b6e004673e9366d5b3ed5e1369700ba60a983fb9104ae6fc99fa0d3a#chunk:c000001`

## Goals
- Add a small shared manifest patch/write primitive or equivalent merge contract.
- Use the shared contract for provider-worker `goal_evidence` patching.
- Route command-runner and provider-worker control-host manifest writes that can race with `goal_evidence` through the same contract.
- Add focused tests proving unrelated fields survive concurrent `goal_evidence` updates.

## Non-Goals
- No change to Linear/workpad/PR/review/check authority.
- No lifecycle authorization from goal state.
- No broad manifest schema redesign.
- No hook/resume/long-poll control integration.
- No replacement of existing proof locks unless the new primitive is proven compatible.

## Not Done If
- `goal_evidence` patches can still overwrite concurrent unrelated manifest fields.
- The fix only serializes one call site while known concurrent manifest writers remain unlocked.
- Stale or malformed goal evidence can be promoted.
- Lifecycle decisions start depending on goal state.

## User Experience
- Personas: provider worker, command-runner, control-host persistence, and review shepherd.
- Journey: a provider worker can record advisory goal evidence while the run manifest is also receiving runtime, command, or control-host updates, and the final manifest retains both sets of fields.

## Technical Considerations
- The manifest file remains a JSON object and keeps its current schema.
- The solution should prefer a minimal shared helper over bespoke per-call-site locking.
- Whole-manifest writers must not drop current fields that are absent from a stale outgoing snapshot; explicit fields in the outgoing snapshot may still update or clear those fields.
- `goal_evidence` validation remains fail-closed and advisory-only.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the stale whole-manifest overwrite seam for provider-worker advisory `goal_evidence` updates while retaining the durable Linear-first lifecycle authority contract.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker manifest patch | `goal_evidence` patch can write a stale whole manifest snapshot. | remove fallback | CO-514 | concurrent `goal_evidence` patch and unrelated manifest writer | 2026-05-12 | 2026-05-12 | this issue | shared manifest serialization/merge helper covers the patch path | focused concurrency tests |
| Manifest whole-snapshot persistence | command-runner/control-host writes can race outside the patch contract. | remove fallback | CO-514 | command-runner/control-host/provider-worker manifest persistence | 2026-05-12 | 2026-05-12 | this issue | known racing writers use the shared helper or are proven non-overlapping | focused writer tests plus build |
| Lifecycle authority | Linear/workpad/PR/review/check truth remains separate from advisory goal evidence. | justify retaining fallback | CO provider-worker workflow | goal evidence present, absent, stale, or malformed | existing authority contract predates CO-514 | 2026-05-12 | non-expiring authority contract | only replaced by a separate approved authority redesign | advisory marker and not-authorized-for tests |

## Metrics & Guardrails
- Primary success metric: final manifests retain concurrent unrelated fields after `goal_evidence` patching.
- Guardrail: `goal_evidence.authority` remains `advisory_only`, `linear_authority_preserved` remains true, and not-authorized-for markers remain canonical.

