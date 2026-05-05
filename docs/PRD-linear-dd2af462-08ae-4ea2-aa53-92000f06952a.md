# PRD - CO-455 attach timeout with healthy lower-authority evidence

## Traceability
- Linear issue: `CO-455` / `dd2af462-08ae-4ea2-aa53-92000f06952a`
- Linear URL: https://linear.app/asabeko/issue/CO-455
- Task id: `linear-dd2af462-08ae-4ea2-aa53-92000f06952a`
- Canonical spec: `tasks/specs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- Task checklist: `tasks/tasks-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- Agent mirror: `.agent/task/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- Source anchor: `ctx:sha256:4c0a0f86311a384399aff1273a95e9e72eed60adf0127cd70616e736d4088164#chunk:c000001`
- Source manifest: `.runs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a-docs-packet/cli/2026-05-05T22-29-01-603Z-53a89036/manifest.json`
- Source payload note: the supplied source payload is available through the parent workspace and contains run/source metadata rather than the full issue body, so this packet is anchored on the explicit child-lane contract, protected terms, and issue boundaries in the prompt.

## Summary
- Problem Statement: `co-status --format json` can receive a `control-host ui request timeout after 15000ms` while lower-authority evidence remains healthy through `provider-intake-state.json` and worker manifest heartbeats. That attach-read failure must not be collapsed into stale endpoint rotation, stale control-host owner reclamation, or a fabricated coherent status snapshot.
- Desired Outcome: parent implementation reports a truthful degraded-read status for the timed-out `/ui/data.json` read while preserving healthy lower-authority evidence. Operators should see that the UI read timed out, that lower authority still indicates worker health, and that no stale endpoint or owner-reclamation action is justified solely by this timeout.

## User Request Translation
- User intent / needs:
  - create the CO-455 docs-first packet and registry mirrors before parent implementation
  - preserve the attach-timeout with healthy lower-authority scope
  - preserve exact surfaces and artifacts: `co-status --format json`, `control-host ui request timeout after 15000ms`, `provider-intake-state.json`, worker manifest heartbeats, `/ui/data.json`, stale endpoint rotation, stale control-host owner reclamation, truthful degraded-read status, and no fabricated coherent status
  - reject adjacent but different issues: CO-459 stale `provider_intake` projection, CO-468 accepted no-run recovery, CO-407 direct JSON timeout budget, broad provider admission policy, and manual provider-intake artifact edits
