# CO-198 Codex 0.121 App-Server Contract Canary

## Traceability
- Linear issue: `CO-198` / `f1d8b29c-b048-4816-96dd-a38f272dabb7`
- Rework parent manifest: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-16T11-26-54-445Z-ce65b23d/manifest.json`
- Rework child lane manifest: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-source-evidence-rework/cli/2026-04-16T11-30-38-094Z-926472c7/manifest.json`
- App-server smoke artifact: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/appserver-smoke-rework-20260416.json`
- Parent canary date: `2026-04-16`
- Rework reset evidence: old PR `#491` closed; previous workpad `2242584f-27ff-4ae0-ac8c-a2973d401009` deleted; new workpad `817c4ebb-b0e9-484f-b4e8-4bc22fdda76c` created.

## Release Evidence
- `npm view @openai/codex@0.121.0 version ... --json` returned `version: 0.121.0`.
- `npm view @openai/codex time --json | jq -r '."0.121.0"'` returned `2026-04-15T20:46:45.517Z`.
- npm tarball: `https://registry.npmjs.org/@openai/codex/-/codex-0.121.0.tgz`.
- npm integrity: `sha512-kCJ2NeATd4QBQRmqV04ymdN1ZU3MSwnJQDm/KzjpuzGvCuUVEn7no/T2mRyxQ2x77AACqriNOyPPoM/yufyvNg==`.
- npm shasum: `4916f6a6239339c97d74e42dc6bb034e05a72e7e`.
- `dist-tags.latest` was `0.121.0` at the 2026-04-16 refresh time; `time.modified` was `2026-04-15T21:54:16.186Z`.
- GitHub tag lookup found stable tag `refs/tags/rust-v0.121.0` and peeled commit `d65ed92a5e440972626965d0af9a6345179783bc`.
- Extracted platform binary reported `codex-cli 0.121.0`.

## App-Server Surface Evidence
Generated protocol evidence came from fresh 2026-04-16 runs of `codex app-server generate-ts --experimental --out <tmp>` and `codex app-server generate-json-schema --experimental --out <tmp>` using the local `codex-cli 0.121.0` binary. Temporary generated directories were used for inspection and not committed.

| Event class | Methods / schemas | Key fields |
| --- | --- | --- |
| Account and rate limits | `account/read`, `account/rateLimits/read`, `account/updated`, `account/rateLimits/updated`, `AccountRateLimitsUpdatedNotification`, `RateLimitSnapshot` | `limitId`, `limitName`, `primary`, `secondary`, `credits`, `planType`, `usedPercent`, `windowDurationMins`, `resetsAt` |
| Guardian review | `item/autoApprovalReview/started`, `item/autoApprovalReview/completed`, `ItemGuardianApprovalReviewStartedNotification`, `ItemGuardianApprovalReviewCompletedNotification` | `threadId`, `turnId`, `reviewId`, `targetItemId`, `review`, `action`, `decisionSource`; statuses `inProgress`, `approved`, `denied`, `timedOut`, `aborted` |
| Realtime transcript | `thread/realtime/transcript/delta`, `thread/realtime/transcript/done` | delta: `threadId`, `role`, `delta`; done: `threadId`, `role`, `text` |
| MCP and app tools | `mcpServer/tool/call`, `item/tool/call`, `item/mcpToolCall/progress`, `app/list`, `app/list/updated` | MCP call: `threadId`, `server`, `tool`, `arguments`, `_meta`; dynamic call: `threadId`, `turnId`, `callId`, `tool`, `arguments` |
| Thread and turn injection | `thread/start`, `thread/resume`, `thread/fork`, `thread/read`, `thread/inject_items`, `turn/start`, `turn/steer`, `turn/interrupt` | `threadId`, raw Responses API `items`, `input`, `responsesapiClientMetadata`, cwd, approval/sandbox/model fields |
| Instruction source | `ThreadStartResponse`, `ThreadResumeResponse`, `ThreadForkResponse`, `Thread` | `instructionSources`, `source`, `model`, `modelProvider`, `serviceTier`, `cwd`, `approvalPolicy`, `sandbox`, `reasoningEffort` |

## Runtime Canary Summary
- Stdio initialize smoke with a temporary `CODEX_HOME` returned a JSON-RPC result containing `userAgent`, `codexHome`, `platformFamily`, and `platformOs`; stderr was empty, and the server exited cleanly after `SIGTERM`.
- Isolated runtime canary used a temp `CODEX_HOME`, so account data was not exposed.
- `account/rateLimits/read` returned JSON-RPC error `-32600` with message `codex account authentication required to read rate limits`; this proves the method exists but is auth-gated in isolated mode.
- Ephemeral `thread/start` succeeded and returned a nested thread id, idle status, model/provider metadata, sandbox/approval settings, and `instructionSources`, including the workspace `AGENTS.md`.
- `thread/inject_items` succeeded with an empty result after injecting a synthetic user item.
- `thread/read` with `includeTurns` failed for the ephemeral thread, with `ephemeral threads do not support includeTurns`; this is a canary limitation, not a provider replacement proof.
- Observed notification method names included `thread/started`.
- Raw `rawResponseItem/completed` payloads were not committed because they included prompt/instruction content.

