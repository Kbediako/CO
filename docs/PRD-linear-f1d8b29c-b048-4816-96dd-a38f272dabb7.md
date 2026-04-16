# PRD - CO: Canary Codex 0.121 app-server event contracts before replacing provider JSONL/session-log truth

## Traceability
- Linear issue: `CO-198` / `f1d8b29c-b048-4816-96dd-a38f272dabb7`
- Linear URL: https://linear.app/asabeko/issue/CO-198/co-canary-codex-0121-app-server-event-contracts-before-replacing
- Rework parent manifest: `../../.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-16T11-26-54-445Z-ce65b23d/manifest.json`
- Rework child evidence manifest: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-source-evidence-rework/cli/2026-04-16T11-30-38-094Z-926472c7/manifest.json`
- Rework workpad: Linear comment `817c4ebb-b0e9-484f-b4e8-4bc22fdda76c`
- Fresh app-server smoke artifact: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/appserver-smoke-rework-20260416.json`
- Source anchor: `ctx:sha256:f4b2acaf1748242cc5aa60b7a330957290d9217f08351fd7123b8b4f834613da#chunk:c000001`

## Problem
Codex CLI `0.121.0` exposes experimental app-server and realtime event contracts that overlap with some data CO currently derives from provider stdout JSONL and session-log hydration. CO must not replace, de-prioritize, or weaken provider JSONL/session-log truth until the app-server contract is proven to preserve the provider proof fields used by CO STATUS, runtime diagnostics, worker ownership, and review/merge lifecycle evidence.

## Intent Checksum
Preserve these exact terms and surfaces: `Codex 0.121.0`, `app-server`, `account/rateLimits/updated`, `account/updated`, `item/autoApprovalReview/started`, `item/autoApprovalReview/completed`, `thread/realtime/transcript/delta`, `thread/realtime/transcript/done`, `mcpServer/tool/call`, `item/tool/call`, `thread/inject_items`, `turn/start`, `instructionSources`, `provider-linear-worker-proof.json`, `provider-linear-worker-session-log-hydration.json`, `provider-linear-worker-linear-audit.jsonl`, `current_turn_activity`, `last_event`, `last_message`, `rate_limits`, `tokens`, `provider_debug_snapshot`, stdout JSONL, and session logs.

Reject these interpretations:
- This issue switches provider workers to app-server remote control.
- This issue expands app-server authority or bypasses provider approval/audit boundaries.
- This issue removes stdout JSONL or session-log fallbacks.
- Generated app-server schemas alone are sufficient to replace provider truth.
- Raw app-server `rawResponseItem` payloads should be committed when they may include prompt or instruction text.

## Goals
- Confirm stable `0.121.0` release evidence, including registry, tag, package, and binary evidence.
- Capture app-server schema/event/API surfaces for account/rate-limit notifications, Guardian review notifications/statuses, realtime transcript delta/done, MCP/app tool calls, thread/turn injection, and instruction-source fields.
- Run a local app-server smoke and runtime canary without committing raw prompt-bearing payloads.
- Preserve the `Rework` reset evidence: old PR `#491` closed, previous workpad deleted, and fresh branch based on current `origin/main`.
- Produce a parity matrix from app-server surfaces to the CO provider proof fields currently sourced from stdout JSONL and session-log hydration.
- Make a concrete replacement decision: hold unless provider truth loss is ruled out.

## Non-Goals
- Switching provider workers to app-server remote control.
- Authority expansion.
- Removing JSONL/session-log fallbacks.
- Changing provider precedence, CO STATUS ranking, or control-host runtime behavior.
- Adding app connector behavior tests beyond the protocol surface canary.

## Parity Matrix

