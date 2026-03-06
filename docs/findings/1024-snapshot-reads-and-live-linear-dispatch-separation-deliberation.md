# Findings - 1024 Snapshot Reads + Live Linear Dispatch Separation

## Decision
- Proceed with a bounded follow-up slice that separates synchronous snapshot/read surfaces from live Linear dispatch evaluation by adding a runtime-owned advisory cache.

## Why This Slice Next
- The just-closed `1023` runtime seam is good enough to support a semantic split without reopening `ControlServer` ownership.
- Real Symphony's snapshot/presenter guidance is clear: synchronous runtime snapshots should draw from orchestrator state only, not from live provider reads during render.
- CO still carries one semantic shortcut from the earlier request-scoped Linear work:
  - state/issue/UI can pull async live Linear evaluation during snapshot warm,
  - `tracked` can be synthesized from dispatch recommendation data even when no advisory ingress was accepted.
- Local test evidence shows the practical cost of that shortcut:
  - invalid-signature and out-of-scope webhook tests become network-sensitive unless fetch is stubbed,
  - snapshot semantics no longer cleanly mean "runtime-owned accepted state".

## Local Evidence
- `orchestrator/src/cli/control/observabilitySurface.ts:205` still reads async dispatch evaluation inside the state payload path.
- `orchestrator/src/cli/control/selectedRunProjection.ts:187` still falls back from accepted advisory state to `dispatchPilotEvaluation.recommendation.tracked_issue`.
- `orchestrator/tests/ControlServer.test.ts:1884` and `orchestrator/tests/ControlServer.test.ts:1954` expect ignored/rejected webhook deliveries not to mutate snapshot-level tracked state, but those cases can still touch live provider-backed behavior unless fetch is explicitly stubbed.
- Real Symphony snapshot guidance:
  - `SPEC.md` says synchronous runtime snapshots for dashboards/monitoring should draw from orchestrator state/metrics only,
  - `elixir/lib/symphony_elixir_web/presenter.ex` reads `Orchestrator.snapshot(...)` and renders payloads from that in-memory runtime state rather than reaching into provider APIs during snapshot rendering.

## Minimal Recommendation
- Make snapshot surfaces (`/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, Telegram state/issue reads) runtime-state-only.
- Add a bounded runtime-owned advisory cache/single-flight refresh seam so live provider work is no longer coupled to selected-run projection building.
- Keep explicit live advisory evaluation on `/api/v1/dispatch` for now.
- Stop deriving snapshot `tracked` payloads from dispatch recommendations.
- If snapshot surfaces still need dispatch posture visibility, expose a synchronous non-provider summary instead of a live recommendation.

## Non-Goals
- No poller cadence in this slice.
- No authority widening.
- No Telegram transport changes.
- No broader route/auth extraction.
