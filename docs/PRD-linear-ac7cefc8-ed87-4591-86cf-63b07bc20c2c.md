# PRD - CO-330 stale control-host owner reclaim and provider refresh retry recovery

## Traceability
- Linear issue: `CO-330` / `ac7cefc8-ed87-4591-86cf-63b07bc20c2c`
- Linear URL: https://linear.app/asabeko/issue/CO-330
- Task id: `linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c`
- Canonical spec: `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- Parent manifest: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-co330-docs/cli/2026-04-23T13-50-23-422Z-4c9061c1/manifest.json`
- Source anchor: `ctx:sha256:dd72505af8602844d9a722f7d0cac31d98fe08f25d84adb745ed3f979b6c8cf8#chunk:c000001`
- Source payload: `../../.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c/cli/2026-04-23T13-47-24-915Z-37a8101f/memory/source-0/source.txt`
- Source payload note: the parent workspace source payload is present and records the provider-worker run metadata/provenance for this CO-330 attempt; the issue-shaping contract still comes from the Linear issue prompt and workpad context.

## Summary
- Problem Statement: a provider lane can report `provider-linear-worker could not request control-host refresh` with `refresh request timeout` / `fetch failed` when the local `control-host` owner metadata is stale. Existing CO-152 ownership protection and CO-119 refresh-timeout recovery are related, but CO-330 is the narrower recovery seam: classify `stale_control_host_owner`, write `control-host-stale-owner.json`, reclaim the owner safely, and keep provider refresh requests retryable/resumable instead of losing queue progress.
- Desired Outcome: when a stale `control-host` owner blocks provider refresh, the system emits a distinct stale-owner diagnosis, performs metadata-first owner reclaim only when safe, and resumes provider refresh queue behavior without turning the incident into a generic host restart workaround or unrelated admission/backfill fix.

## User Request Translation
- User intent / needs: create the docs-first packet for CO-330 so implementation can harden stale control-host owner recovery without touching source/tests in this lane. Preserve exact incident terms, define the boundary with CO-152 and CO-119, and reject nearby wrong interpretations before parent-owned implementation begins.
- Success criteria / acceptance:
  - `stale_control_host_owner` is a distinct diagnosis from duplicate active owner, provider cooldown, API budget exhaustion, and generic `fetch failed`
  - stale owner evidence is written to `control-host-stale-owner.json` with enough owner/process/task/run/pipeline metadata for audit
  - owner reclaim happens only after metadata-first liveness checks prove the owner is stale
  - `provider-linear-worker could not request control-host refresh` failures caused by a stale owner become retryable/resumable queue behavior after reclaim
  - provider refresh queue state is not discarded, duplicated, or falsely marked terminal during stale-owner recovery
  - prior CO-152 and CO-119 behavior remains intact outside this recovery seam
- Constraints / non-goals:
  - do not treat this as already owned by `CO-41`
  - do not collapse the lane into only `CO-317` admission/backfill behavior
  - do not solve it as a generic host restart workaround
  - do not classify it as a stdin bootstrap regression
  - do not mutate Linear state, workpad, PR lifecycle, source, or tests from this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `stale_control_host_owner`
  - `control-host`
  - `provider-linear-worker could not request control-host refresh`
  - `refresh request timeout`
  - `fetch failed`
  - `control-host-stale-owner.json`
  - `provider-control-host-refresh-failure.json`
  - `owner reclaim`
  - `provider refresh`
  - `retry/resumable queue behavior`
- Related context to cite narrowly:
  - `CO-152` stale-owner ownership is prior related ownership context, not a replacement for CO-330
  - `CO-119` refresh-timeout recovery is prior related refresh-timeout context, not a complete stale-owner recovery design