| Event class | App-server reference truth | Current CO provider truth | Target decision |
| --- | --- | --- | --- |
| Account and rate limits | `account/updated`, `account/rateLimits/updated`, `account/rateLimits/read`; `RateLimitSnapshot` includes `limitId`, `limitName`, `primary`, `secondary`, `credits`, `planType`. | Provider proof stores `rate_limits` and token metadata hydrated from stdout JSONL/session logs; current provider status surfaces do not rely on app-server account auth. | Partial supplement only. Runtime read is auth-gated in isolated smoke; no precedence change. |
| Guardian review | `item/autoApprovalReview/started`, `item/autoApprovalReview/completed`; generated comments mark the payload unstable. | Provider proof and review lifecycle depend on audit files, child lane/stream ledgers, review telemetry, PR feedback sweeps, and Linear state. | Hold. App-server Guardian payloads are useful evidence but unstable and not provider lifecycle parity. |
| Realtime transcript | `thread/realtime/transcript/delta`, `thread/realtime/transcript/done` expose `threadId`, `role`, `delta` or `text`. | Provider truth uses stdout JSONL/session-log events for `last_event`, `last_message`, `last_event_at`, `current_turn_activity`, turn/session ids, and semantic progress. | Partial supplement only. Transcript text is not enough for provider proof provenance or activity source ranking. |
| MCP/app tool calls | `mcpServer/tool/call`, `item/tool/call`, `item/mcpToolCall/progress`, `mcpToolCall` and `dynamicToolCall` thread items. | Provider proof and audit preserve MCP/delegation evidence, child-lane ownership, Linear mutation audit, and command/session provenance. | Hold. Tool-call schemas do not replace worker audit or ownership ledgers. |
| Thread/turn injection | `thread/start`, `thread/inject_items`, `turn/start`, `turn/steer`, `turn/interrupt`. Runtime canary proved `thread/start` and `thread/inject_items` work locally. | Provider proof ties runtime state to issue id, worker PID, workspace, Linear audit, resident session, parallelization decision, child lanes, latest turn/session ids, and command logs. | Partial supplement only. No replacement until app-server evidence carries the provider-specific proof envelope. |
| Instruction source | `ThreadStartResponse`, `ThreadResumeResponse`, and `ThreadForkResponse` include `instructionSources`. Runtime canary observed the workspace `AGENTS.md`. | CO provider manifests and command/session logs preserve instruction source and runtime mode evidence alongside sandbox, approval, issue, and worker metadata. | Useful supplement. Not enough by itself to replace manifest plus session-log truth. |
| Provider diagnostics | No app-server schema carries `pid`, `worker_host`, `owner_phase`, `owner_status`, `linear_audit`, `child_lanes`, `parallelization`, or control-host claim truth. | `provider-linear-worker-proof.json`, `provider-linear-worker-linear-audit.jsonl`, child ledgers, and manifests are authoritative. | No parity. JSONL/session logs remain authoritative. |

## Not Done If
- Any provider precedence change is made without a green parity matrix.
- `provider-linear-worker-proof.json` fields can no longer be derived when app-server evidence is missing or unstable.
- CO STATUS loses `current_turn_activity`, `last_event`, `last_message`, `last_event_at`, `tokens`, `rate_limits`, or `provider_debug_snapshot` richness.
- App-server raw payloads containing instructions or prompts are committed.
- The final decision fails to state whether JSONL/session logs remain authoritative.

## Acceptance Criteria
1. Stable `0.121.0` release evidence is captured from npm registry, GitHub tag, package metadata, and binary version.
2. App-server protocol schemas or observed payload summaries are captured for all event classes named in the issue.
3. A local app-server smoke and runtime canary are recorded with redacted payload policy.
4. A provider parity matrix maps each app-server event class to the current JSONL/session-log proof fields.
5. No provider truth loss is accepted before any replacement or precedence change.
6. If evidence is incomplete, the hold decision keeps stdout JSONL and session-log hydration authoritative.

## Stakeholders
- Operators relying on `CO STATUS` and provider debug snapshots.
- Maintainers of provider worker proof, control-host admission, review handoff, and merge shepherding.
- Reviewers validating Codex CLI adoption posture and app-server runtime contracts.

## Open Questions
- Should a future lane add a reproducible app-server canary harness once the protocol stabilizes beyond experimental/unstable markers?
- Should CO define a provider-proof app-server envelope before any remote-control or precedence work?
