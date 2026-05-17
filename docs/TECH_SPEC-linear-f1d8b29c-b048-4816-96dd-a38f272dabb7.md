---
id: 20260416-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7
title: CO: Canary Codex 0.121 app-server event contracts before replacing provider JSONL/session-log truth
relates_to: docs/PRD-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md
risk: high
owners:
  - Codex
last_review: 2026-04-16
---

## References
- PRD: `docs/PRD-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- Canonical spec: `tasks/specs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- Checklist: `tasks/tasks-linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md`
- Evidence finding: `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`

## Issue Contract
- User request: canary Codex CLI `0.121.0` app-server contracts and map them to CO provider truth before any replacement or de-prioritization of JSONL/session-log evidence.
- Protected terms: `app-server`, `realtime`, `account/rateLimits/updated`, `item/autoApprovalReview/started`, `thread/realtime/transcript/delta`, `mcpServer/tool/call`, `thread/inject_items`, `instructionSources`, `provider-linear-worker-proof.json`, `provider-linear-worker-session-log-hydration.json`, stdout JSONL, session logs.
- Non-goals: no app-server remote-control adoption, no authority expansion, no fallback removal, no precedence change.
- Issue-quality review: parent review confirmed a parity/alignment lane with required exact-surface naming and a hold decision if evidence is incomplete.

## Functional Requirements
1. Confirm release provenance:
   - npm package version `0.121.0`
   - npm tarball and integrity
   - npm publish timestamp
   - GitHub stable tag `rust-v0.121.0`
   - platform binary reports `codex-cli 0.121.0`
2. Capture app-server event/API/schema evidence for:
   - account/rate-limit notifications
   - Guardian review notifications/statuses
   - realtime transcript delta/done
   - MCP app tool calls and dynamic tool calls
   - thread/turn injection and control
   - instruction-source fields
3. Run app-server smoke/canary:
   - stdio `initialize`
   - isolated temp `CODEX_HOME`
   - `account/rateLimits/read` auth-gated result
   - ephemeral `thread/start`
   - `thread/inject_items`
   - redacted observed notification method names
4. Compare those fields against provider proof:
   - `latest_session_id`, `latest_turn_id`, `turn_count`
   - `last_event`, `last_message`, `last_event_at`
   - `current_turn_activity`
   - `tokens`, `rate_limits`
   - `owner_phase`, `owner_status`, `pid`, `worker_host`
   - `linear_audit`, `child_streams`, `child_lanes`, `parallelization`
   - `resident_session`, `progress`, `workspace_path`, `source_setup`
5. Record an explicit replacement decision.

## Implementation Notes
- Generated app-server schema evidence is protocol evidence; runtime observations prove only the smoke paths exercised.
- `rawResponseItem/completed` notifications can include prompt or instruction text. Commit only method names and redacted field summaries.
- Guardian automatic approval review schemas are marked unstable in generated comments. Treat them as non-authoritative for provider replacement.
- Runtime canary uses temp `CODEX_HOME` for auth isolation and records the expected auth-gated account/rate-limit read failure.
- No CO runtime source changes are required for the current hold decision.

## Data / Interfaces
- Codex app-server CLI:
  - `codex app-server generate-ts --experimental --out <tmp>`
  - `codex app-server generate-json-schema --experimental --out <tmp>`
  - `codex app-server --listen stdio://`
  - `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/appserver-smoke-rework-20260416.json`
- Provider files:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `packages/shared/manifest/types.ts`
- Evidence files:
  - `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`
  - `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-source-evidence-rework/cli/2026-04-16T11-30-38-094Z-926472c7/manifest.json`

## Acceptance Criteria
1. Stable release provenance is captured.
2. Issue-named schema/event classes are captured.
3. Local app-server smoke plus runtime canary are recorded.
4. Provider parity matrix is complete enough to justify hold/go.
5. JSONL/session logs stay authoritative if any provider proof field lacks app-server parity.
6. Validation and review handoff record the hold decision.

## Validation Plan
- `git diff --check`
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- `node scripts/runtime-mode-canary.mjs`
- `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`
- `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`
- manifest-backed standalone review
- explicit elegance/minimality pass