- Nearby wrong interpretations to reject:
  - "this is already owned by CO-41"
  - "this is only CO-317 admission/backfill"
  - "restart the host and call it fixed"
  - "this is a stdin bootstrap regression"
  - "delete provider refresh queue state during reclaim"

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Owner metadata | CO-152 introduced owner metadata and duplicate/stale ownership concepts, but CO-330 needs a specific stale-owner recovery artifact and reclaim path for provider refresh failures. | Active owners fail closed; stale owners may be reclaimed only after liveness proof. | `stale_control_host_owner` is emitted with `control-host-stale-owner.json`, and reclaim is metadata-first and auditable. | Reopening the entire CO-152 duplicate-host design or using broad process killing. |
| Provider refresh request | CO-119 made refresh timeouts a bounded recovery seam, but `refresh request timeout` / `fetch failed` can still obscure stale owner conditions. | Busy-but-healthy queued/coalesced refresh work should remain recoverable; real failures should be classified. | Stale-owner refresh failures become retryable/resumable queue behavior after safe owner reclaim. | Generic timeout increases, review/merge workflow redesign, or stdin bootstrap fixes. |
| Queue behavior | A stale owner can make provider refresh look terminal or unrecoverable to a provider worker. | Provider refresh queue state should preserve pending work until a truthful terminal state exists. | Queue entries survive stale-owner reclaim and resume without duplicate launch or request burn. | CO-317-only admission/backfill behavior or broad provider queue redesign. |

## Not Done If
- A stale owner still appears only as `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, or `fetch failed`.
- No `control-host-stale-owner.json` artifact exists for stale-owner diagnosis.
- Owner reclaim can run against an active owner or without liveness evidence.
- Provider refresh queue state is dropped, duplicated, or marked terminal during reclaim.
- The implementation is described as CO-41, CO-317-only, a host restart workaround, or stdin bootstrap regression handling.

## Goals
- Define a CO-330 docs-first packet for stale control-host owner recovery.
- Preserve protected incident terms and wrong-interpretation guardrails.
- Establish a parent-owned implementation path for stale-owner artifact writing, owner reclaim, and provider refresh queue resumption.
- Keep CO-152 and CO-119 as adjacent context only.

## Non-Goals
- No source or test edits in this docs child lane.
- No Linear mutation helpers, workpad changes, or PR lifecycle actions.
- No full validation suites from this child lane.
- No broad control-host restart, provider admission/backfill, or stdin bootstrap redesign.
- No weakening of existing owner safety or refresh-timeout guardrails.

## Stakeholders
- Product: CO operators diagnosing provider refresh stalls under local control-host ownership drift.
- Engineering: control-host ownership, provider-linear-worker, provider refresh queue, and recovery-path maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - packet and mirrors are present under the exact CO-330 task id
  - `tasks/index.json` links the canonical spec and checklist
  - protected terms and rejected interpretations are present in PRD/spec/action/checklists
  - child-lane patch touches only declared docs-phase files
- Guardrails / Error Budgets:
  - zero source/test edits in this child lane
  - zero Linear mutations
  - no broad process killing or generic restart language as the durable fix
  - no provider refresh queue state deletion during owner reclaim

## Technical Considerations
- Architectural Notes:
  - implementation should likely sit near existing control-host owner metadata and provider refresh request/queue handling, but this lane does not inspect or edit those source files.
  - stale-owner recovery should be additive to CO-152 owner safety and CO-119 refresh-timeout semantics.
  - diagnostics should be local, auditable, and machine-readable through `control-host-stale-owner.json`.
- Dependencies / Integrations:
  - `control-host` owner metadata and liveness checks
  - provider refresh request path used by `provider-linear-worker`
  - provider refresh queue persistence/resume behavior
  - parent-owned docs-review, implementation, focused tests, and PR lifecycle

## Decision / Resolved
- `control-host-stale-owner.json` records the owner metadata fields needed for audit and reclaim classification: owner id, pid, task id, run id, pipeline id, cwd, endpoint, stale reason, reclaim timestamp, and attempted-owner metadata when a competing claimant triggered the reclaim decision.
- Stale-owner reclaim is automatic on the first failed provider refresh request that classifies as `stale_control_host_owner` with `stale_reclaimed`; after reclaim, the provider lane performs exactly one bounded retry and does not continue retrying beyond that second attempt.

## Approvals
- Product: parent CO-330 lane, pending
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
