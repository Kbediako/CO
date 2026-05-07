# PRD - CO-492 Advisory Persisted Goal Evidence Capture

## Summary
- Problem Statement: CO-486 proved persisted `/goal` state can help provider-worker operator continuity, but the provider-worker manifests and workpad summary do not yet capture that evidence with a fail-closed advisory boundary.
- Desired Outcome: add a docs-first implementation packet for `CO-492` that preserves `Linear remains source of truth` while allowing optional advisory `manifest goal_evidence` and workpad summary capture when the goals feature, app-server APIs, and model tools expose a current same-thread goal snapshot.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): rebuild the CO-492 docs-first packet from current `origin/main` after the stale PR `#788` review cycle, keeping the lane narrowly scoped to advisory provider-worker run evidence and ensuring the replacement branch covers every stale review finding before any implementation handoff.
- Success criteria / acceptance: the packet defines `goal_evidence` as `advisory_only`, preserves provider-worker run evidence without granting lifecycle authority, records the stale PR `#788` acceptance coverage, and updates the task and docs freshness registry mirrors without touching implementation or test files in this child lane.
- Constraints / non-goals: no Linear or GitHub mutations from this child lane; no implementation or test edits; no hook/resume control integration; no TUI automation; no lifecycle transition, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, or long-poll terminal status based on goal state.

## Rework Truth - 2026-05-07
- Current branch posture: this docs child lane starts from current `origin/main` at `89dbeb05f65a2990776e294e4c16f239c952937a`.
- Stale PR `#788` is review evidence only and must not be treated as the active replacement branch or PR lifecycle surface.
- Source anchor: `ctx:sha256:3d2d783bff06744771ae73806255246cfa5f544055209f45373d48804ad1e0ba#chunk:c000001`.
- Parent-provided source payload path was not present inside this child checkout during packet rebuild; this packet uses the current issue description from the parent prompt, current `origin/main`, and existing CO-486 goal-evidence packet as local context.
- Parent lane owns Linear state, the authoritative workpad, docs-review, implementation, validation, PR lifecycle, and final handoff. This child lane owns only the declared docs-phase files.

## Intent Checksum
- Exact user wording / phrases to preserve: persisted `/goal`, goals feature, app-server APIs, model tools, provider-worker run evidence, manifest goal_evidence, workpad summary, advisory_only, Linear remains source of truth.
- Protected terms / exact artifact and surface names: `CO-492`, `CO-486`, `PR #788`, `goal_evidence`, `authority=advisory_only`, `advisory_only`, `manifest goal_evidence`, `workpad summary`, `app-server APIs`, `model tools`, `goals feature`, `provider-worker run evidence`.
- Nearby wrong interpretations to reject: goal state authorizes Linear transitions; goal state authorizes PR attachment; goal state authorizes review handoff; goal state authorizes ready-review success; goal state authorizes merge closeout; goal state authorizes hook recovery success; goal state authorizes long-poll terminal status; this lane implements hook/resume control integration; this lane implements TUI automation; stale PR `#788` remains active PR truth.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| Provider-worker run evidence | Manifests and workpads capture governed run evidence, but not normalized persisted goal snapshots. | CO-486 classified persisted `/goal` state as advisory provider-worker run evidence only. | Provider-worker evidence can include optional normalized `goal_evidence` with `authority=advisory_only`. | Any lifecycle authority derived from goal state. |
| Goal capture | Goal state may be unavailable, disabled, stale, thread-mismatched, or complete. | Missing or untrusted goal data must fail closed without blocking canonical Linear/workpad/PR truth. | Capture records unavailable/disabled/stale/thread-mismatched states as advisory evidence and never reuses invalid candidates. | Treating goal state as a recovery, review, or merge signal. |
| Workpad summary | Workpad is a concise parent-owned status and evidence pointer. | Linear remains source of truth, and workpad remains a pointer, not authority by itself. | Workpad summary can show a compact advisory goal-evidence line only when the manifest carries matching advisory markers. | Workpad closeout based on goal completion. |
| Stale PR review findings | PR `#788` surfaced replacement-branch acceptance gaps. | Replacement branch must carry the review findings into acceptance/test coverage. | CO-492 packet names every stale PR `#788` finding as implementation acceptance coverage. | Reusing PR `#788` as active lifecycle state. |

## Not Done If
- `goal_evidence` can be interpreted as authorizing Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation.
- Disabled goals can be reused as a candidate instead of failing closed before candidate reuse.
- Manifest patching can write stale fallback snapshots.
- Command-runner manifest persistence can omit `advisory_only` markers.
- Legacy hydration can backfill goal evidence without a real goal notification.
- `elapsed_seconds` rejects fractional seconds.
- Thread-mismatch regression coverage can run with goals off.
- Stale candidate timestamps are not classified as stale.
- Stale PR `#788` is treated as the active PR surface instead of stale review evidence.

