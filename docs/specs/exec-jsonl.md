# Exec JSONL Event Schema

The `codex-orchestrator exec` command emits structured JSONL records to stdout when `--jsonl` is enabled (default for non-interactive shells). Every line is a complete JSON object with the following envelope:

```json
{
  "type": "exec:begin",
  "timestamp": "2025-11-04T00:00:00.000Z",
  "payload": { /* event-specific */ }
}
```

- `type` – discriminates the lifecycle event.
- `timestamp` – ISO-8601 UTC timestamp produced by the orchestrator.
- `payload` – event-specific object described below.

## Event Types

### `exec:begin`

Emitted at the start of each attempt.

| Field | Type | Description |
| --- | --- | --- |
| `attempt` | number | Attempt counter starting at 1. |
| `correlationId` | string | Identifier shared across all events for the invocation. |
| `command` | string | Command name executed by the orchestrator. |
| `args` | string[] | Argument vector passed to the command. |
| `cwd` | string \| null | Working directory for the command (null when default). |
| `sessionId` | string | Exec session identifier (used for PTY reuse). |
| `sandboxState` | `sandboxed` \| `escalated` \| `failed` | Current sandbox disposition. |
| `persisted` | boolean | Whether the exec session is persisted across attempts. |

### `exec:chunk`

Streams stdout/stderr chunks.

| Field | Type | Description |
| --- | --- | --- |
| `attempt` | number | Attempt number for this chunk. |
| `correlationId` | string | Shared invocation identifier. |
| `stream` | `stdout` \| `stderr` | Destination stream. |
| `sequence` | number | 1-based sequence within the stream. |
| `bytes` | number | Raw byte length of `data`. |
| `data` | string | UTF-8 chunk data (truncated to 64 KiB per stream). |

### `exec:retry`

Produced when the sandbox policy retries an invocation.

| Field | Type | Description |
| --- | --- | --- |
| `attempt` | number | Attempt that failed. |
| `correlationId` | string | Shared invocation identifier. |
| `delayMs` | number | Backoff delay before the next attempt. |
| `sandboxState` | `sandboxed` \| `escalated` \| `failed` | Updated sandbox state. |
| `errorMessage` | string | Retry reason. |

### `exec:end`

Raised after each attempt completes (success or failure).

| Field | Type | Description |
| --- | --- | --- |
| `attempt` | number | Attempt number. |
| `correlationId` | string | Shared invocation identifier. |
| `exitCode` | number \| null | Process exit code (`null` when unknown). |
| `signal` | string \| null | Termination signal if applicable. |
| `durationMs` | number | Attempt duration. |
| `stdout` | string | Aggregated stdout buffer (64 KiB cap). |
| `stderr` | string | Aggregated stderr buffer (64 KiB cap). |
| `sandboxState` | `sandboxed` \| `escalated` \| `failed` | Sandbox disposition on exit. |
| `sessionId` | string | Exec session identifier. |
| `status` | `succeeded` \| `failed` | Attempt outcome. |

### `run:summary`

Final record summarising the run, manifest location, and aggregated metrics. Example payload fields:

| Field | Type | Description |
| --- | --- | --- |
| `status` | `succeeded` \| `failed` | Overall run outcome. |
| `run` | object | Run metadata (`id`, `taskId`, `pipelineId`, `manifest`, `artifactRoot`, `summary`). |
| `result` | object | Process outcome (`exitCode`, `signal`, `durationMs`, `status`, `sandboxState`, `correlationId`, `attempts`). |
| `command` | object | Command metadata (`argv`, `shell`, `cwd`, `sessionId`, `persisted`). |
| `outputs` | object | Aggregated stdout/stderr buffers. |
| `logs` | object | Relative paths to manifest log artifacts. |
| `toolRun` | object \| null | Captured tool run record (see manifest schema). |
| `notifications` | object | Notification targets with delivery results. |

The summary entry mirrors the content written to `.runs/<task>/cli/<run-id>/manifest.json` and should be treated as the canonical record for CI pipelines.
