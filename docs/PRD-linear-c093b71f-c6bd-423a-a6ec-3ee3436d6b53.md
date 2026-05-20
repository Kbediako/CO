# PRD - CO-542 deterministic quota hygiene audit

## Traceability
- Linear issue: `CO-542` / `c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- Task registry id: `linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- MCP Task ID: `linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- Source evidence: source-0 anchor `ctx:sha256:907f29dadf81e0e1954977486d717302a4460e0f8c6476a75ca1a9b3ed0d49d1#chunk:c000001`, generated from `.runs/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53-docs-packet/cli/2026-05-17T03-42-46-332Z-943667ff/manifest.json`.
- Child-lane scope: docs-first packet only; parent lane owns Linear state, workpad, implementation, validation, PR lifecycle, and live queue/control-host evidence.

## Summary
- Problem Statement: CO orchestration needs a deterministic quota hygiene audit that can classify quota, model-auth, delegate/app-managed capacity, and stale provider-intake signals without spending model quota, mutating defaults, or treating uncorroborated cross-thread state as current truth. Recent queue work showed that stale provider-intake claims and app-managed delegate signals can look like live WIP unless the audit requires live corroborating evidence.
- Desired Outcome: provide a docs-first implementation contract for a zero-model audit/report path that records quota-hygiene evidence deterministically, leaves all defaults unchanged, preserves `unknown` for unverified cross-thread goals, requires corroboration for app-managed delegate false positives, and refuses to count stale provider-intake claims as live WIP without live evidence.

## User Request Translation
- User intent / needs: shape CO-542 before implementation so parent work can add or wire a deterministic quota hygiene audit for parent-session supervision without using model calls or silently changing operational defaults.
- Success criteria / acceptance:
  - The audit runs with zero model calls and no review/model-spend side effects.
  - The audit is read-only by default and makes no default mutations.
  - Unknown cross-thread goals remain `unknown` unless current local, Linear, GitHub, or control-host evidence proves otherwise.
  - App-managed delegate false positives require corroboration before being reported as real active delegate/quota blockers.
  - Stale provider-intake claims are not counted as live WIP without live worker, run, or Linear/control-host evidence.
  - The report is deterministic and suitable for parent-session routing, workpad evidence, and future focused regression coverage.
- Constraints / non-goals:
  - This child lane does not edit implementation or tests.
  - Do not run Linear or GitHub commands from this child lane.
  - Do not mutate Codex defaults, model settings, provider caps, or queue state as part of the audit.
  - Do not spend quota by invoking model-backed review or broad orchestration gates for the audit itself.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `zero-model deterministic quota hygiene audit`
  - `no default mutations`
  - `unknown cross-thread goals remain unknown`
  - `app-managed delegate false positives require corroboration`
  - `stale provider-intake claims are not live WIP without live evidence`
- Protected terms / exact artifact and surface names:
  - `quota hygiene`
  - `zero-model`
  - `cross-thread goals`
  - `app-managed delegate`
  - `provider-intake-state.json`
  - `live WIP`
  - `live evidence`
  - `co-status`
  - `control-host`
  - `gpt-5.5/xhigh`
- Nearby wrong interpretations to reject:
  - using a model-backed reviewer or spawned agent as part of the audit's normal evidence collection
  - flipping model/default settings to clear quota warnings
  - treating stale provider-intake rows as active workers without live corroboration
  - converting unknown cross-thread goals into clean/done/blocked from stale memory alone
  - treating app-managed delegate visibility as authoritative without corroborating run or process evidence
  - broad queue-cap, provider-intake, or status-dashboard redesign

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Quota hygiene audit | Parent supervision can see quota/auth/delegate signals across threads, but stale or app-managed signals can be ambiguous. | A deterministic audit should read existing evidence only and spend zero model quota. | Audit output classifies evidence and uncertainty without model calls or default mutations. | Model-backed review, default/model changes, or live queue mutation. |
| Cross-thread goals | Other threads or app-managed sessions may be visible without current authoritative state. | Unknown state is safer than fabricated completion or blockage. | Cross-thread goal status remains `unknown` unless corroborated by live artifacts or parent-approved evidence. | Importing unrelated thread state as truth. |
| App-managed delegates | App-managed delegate artifacts can look active even when no repo-local child manifest exists. | Delegate/quota blockers need corroboration from current run, process, manifest, or parent evidence. | Report app-managed delegate false positives as uncorroborated unless evidence proves active ownership. | Treating every app-managed delegate row as a real blocker. |
| Stale provider-intake claims | `provider-intake-state.json` can retain old accepted/released rows after live state changes. | Live WIP requires live worker/run/Linear/control-host proof. | Stale provider-intake claims do not count as live WIP without live evidence. | Provider-intake rewrite or manual state-file cleanup. |