## Goals
- Add an implementation-ready docs packet for advisory provider-worker `manifest goal_evidence` capture.
- Preserve the CO-486 authority boundary: persisted `/goal` is advisory provider-worker run evidence, and Linear remains source of truth.
- Ensure the replacement implementation covers the stale PR `#788` review findings in acceptance criteria and focused tests.
- Keep workpad summary rendering compact and explicitly advisory.

## Non-Goals
- No Linear transitions, workpad closeout, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, or long-poll terminal status based on goal state.
- No hook/resume control integration.
- No TUI automation.
- No broad provider-worker lifecycle redesign.
- No historical manifest rewrite or stale fallback snapshot patching.
- No implementation or test edits by this child docs lane.

## Stakeholders
- Product: CO operator continuity and provider-worker trust boundaries.
- Engineering: provider-worker manifest persistence, command-runner manifest patching, legacy hydration, app-server goal notification handling, and workpad rendering.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics: replacement branch acceptance covers all PR `#788` findings; `goal_evidence` is present only as `advisory_only`; invalid candidates fail closed; Linear/workpad/PR/review/check authority remains external to goal state.
- Guardrails / Error Budgets: never use goal evidence for lifecycle authority; preserve source-of-truth separation; preserve stale candidate and thread mismatch fail-closed behavior.

## User Experience
- Personas: CO operator, provider worker, review shepherd, and long-poll watcher.
- User Journeys:
  - A provider worker with a current same-thread goal can record advisory goal evidence in the manifest and a compact workpad summary line.
  - A provider worker with disabled, missing, stale, or thread-mismatched goal data records a fail-closed advisory state instead of reusing stale candidate data.
  - A reviewer can inspect the manifest and see that `goal_evidence.authority` is `advisory_only` and not authorized for lifecycle decisions.

## Technical Considerations
- Architectural Notes: `goal_evidence` is additive provider-worker run evidence. Candidate reuse must be gated by current feature availability, same-thread identity, freshness, notification provenance where required, and advisory markers.
- Dependencies / Integrations: goals feature, app-server APIs, model tools, provider-worker manifest persistence, command-runner manifest patching, workpad summary rendering, and legacy hydration safeguards.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: retain Linear/workpad/PR/review/check authority as the governing workflow contract and add only advisory goal evidence.
- Contract name: Linear-first provider-worker lifecycle authority with optional advisory `manifest goal_evidence`.
- Owning surface: CO provider-worker workflow.
- Introduced date: authority contract predates CO-492; advisory capture introduced by this lane.
- Review date: 2026-05-07.
- Maximum lifetime: non-expiring authority contract; stale candidate reuse fallback must be removed in the implementation.
- Removal condition: only a separate approved authority redesign can replace Linear/workpad/PR/review/check truth; stale fallback snapshots are not supported.
- Non-expiring rationale: Linear/workpad/PR/review/check authority is the durable governing contract; advisory goal evidence is not temporary lifecycle authority and can only be replaced by a separate approved authority redesign.
- Steady-state proof: focused provider-worker tests prove invalid candidate rejection, canonical advisory marker persistence, and no lifecycle authorization from goal state.
- Tests/docs: CO-492 focused provider-worker tests, manifest schema coverage, and this docs packet.
- Validation evidence: focused tests listed in the CO-492 TECH_SPEC plus parent validation and review gates.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker lifecycle authority | Goal evidence may exist beside Linear/workpad/PR/review/check truth. | justify retaining fallback | CO provider-worker workflow | goals feature enabled, unavailable, stale, or thread mismatched | Existing authority predates CO-492 | 2026-05-07 | non-expiring authority contract | only replaced by a separate approved authority redesign | Advisory marker tests plus provider-worker lifecycle gates. |
| Stale fallback snapshots | Manifest patching could reuse stale candidate data to populate `goal_evidence`. | remove fallback | CO-492 | candidate reuse or manifest patching | stale PR #788 attempt | 2026-05-07 | this issue | stale snapshots are never written; stale candidates classify as stale | Manifest patching and stale timestamp regressions. |
| Legacy hydration backfill | Legacy manifests could infer goal evidence without real goal notification. | remove fallback | CO-492 | legacy hydration reads old manifests | stale PR #788 attempt | 2026-05-07 | this issue | no backfill without real notification/current snapshot | Legacy hydration real notification regression. |

## Open Questions
- Should unavailable goal capture record a full `goal_evidence` object with `capture_mode=unavailable`, or only a minimal advisory marker and reason?
- Should final workpad summary include completed advisory goals, or only active/budget-limited/paused states with freshness evidence?
- Should app-server goal notifications and model-tool snapshots both be stored, or should one normalized snapshot be authoritative for advisory rendering?

## Approvals
- Product: pending parent acceptance and review handoff.
- Engineering: pending parent docs-review, implementation, validation, and replacement PR lifecycle.
- Design: not applicable.
