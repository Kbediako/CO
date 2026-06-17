---
id: 20260424-linear-267f73e1-6347-496d-ad78-2f4177bfe450
title: CO-351 Codex CLI 0.125.0 App-Server Control Seam Validation
status: in_progress
owner: Codex
created: 2026-04-24
last_review: 2026-06-17
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-267f73e1-6347-496d-ad78-2f4177bfe450.md
related_action_plan: docs/ACTION_PLAN-linear-267f73e1-6347-496d-ad78-2f4177bfe450.md
related_tasks:
  - tasks/tasks-linear-267f73e1-6347-496d-ad78-2f4177bfe450.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-04-24: Issue-quality review approves CO-351 as a docs-first, canary-driven Codex CLI 0.125.0 app-server control seam validation lane. It is not a release-note summary, implementation lane, or immediate adoption decision.
  - 2026-04-24: Docs child lane created the initial packet from the parent-provided protected terms; parent reconciled the source anchor to `ctx:sha256:57e3788049ac55221b4dd437196096c5dd036790ab40746609e075f7b776202f#chunk:c000001`.
  - 2026-04-24: Parent canary evidence adopts bounded app-server control-host/proof usage because schema, Unix socket/proxy, permission profile, untrusted config, synthetic resume/fork metadata, and WebSocket burst checks passed; provider-supervision fallback and provider-runtime hold remain because sticky environments and real turn-backed pagination remain unproven in the worker canary and normal 0.125 promotion gates have not passed.
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context
CO-351 exists to validate whether Codex CLI 0.125.0 exposes an app-server control seam that CO can safely use. Current CO provider-worker posture keeps `codex exec / codex exec resume` as the rollback supervision path while guarded 0.125 app-server usage is adopted only for explicit control-host/proof surfaces that prove authority, permission, thread/config, pagination, and transport behavior. The packet must make canary evidence and the final adoption-boundary decision mandatory; release-note summarization is not enough.

## Requirements
1. Preserve the exact issue terms: Codex CLI 0.125.0, app-server control seam, `codex app-server --listen unix://...`, `app-server proxy --sock`, schema generation, remote thread store/config, sticky environments, resume/fork pagination, permission-profile round-trip, explicit untrusted project config, bursty WebSocket tool-output handling, `codex exec / codex exec resume`, and official-doc/local-help mismatch for unix://.
2. Keep the child lane docs-only and inside the declared file scope.
3. Register this canonical task spec in `tasks/index.json` under `items[]`.
4. Require parent-owned canaries for all candidate app-server surfaces before any adoption decision.
5. Require a parent-owned adoption-boundary decision that explicitly states whether CO keeps `codex exec / codex exec resume` as fallback, adopts a 0.125 app-server seam with documented boundaries, or both.
6. Reject release-note-only acceptance.
7. Leave canary execution, version-policy edits, findings docs, validation, review, PR handoff, Linear state, and workpad mutation to the parent lane.
8. Parent adoption decision must not remove provider-supervision fallback unless sticky environment and real turn-backed pagination evidence is clean in a configured lane.

## Issue-Shaping Contract
Protected terms: `CO-351`, `linear-267f73e1-6347-496d-ad78-2f4177bfe450`, Codex CLI 0.125.0, app-server control seam, `codex app-server --listen unix://...`, `app-server proxy --sock`, schema generation, remote thread store/config, sticky environments, resume/fork pagination, permission-profile round-trip, explicit untrusted project config, bursty WebSocket tool-output handling, `codex exec / codex exec resume`, official-doc/local-help mismatch for unix://.

Wrong interpretations rejected: treating CO-351 as release-note summarization, blanket-promoting Codex CLI `0.125.0`, removing `codex exec / codex exec resume` fallback before canary evidence, assuming `unix://` behavior from docs or local help alone, using this child lane to edit code or policy, and broadening into full app-server migration.

Explicit non-goals carried forward: no provider-supervision fallback removal, no blind promotion of Codex CLI `0.125.0`, no implementation rewrite, and no broad app-server migration in this issue.