## Not Done If
- The audit spends model quota, launches model-backed review, or depends on an agent call to produce normal output.
- The audit mutates defaults, model picker settings, provider caps, queue state, or persisted issue state.
- Unknown cross-thread goals are reported as clean, blocked, done, or active from stale memory or uncorroborated app state.
- App-managed delegate entries are treated as real active delegate/quota blockers without corroborating current evidence.
- Stale `provider-intake-state.json` claims are counted as live WIP without live worker, run manifest, Linear, or control-host proof.
- The implementation hides ambiguity instead of reporting the evidence class and uncertainty.

## Goals
- Define a zero-model deterministic quota hygiene audit contract.
- Preserve read-only behavior and no default mutations.
- Make unknown cross-thread and app-managed delegate evidence explicit instead of authoritative by default.
- Require live evidence before stale provider-intake claims affect WIP/quota conclusions.
- Prepare parent implementation and focused tests without widening into queue-policy changes.

## Non-Goals
- No implementation or test edits in this child lane.
- No Linear/GitHub mutation from this child lane.
- No model/default-setting changes.
- No provider-intake rewrite, queue-cap redesign, or manual state-file repair.
- No classification of unrelated cross-thread work without current evidence.

## Stakeholders
- Product: CO operators supervising quota-limited provider-worker lanes.
- Engineering: control-host, provider-intake, quota/status, and delegation maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - audit runs without model calls
  - report output is deterministic across repeated reads of the same inputs
  - report distinguishes confirmed, uncorroborated, stale, and unknown evidence
  - stale provider-intake rows cannot inflate live WIP without corroboration
- Guardrails / Error Budgets:
  - zero default mutations
  - zero model-backed audit calls
  - zero manual provider-intake edits
  - fail-closed uncertainty for unavailable evidence

## Technical Considerations
- Architectural Notes:
  - Parent implementation should prefer existing local artifacts and structured readers over ad hoc log parsing where structured state exists.
  - Any report schema should preserve evidence provenance, source timestamp, and classification reason so parent operators can route blockers without guessing.
  - Stale provider-intake evidence may be retained for audit history, but cannot become live WIP without live corroboration.
- Dependencies / Integrations:
  - local Codex config/default posture reads
  - control-host status/co-status artifacts
  - provider-intake persisted state
  - run manifests and child-lane/delegate artifacts
  - optional parent-provided Linear/GitHub evidence, read by parent-owned lanes only

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- `remove fallback`: stale provider-intake or app-managed delegate artifacts must not be accepted as live quota/WIP blockers without corroboration.
- `justify retaining fallback`: `unknown` remains a durable state for cross-thread goals when current evidence is missing.
- Large-refactor check: a broad provider-intake/status rewrite is not required for this lane if parent implementation adds a deterministic audit/report path that reads existing evidence and classifies it without changing the underlying authorities.
- Minor-seam decision: acceptable because the audit is read-only and does not add a competing source of authority; it only labels source evidence and uncertainty.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale provider-intake WIP inference | Cached provider-intake rows can look like active WIP after live state changed. | `remove fallback` | CO-542 | Audit sees provider-intake row without live worker/run/Linear/control-host proof. | Existing provider-intake retained-history behavior | 2026-05-17 | This issue | Audit classifies the row as stale or uncorroborated instead of live WIP. | Focused deterministic fixture for stale provider-intake claim. |
| App-managed delegate visibility | App-managed delegate state can look like repo-local active child/delegate ownership. | `remove fallback` | CO-542 | Delegate row lacks current run/process/manifest or parent corroboration. | Existing app-managed delegate visibility | 2026-05-17 | This issue | Audit reports uncorroborated app-managed delegate evidence and avoids quota-blocker escalation. | Focused deterministic fixture for false-positive delegate signal. |
| Cross-thread goal status | Remote or app-managed thread goal state may be missing or stale. | `justify retaining fallback` | Parent CO supervision | Current authoritative evidence is unavailable. | Existing parent-session supervision behavior | 2026-05-17 | Durable uncertainty contract | A live source or parent-approved artifact proves a concrete status. | Report schema preserves `unknown` and evidence reason. |

- Contract name: quota hygiene deterministic evidence classification.
- Owning surface: parent CO supervision / quota hygiene audit.
- Steady-state proof: report output keeps uncorroborated and unknown states separate from confirmed quota blockers.
- Tests/docs: CO-542 docs packet plus future focused deterministic fixtures.
- Non-expiring rationale: uncertainty preservation is a safety contract for cross-thread orchestration; removal requires a stronger live evidence source.

## Open Questions
- Which parent-owned command name and output schema should expose the audit.
- Which existing artifacts are authoritative enough for app-managed delegate corroboration without requiring Linear/GitHub reads.
- Whether quota/auth and WIP/delegate findings should be one report or separate sections under a single quota hygiene command.

## Approvals
- Product: parent-provided CO-542 issue wording.
- Engineering: child-lane docs-first packet on 2026-05-17.
- Design: N/A.
