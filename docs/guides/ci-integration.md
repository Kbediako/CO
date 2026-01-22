# CI Integration with Codex Orchestrator Exec

This guide explains how to invoke the `codex-orchestrator exec` command in automation and how to consume the JSONL event stream either directly from the CLI or via the Node.js SDK.

## CLI Workflow

Use the `exec` command when you need a one-off command run with manifest tracking and structured output:

```bash
codex-orchestrator exec --jsonl --task 0303-orchestrator-autonomy --notify https://hooks.example.dev/build \
  --cwd /workspace/repo -- npm run lint
```

Key flags:

- `--jsonl` – streams lifecycle events (begin/chunk/retry/end) and a terminal `run:summary` record.
- `--json [compact]` – emits only the final summary JSON object (useful for scripts that do not need intermediate events).
- `--notify <uri>` – repeatable; records destinations for downstream notifications in the manifest and summary payload.
- `--otel-endpoint <url>` – forwards events to the configured OTEL exporter (telemetry module handles retries/backoff).
- `--task <id>` – overrides `MCP_RUNNER_TASK_ID`, ensuring manifests land under `.runs/<task>/cli/<run-id>/`.
- `--cwd <path>` – sets the working directory for the command itself while the CLI continues to run from the repo root.

Every invocation writes a manifest to the task-specific runs directory. The JSONL stream always ends with a summary event:

Note: if the command itself runs `codex exec --json --enable collab`, the collab JSONL lines appear on stdout inside `exec:chunk` events. The orchestrator also extracts them into `manifest.collab_tool_calls` for easier downstream consumption.

```json
{
  "type": "run:summary",
  "timestamp": "2025-11-04T02:45:12.345Z",
  "payload": {
    "status": "succeeded",
    "run": {
      "id": "2025-11-04T02-45-12-345Z-abcdef01",
      "taskId": "0303-orchestrator-autonomy",
      "pipelineId": "exec",
      "manifest": ".runs/0303-orchestrator-autonomy/cli/2025-11-04T02-45-12-345Z-abcdef01/manifest.json",
      "artifactRoot": ".runs/0303-orchestrator-autonomy/cli/2025-11-04T02-45-12-345Z-abcdef01",
      "summary": "npm run lint — exit code 0"
    },
    "result": {
      "exitCode": 0,
      "signal": null,
      "durationMs": 4123,
      "status": "succeeded",
      "sandboxState": "sandboxed",
      "correlationId": "exec-1234",
      "attempts": 1
    },
    "command": {
      "argv": ["npm", "run", "lint"],
      "shell": "npm run lint",
      "cwd": "/workspace/repo",
      "sessionId": "session-lint",
      "persisted": false
    },
    "outputs": {
      "stdout": "Lint passed\n",
      "stderr": ""
    },
    "logs": {
      "runner": ".runs/0303-orchestrator-autonomy/cli/2025-11-04T02-45-12-345Z-abcdef01/runner.ndjson",
      "command": ".runs/0303-orchestrator-autonomy/cli/2025-11-04T02-45-12-345Z-abcdef01/commands/01-exec.ndjson"
    },
    "toolRun": null,
    "notifications": {
      "targets": ["https://hooks.example.dev/build"],
      "delivered": [],
      "failures": []
    }
  }
}
```

CI systems can parse this terminal event to publish artifacts, pull the manifest, or trigger follow-up jobs.

## Node.js SDK

The Node SDK wraps the CLI to provide an event emitter and retry helpers.

```ts
import { ExecClient } from '../packages/sdk-node/src/orchestrator.js';

const client = new ExecClient({ cliPath: 'codex-orchestrator' });

const run = client.run({
  command: 'npm',
  args: ['run', 'test'],
  taskId: '0303-orchestrator-autonomy',
  notify: ['https://hooks.example.dev/tests']
});

run.on('event', (event) => {
  if (event.type === 'exec:chunk' && event.payload.stream === 'stderr') {
    process.stderr.write(event.payload.data);
  }
});

run.on('summary', (summary) => {
  console.log('Manifest:', summary.payload.run.manifest);
});

const result = await run.result;
console.log(`Status: ${result.status}, exit code ${result.exitCode}`);

if (result.status === 'failed') {
  await run.retry({ taskId: '0303-orchestrator-autonomy-retry' }).result;
}
```

Notable behaviors:

- `run.result` resolves to the parsed summary payload plus all intermediate events.
- `run.retry(overrides)` reruns the same command (optionally overriding flags like `taskId` or `notify`).

This combination allows CI jobs to trigger a command, stream logs for real-time visibility, and deterministically resume or retry using the manifest evidence captured by the CLI.