- Success criteria / acceptance:
  - PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` carry the same issue contract
  - parent implementation classifies the attach path timeout as degraded read truth rather than stale endpoint truth when lower-authority evidence is healthy
  - parent implementation keeps `/ui/data.json` timeout information visible instead of synthesizing a complete coherent snapshot
  - parent implementation preserves lower-authority health evidence from `provider-intake-state.json` and worker manifest heartbeats without manually editing provider-intake artifacts
  - parent implementation does not widen into CO-459, CO-468, CO-407, provider admission policy, or manual provider-intake repair
- Constraints / non-goals:
  - child lane owns docs packet and registry mirrors only
  - no implementation, test, Linear mutation, GitHub mutation, workpad, PR, or full validation work in this child lane
  - parent owns source inspection, docs-review, implementation, validation, review, PR lifecycle, and Linear state

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `co-status --format json`
  - `control-host ui request timeout after 15000ms`
  - `provider-intake-state.json`
  - `worker manifest heartbeats`
  - `stale endpoint rotation`
  - `stale control-host owner reclamation`
  - `/ui/data.json`
  - `truthful degraded-read status`
  - `no fabricated coherent status`
- Nearby wrong interpretations to reject:
  - `CO-459 stale provider_intake projection`
  - `CO-468 accepted no-run recovery`
  - `CO-407 direct JSON timeout budget`
  - broad provider admission policy
  - manual provider-intake artifact edits
  - treating a timed-out UI read as proof that the endpoint or owner is stale
  - using lower-authority health evidence to fabricate a complete `/ui/data.json` response

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `co-status --format json` | Attach status can fail on a UI read timeout. | Machine-readable status must distinguish read degradation from endpoint staleness. | Emits a truthful degraded-read status with the timeout reason and lower-authority evidence context. | CO-407 direct JSON timeout budget changes. |
| `control-host ui request timeout after 15000ms` | A 15000ms attach read timeout can happen even when lower authority remains healthy. | Timeout is evidence about the UI read path, not by itself proof of stale endpoint or owner state. | Classified as a degraded `/ui/data.json` read, not stale endpoint rotation or stale control-host owner reclamation. | Broad timeout policy redesign. |
| `provider-intake-state.json` | Lower-authority provider-intake data can still be current and healthy. | Provider-intake state can support degraded-read diagnosis but must not be manually edited to force coherence. | Preserved as lower-authority health evidence without becoming a fabricated full UI snapshot. | CO-459 stale `provider_intake` projection repair and manual provider-intake artifact edits. |
| Worker manifest heartbeats | Worker manifest heartbeats can remain fresh while the UI read times out. | Fresh heartbeats are health evidence, not proof that `/ui/data.json` succeeded. | Fresh heartbeat evidence prevents stale owner/endpoint overreaction while the status remains degraded. | CO-468 accepted no-run recovery. |
| `/ui/data.json` | The UI data read can be missing because the request timed out. | Missing UI payload must be represented honestly. | Status says the read degraded or timed out; it does not invent a coherent `/ui/data.json` payload. | Fabricated coherent status. |
| Stale endpoint rotation | Endpoint rotation is appropriate only for actual stale/dead endpoint evidence. | Healthy lower-authority evidence should block timeout-only stale endpoint conclusions. | No stale endpoint rotation is triggered solely by this attach timeout. | Generic stale endpoint cleanup. |
| Stale control-host owner reclamation | Owner reclamation is appropriate only when owner evidence is stale or invalid. | Healthy heartbeats and intake evidence should not be overwritten by timeout-only owner reclamation. | No stale control-host owner reclamation is triggered solely by this attach timeout. | Broad owner reclamation policy changes. |

## Not Done If
- `co-status --format json` still reports a coherent current status after `/ui/data.json` timed out without carrying degraded-read truth.
- `control-host ui request timeout after 15000ms` triggers stale endpoint rotation or stale control-host owner reclamation despite healthy `provider-intake-state.json` and worker manifest heartbeats.
- Lower-authority evidence is used to fabricate a complete `/ui/data.json` snapshot.
- The fix edits `provider-intake-state.json` manually or relies on manual provider-intake artifact edits.
- The implementation absorbs CO-459 stale `provider_intake` projection, CO-468 accepted no-run recovery, CO-407 direct JSON timeout budget, or broad provider admission policy.

## Goals
- Create the docs-first packet and registry mirrors for CO-455.
- Define the parent implementation contract for attach-read timeouts when lower authority is healthy.
- Preserve truthful degraded-read status and lower-authority health evidence.
- Prevent timeout-only stale endpoint rotation or stale control-host owner reclamation.
- Keep adjacent issue families out of scope.

## Non-Goals
- No implementation or test edits in this child lane.
- No Linear state, GitHub state, workpad, or PR lifecycle mutation in this child lane.
- No CO-459 stale `provider_intake` projection fix.
- No CO-468 accepted no-run recovery fix.
- No CO-407 direct JSON timeout budget change.
- No broad provider admission policy change.
- No manual provider-intake artifact edits.
- No fabricated coherent status from lower-authority evidence.

## Stakeholders
- Product: CO operators using `co-status --format json` to decide whether a control-host attach timeout is a degraded read, a stale endpoint, or an owner-reclamation problem.
- Engineering: parent CO-455 provider worker implementing attach-read classification, lower-authority health checks, and focused regressions.
- Review: parent lane and review agents validating that timeout, lower-authority, and adjacent issue boundaries remain separate.

## Metrics & Guardrails
- Primary Success Metrics:
  - protected issue terms appear in PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror
  - `tasks/index.json` and `docs/docs-freshness-registry.json` parse as JSON after registration
  - parent focused tests prove the attach-timeout path surfaces truthful degraded-read status with healthy lower-authority evidence
- Guardrails:
  - no fabricated coherent status
  - no timeout-only stale endpoint rotation
  - no timeout-only stale control-host owner reclamation
  - no manual provider-intake artifact edits
  - no CO-459, CO-468, CO-407, or broad provider admission scope absorption

## Technical Considerations
- Architectural Notes:
  - parent implementation should inspect the `co-status --format json` attach path, `/ui/data.json` request handling, provider-intake state reads, and worker manifest heartbeat reads
  - lower-authority evidence can explain degraded-read state but must not be promoted into a complete UI payload
  - stale endpoint rotation and stale control-host owner reclamation must remain reserved for stale/dead endpoint or owner evidence
- Dependencies / Integrations:
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - worker manifest heartbeats
  - attach-shell or control-host UI request timeout classification
  - stale endpoint rotation and stale control-host owner reclamation guards

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision summary: remove the timeout-only stale-endpoint or stale-owner fallback for healthy lower-authority evidence; justify retaining lower-authority health reads as diagnostic support; justify retaining stale endpoint rotation and stale control-host owner reclamation only for proven stale/dead authority states.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Attach `/ui/data.json` read | `control-host ui request timeout after 15000ms` can be treated as stale endpoint or stale owner truth even when lower authority is healthy. | remove fallback | CO-455 parent lane | Attach UI read times out while `provider-intake-state.json` and worker manifest heartbeats remain healthy. | observed 2026-05-05 | 2026-05-06 | 0 days | Parent emits truthful degraded-read status and blocks timeout-only stale endpoint rotation or stale control-host owner reclamation. | Focused attach-timeout regression with healthy lower-authority evidence. |
| Lower-authority health evidence | `provider-intake-state.json` and worker manifest heartbeats are used during degraded-read diagnosis. | justify retaining fallback | CO-455 parent lane | `/ui/data.json` is unavailable but lower-authority evidence is fresh. | existing control-host observability contract | 2026-05-06 | Non-expiring diagnostic support | Replace only if a stronger unified health-read authority preserves degraded-read truth and source provenance. | Tests prove lower authority informs diagnosis without fabricated coherent status. |
| Stale endpoint rotation / stale control-host owner reclamation | Rotation or reclamation remains available for real stale/dead authority evidence. | justify retaining fallback | Control-host status owner | Endpoint or owner evidence is stale/dead, not merely slow. | existing control-host recovery contract | 2026-05-06 | Non-expiring recovery contract | Replace only with a better stale/dead endpoint and owner recovery mechanism. | Tests prove timeout-only healthy-lower-authority cases do not trigger these paths. |

- Durable retention evidence: lower-authority health reads stay retained as source-labeled diagnostic evidence, and stale endpoint/owner recovery stays retained only for actual stale or dead evidence.
- Large-refactor check: a large provider admission or status redesign is not required for the docs packet. Parent should escalate only if attach-read timeout classification, lower-authority health evidence, and stale endpoint/owner recovery are split across incompatible authority paths.

## Open Questions
- Which parent-owned code path should own the degraded-read classification: the attach shell, the status read model, or the UI request helper?
- Should parent expose a structured degraded-read reason for `control-host ui request timeout after 15000ms`, or reuse an existing timeout/error envelope with explicit lower-authority health evidence?

## Approvals
- Product: CO-455 child-lane prompt, pending parent acceptance
- Engineering: bounded docs-only child lane
- Design: N/A