## Newer-Version Policy Canary Gates

- `MCP_RUNNER_TASK_ID=linear-f1d8b29c-b048-4816-96dd-a38f272dabb7 node scripts/runtime-mode-canary.mjs` passed on `2026-04-16T11:40:44.487Z` with `20/20` iterations passing for default mode, app-server success, forced fallback, and unsupported-combo checks. Summary artifact: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/runtime-canary-summary.json`.
- Required cloud contract command remains `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`. Local provider-worker execution with `CODEX_CLOUD_CANARY_REQUIRED=1` failed closed before cloud execution because `CODEX_CLOUD_ENV_ID` is missing. This is a configuration blocker, not provider parity proof.
- Fallback contract command remains `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`. Local provider-worker execution with `CLOUD_CANARY_EXPECT_FALLBACK=1` captured fallback manifest `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-16T11-48-13-664Z-46aaeae4/manifest.json` and run summary `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/cli/2026-04-16T11-48-13-664Z-46aaeae4/run-summary.json`; the wrapper still exited failed in required mode with failure class `configuration` because `CODEX_CLOUD_ENV_ID` is absent. Step summaries: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/cloud-canary-required-rework/step-summary.md`, `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/cloud-canary-fallback-rework/step-summary.md`.
- Hold: cloud promotion evidence is incomplete in this workspace. JSONL/session logs remain authoritative, and no provider precedence or replacement change is allowed until the required cloud environment is available and the cloud/fallback contract gates pass.

## Provider Parity Matrix

| CO provider proof field / behavior | Current authoritative source | App-server 0.121 evidence | Parity result |
| --- | --- | --- | --- |
| `thread_id`, `latest_turn_id`, `latest_session_id`, `turn_count` | stdout JSONL and session-log hydration into `provider-linear-worker-proof.json` | Thread APIs expose `threadId`; turn APIs expose turn state. Runtime smoke proved thread creation only. | Partial. Needs provider run binding and turn/session provenance. |
| `last_event`, `last_message`, `last_event_at` | stdout JSONL `event_msg`, `response_item`, JSON-RPC methods, and session-log hydration | Realtime transcript and item notifications can emit text-like events. Runtime observed only method names. | Partial. No source ranking or provider semantic summary parity. |
| `current_turn_activity` | canonical stdout JSONL or canonical session-log hydration with event, message/payload, recorded_at, source, turn_id, session_id | App-server notifications can carry thread/turn ids for some methods. | Missing provider parity. No proof source labels matching `canonical_stdout_jsonl` or `canonical_session_log_hydration`. |
| `tokens` | provider stdout/session usage extraction | Generated methods include `thread/tokenUsage/updated`; not exercised in runtime canary. | Partial and unproven. |
| `rate_limits` | provider stdout/session extraction and proof snapshot | Account/rate-limit schemas exist; isolated read is auth-gated. | Partial. Cannot replace current proof without authenticated runtime evidence and per-provider binding. |
| `pid`, `worker_host`, `owner_phase`, `owner_status` | provider worker proof and local process/workspace ownership | No app-server schema carries these provider worker fields. | Missing. |
| `linear_audit`, `child_streams`, `child_lanes`, `parallelization` | provider Linear audit JSONL and provider child ledgers | App-server tool-call schemas do not encode Linear mutation audit or same-issue child-lane decisions. | Missing. |
| `resident_session`, `source_setup`, `workspace_path`, `progress` | provider proof, manifests, issue source setup, semantic progress projection | Thread responses expose cwd and instruction sources, but not provider issue/source setup or resident-session state. | Missing or partial. |
| CO STATUS provider debug ranking | `providerIssueObservability` ranks canonical stdout JSONL above session-log hydration and legacy proof fallback | No app-server evidence includes the same ranking/source contract. | Missing. |

## Decision
Hold. Codex CLI `0.121.0` app-server provides useful generated schemas and local runtime smoke evidence for several overlapping event classes, but it does not cover the provider-specific proof envelope. JSONL/session logs remain authoritative for CO provider truth, and this issue makes no replacement, de-prioritization, or precedence change.

## Commands Used
- `npm view @openai/codex@0.121.0 version dist.tarball dist.integrity dist.shasum time.modified dist-tags.latest --json`
- `npm view @openai/codex time --json | jq -r '."0.121.0"'`
- `git ls-remote --tags https://github.com/openai/codex.git '*0.121.0*'`
- `<extracted codex 0.121.0 binary> --version`
- `<extracted codex 0.121.0 binary> app-server --help`
- `<extracted codex 0.121.0 binary> app-server generate-ts --experimental --out <tmp>`
- `<extracted codex 0.121.0 binary> app-server generate-json-schema --experimental --out <tmp>`
- local Node JSON-RPC stdio app-server initialize smoke
- isolated temp-`CODEX_HOME` app-server canary for `account/rateLimits/read`, `thread/start`, `thread/inject_items`, and redacted notification method capture