## Parity / Alignment Matrix
- Current truth: CO's trusted provider-worker fallback path is still `codex exec / codex exec resume`; 0.125 app-server is adopted only for explicit control-host/proof surfaces proven by canaries.
- Reference truth: parent scope identifies Codex CLI `0.125.0` app-server surfaces to validate and requires attention to the official-doc/local-help mismatch for unix://.
- Target truth / intended delta: parent produces CO-relevant app-server canary evidence and records an adoption-boundary decision. Current target decision is bounded adoption: use the proven socket/proxy/schema/config/permission/synthetic resume-fork/WebSocket surfaces for explicit control-host/proof work while keeping provider workers on `codex exec / codex exec resume` fallback until sticky environment and real turn-backed pagination evidence is clean in a configured lane and normal 0.125 promotion gates pass.
- Explicitly out-of-scope differences: package/version-policy edits, canary output files, findings docs, runtime implementation, test changes, full validation, review, Linear/workpad state, and PR lifecycle.

## Readiness Gate
- Not done if: protected terms are missing; the parity matrix omits current/reference/target truth; `unix://` mismatch is omitted; acceptance is release-note-only; parent canaries are optional; or this child lane changes non-doc surfaces.
- Pre-implementation issue-quality review evidence: self-reviewed as sufficiently bounded for a docs packet. Exact protected terms and non-goals reduce ambiguity; parent can widen later if canary implementation requires a new ownership split.
- Safeguard ownership split: child lane owns this docs-first packet only. Parent owns all executable validation and lifecycle state.

## Technical Requirements
- Functional requirements:
  - Create the PRD, docs TECH_SPEC, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
  - Update `tasks/index.json` and `docs/TASKS.md`.
  - Include wrong interpretations, non-goals, Not Done If, and current/reference/target parity.
  - Make canary-driven adoption-boundary acceptance mandatory.
- Non-functional requirements: preserve exact names, anchor claims in the reconciled source/canary artifacts, and keep authority/security boundaries explicit.
- Interfaces / contracts:
  - `codex app-server --listen unix://...`
  - `app-server proxy --sock`
  - schema generation
  - remote thread store/config
  - sticky environments
  - resume/fork pagination
  - permission-profile round-trip
  - explicit untrusted project config
  - bursty WebSocket tool-output handling
  - `codex exec / codex exec resume`
  - official docs and local help for `unix://`

## Architecture & Data
- Architecture / design adjustments: none in this child lane.
- Data model changes / migrations: none.
- External dependencies / integrations: parent-owned local Codex CLI `0.125.0` install, official docs lookup, and app-server canary harnesses.

## Validation Plan
- Child-lane checks:
  - targeted protected-term scan over touched files
  - `tasks/index.json` parse check
  - scoped `git diff --check --`
- Parent-lane canaries:
  1. `codex app-server --listen unix://...` startup/help behavior and official-doc/local-help mismatch for unix://.
  2. `app-server proxy --sock` connection and authority behavior.
  3. Schema generation output compatibility.
  4. Remote thread store/config persistence and failure behavior.
  5. Sticky environments behavior.
  6. Resume/fork pagination behavior.
  7. Permission-profile round-trip behavior.
  8. Explicit untrusted project config behavior.
  9. Bursty WebSocket tool-output handling.
  10. `codex exec / codex exec resume` fallback comparison.
- Rollout verification: parent records adoption-boundary decision and evidence paths before any version-policy or runtime-seam adoption claim. Current evidence path is `out/linear-267f73e1-6347-496d-ad78-2f4177bfe450/manual/codex-0125-appserver-canary/runtime-canary-summary.json`.
- Monitoring / alerts: none in this docs child lane.

## Open Questions
- Does `codex app-server --listen unix://...` work locally in Codex CLI `0.125.0`, and does official documentation agree with local help?
- Are remote thread store/config and sticky environments enough for CO's provider-worker continuity expectations, or only for exploratory app-server operation?
- Which configured lane should prove sticky environments and real turn-backed pagination before provider-supervision fallback constraints are relaxed?

## Approvals
- Reviewer: docs child lane self-review complete; parent docs-review reran after current-main reconciliation and passed with `review_outcome=clean-success` at `.runs/linear-267f73e1-6347-496d-ad78-2f4177bfe450-docs-review/cli/2026-04-24T21-41-26-157Z-b91030b3/review/telemetry.json`.
- Date: 2026-04-24
