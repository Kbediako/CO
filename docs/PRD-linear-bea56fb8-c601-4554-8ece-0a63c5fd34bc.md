# PRD - CO STATUS: restore truthful default operator telemetry and Symphony parity

## Added by Bootstrap 2026-04-04

## Traceability
- Linear issue: `CO-78` / `bea56fb8-c601-4554-8ece-0a63c5fd34bc`
- Linear URL: https://linear.app/asabeko/issue/CO-78/co-status-restore-truthful-default-operator-telemetry-and-symphony
- Related source issues: `CO-77`

## Summary
- Problem Statement: the default non-JSON `co-status` operator surface still diverges from both the expected CO contract and the local Symphony reference. During real active usage, header telemetry and running-row semantics stay empty or misleading, top-line rate-limit output is Linear-first and leaks low-value internal source text, the reset countdown is hard to interpret, and the default path still auto-starts plus advertises the HTTP dashboard even though that dashboard is not ready to be the default operator surface.
- Desired Outcome: the default visible `CO STATUS` frame becomes truthful end to end. The default path stops auto-starting and advertising the HTTP dashboard, live header and row telemetry become authoritative or explicit `n/a`, rate-limit presentation becomes operator-useful and Codex-first, and every visible state is re-tested against the local Symphony reference with real-device screenshots embedded directly in Linear.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-78` by treating the entire visible default `CO STATUS` frame as one user-facing contract, not as a narrow field fix, while using the repo’s Linear workpad/docs/review workflow and the local Symphony implementation as the semantics reference.
- Success criteria / acceptance:
  - default non-JSON `co-status` no longer auto-starts or advertises the HTTP dashboard
  - live header `Tokens` and `Throughput` show truthful non-empty values during real active Codex usage
  - `Rate Limits` surfaces Codex usage limits first and cleans up Linear presentation when Linear budget is shown
  - running rows show distinct meaningful `STAGE` and `EVENT`, include `PID`, and make `AGE / TURN`, `TOKENS`, and `SESSION` authoritative or explicit `n/a`
  - tests and manual proof cover the full visible status contract, not just touched fields
  - closeout includes real screenshots from this device embedded directly in Linear
- Constraints / non-goals:
  - no broad redesign of the HTTP dashboard itself
  - no unrelated control-host refactor outside the bounded seams needed for truthful default status behavior
  - no rendered proof cards, synthetic screenshots, or mock-only validation
  - do not treat one repaired field as evidence that the rest of the visible surface is correct

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `restore truthful default operator telemetry and Symphony parity`
  - `full visible default CO STATUS frame as one contract`
  - `Tokens`, `Throughput`, `Rate Limits`, `STAGE`, `EVENT`, `PID`, `AGE / TURN`, `TOKENS`, and `SESSION`
  - `The default co-status path must stop auto-running and advertising the HTTP dashboard`
  - `Validation must use real screenshots captured from this device and embedded directly in Linear`
- Protected terms / exact artifact and surface names:
  - `co-status`
  - `Dashboard:`
  - `Tokens`
  - `Throughput`
  - `Rate Limits`
  - `EVENT`
  - `PID`
  - `AGE / TURN`
  - `TOKENS`
  - `SESSION`
  - Symphony
- Nearby wrong interpretations to reject:
  - “only fix the first empty field”
  - “hide the dashboard URL but still auto-run the server”
  - “rendered proof cards are enough”
  - “if one field starts working, the rest are assumed fine”
  - “AGE / TURN is just a render bug even when upstream turn/session/token data is absent”

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth:
  - default `co-status` still auto-starts and advertises the HTTP dashboard
  - top-line rate limits are Linear-first and can leak raw internal source labels
  - key header/row telemetry stays empty or misleading during active usage
  - `EVENT` can collapse to a duplicate stage fallback and there is no PID column
- Reference truth:
  - Symphony only shows `Dashboard:` when a dashboard server is actually present and enabled
  - Symphony renders operator-useful rate-limit presentation without raw internal-source tags
  - Symphony includes PID and projects event, turn, token, and session semantics into the running table
  - Symphony snapshot tests assert the visible status surface directly
- Target truth / intended delta:
  - default CO STATUS does not auto-run or advertise the HTTP dashboard unless explicitly requested
  - Codex usage limits lead the top-line operator surface; Linear budget, if shown, is clearly labeled and cleaned up
  - header and running-row telemetry fields become authoritative or explicit `n/a`
  - CO STATUS reaches Symphony parity in operator usefulness where Symphony is materially better, without pixel cloning
- Explicitly out-of-scope differences:
  - redesigning the dashboard UI/UX
  - broad control-host architecture changes unrelated to the visible status truth path

## Not Done If
- `co-status` still auto-starts or advertises the HTTP dashboard by default.
- `Tokens`, `Throughput`, `Rate Limits`, `EVENT`, `PID`, `AGE / TURN`, `TOKENS`, or `SESSION` remain empty, misleading, or unverified during real active usage.
- the Linear rate-limit line still shows raw source text such as `dispatch_source_issue_by_id`.
- reset timing still appears as unclear raw countdown text without explicit trustworthy semantics.
- Symphony was not used as a detailed semantics reference.
- closeout proof relies on mock or rendered screenshots instead of real-device screenshots embedded in Linear.

## Goals
- Restore truthful default non-JSON `co-status` behavior for the full visible operator frame.
- Align live header and row semantics with Symphony where Symphony is clearly more operator-useful.
- Clean up top-line rate-limit presentation so Codex limits lead and Linear budget is authoritative when shown.
- Add focused automated coverage for the shared truth path and explicit degraded/empty semantics.
- Produce real-device screenshot proof for every required visible state.

## Non-Goals
- Rebuilding or redesigning the HTTP dashboard surface.
- Broadly refactoring the control host beyond the seams required for truthful status behavior.
- Adding synthetic proof-card generation or screenshot rendering helpers.
- Widening the lane into unrelated observability or provider workflow changes.

## Stakeholders
- Product: CO operators expecting the default status surface to be trustworthy
- Engineering: control-host / status-surface maintainers and provider-worker reviewers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - all required visible header and row fields render truthful values or explicit `n/a`
  - live top-line rate-limit output is Codex-first and free of raw internal labels
  - focused test coverage and manual proof cover live, paused/inspect, compact, idle, and degraded states
- Guardrails / Error Budgets:
  - preserve the current bounded status architecture unless a smaller truthful seam proves impossible
  - do not silently keep dashboard auto-start behavior while only hiding the line item
  - do not claim closure without real active-usage verification and device screenshots

## User Experience
- Personas: operator watching live CO STATUS; reviewer comparing CO semantics with Symphony; maintainer validating degraded and idle states
- User Journeys:
  - operator runs default `co-status` and sees a truthful terminal-only default surface
  - operator watches an active run and sees meaningful Tokens, Throughput, Rate Limits, PID, EVENT, AGE / TURN, TOKENS, and SESSION values
  - reviewer can inspect tests plus real screenshots and confirm the visible contract matches the issue scope

## Technical Considerations
- Architectural Notes:
  - the likely implementation seam lives around `controlStatusDashboard.ts` and the read-model data it projects
  - Symphony status-dashboard rendering and snapshot tests are the detailed semantics reference, especially for PID, event humanization, and `n/a` behavior
  - the lane must preserve a single truthful visible contract across launch/default behavior, summary header, rows, and degraded states
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - related control-host status/read-model helpers
  - `orchestrator/tests/ControlStatusDashboard.test.ts`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/orchestrator_status_test.exs`

## Open Questions
- What is the smallest truthful upstream seam for live token/session/turn telemetry: an existing read-model field that is not yet carried through, or a missing aggregation step that must be added?
- Which current default `co-status` code path owns the dashboard auto-start decision versus only the line-item rendering?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: `codex-orchestrator docs-review` completed with `review_outcome: clean-success`; manifest `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`
- Design: N/A
