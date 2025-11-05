## Executive Summary
The current orchestrator manages local CLI runs reliably, yet it cannot spin up or coordinate additional Codex instances, so autonomy stalls whenever a single runner is saturated. Shell-based MCP access and inline stdout logging increase latency and prevent the parent agent from supervising remote executors. The fastest path to higher performance and autonomy is (1) codifying a typed MCP control surface so the orchestrator can launch and steer sibling Codex runners, (2) adding a multi-instance scheduler plus manifest fan-out, and (3) trimming prompt payloads via handle-based streaming and privacy-safe redaction so delegation stays lightweight.

## Findings by Practice
- ❌ **1 Progressive Tool Discovery** — Pipelines embed raw commands with no typed metadata or search surfaces (`orchestrator/src/cli/pipelines/defaultDiagnostics.ts:3-31`), and command execution wires those strings directly into runs (`orchestrator/src/cli/services/commandRunner.ts:120-168`).
- ❌ **2 Code-Execution-First Tooling** — The CLI spawns shell commands with `shell: true` rather than importing MCP stubs (`orchestrator/src/cli/services/execRuntime.ts:25-58`), and there is no usage of the bundled `@modelcontextprotocol/sdk` in source to control remote Codex runners.
- ❌ **3 Data by Reference, Not by Prompt** — Exec chunk events persist the entire payload into manifests and logs (`orchestrator/src/cli/services/commandRunner.ts:200-213`; `packages/shared/manifest/types.ts:38-55`), and summaries also return full stdout/stderr (`orchestrator/src/cli/exec/command.ts:150-267`).
- ✅ **4 Control Flow in Code** — Tool retries, backoff, and sandbox promotion live in TypeScript loops (`packages/orchestrator/src/tool-orchestrator.ts:136-182`), avoiding multi-turn prompt churn.
- ❌ **5 Privacy Guard** — Raw stdout/stderr and error blobs are persisted without masking (`orchestrator/src/cli/services/commandRunner.ts:147-168`; `orchestrator/src/cli/exec/command.ts:258-267`), and no tokenization or allow-listing exists.
- ⚠️ **6 State + Skills** — Run state is checkpointed via manifests and resume tokens (`orchestrator/src/cli/run/manifest.ts:40-118`), but there is no `skills/*` library or reusable automation bundle for delegating to other Codex instances.
- ❌ **7 Security & Sandboxing** — Exec commands inherit the host env with unrestricted `shell: true` execution and no CPU/memory limits (`orchestrator/src/cli/services/execRuntime.ts:25-58`), blocking safe promotion to remote shells.
- ⚠️ **8 Observability** — Metrics capture run duration and counts only (`orchestrator/src/cli/metrics/metricsRecorder.ts:45-58`), while telemetry exports raw events without token, bytes, or cost deltas (`packages/orchestrator/src/telemetry/otel-exporter.ts:24-109`).
- ⚠️ **9 Migration Router** — The default policy merely checks `requires_cloud` before choosing `mcp` vs `cloud` (`orchestrator/src/manager.ts:41-49`); there is no workload estimator or routing branch that can decide when to offload to secondary Codex instances (`packages/sdk-node/src/orchestrator.ts:16-115`).
- ❌ **10 Prompting Nudges** — System prompts still tell agents to send natural-language `prompt` strings through `mcp-cli` (`.agent/prompts/mcp-diagnostics.md:5-13`) instead of importing stubs or returning handles.

## Prioritized Recommendations
- Stand up a typed Codex MCP control plane  
  Why it matters: Gives the orchestrator a deterministic API to launch, pause, and resume sibling Codex instances without prompt overhead, unlocking true task offloading.  
  Effort: M | Impact: High | Risk: Med  
  Owners: `packages/orchestrator/src/mcp`, `packages/sdk-node/src`  
  Acceptance Criteria: (1) Thin client wraps `@modelcontextprotocol/sdk` once and exposes `startRun`, `resumeRun`, `pollRun` helpers, (2) Typed stubs live under `packages/orchestrator/src/mcp/servers/codex/*`, (3) Manifests record which remote runners were invoked with their handles.

- Add multi-instance scheduler + manifest fan-out  
  Why it matters: Enables the parent orchestrator to queue subtasks and assign them to idle Codex workers, improving throughput and autonomy.  
  Effort: M | Impact: High | Risk: Med  
  Owners: `orchestrator/src/manager.ts`, `orchestrator/src/persistence`, `packages/sdk-node/src/orchestrator.ts`  
  Acceptance Criteria: (1) Mode policy can select from a pool of remote Codex instances based on load, (2) Child manifests are linked under `.runs/<task>/delegated/`, (3) Tests cover failure + retry of remote workers.

- Stream exec output by handle with sampled previews  
  Why it matters: Remote workers should send back handles and stats rather than megabytes of stdout, cutting latency and token spend.  
  Effort: M | Impact: High | Risk: Low  
  Owners: `orchestrator/src/cli/services/commandRunner.ts`, `packages/shared/manifest`  
  Acceptance Criteria: (1) Exec events persist `handle` + sample metadata, (2) Summary payloads deliver preview arrays, (3) Vitest ensures retries reuse persisted blobs.

- Ship privacy-aware streaming guard  
  Why it matters: Delegating across instances increases exposure; deterministic tokenization keeps sensitive data inside the workspace while still enabling remote automation.  
  Effort: S | Impact: Med | Risk: Low  
  Owners: `packages/orchestrator/src/privacy`, `orchestrator/src/cli/services`  
  Acceptance Criteria: (1) Tokenizer masks emails/phones/names before persistence, (2) Remote responses untokenize only for allow-listed endpoints, (3) Unit tests cover redaction + restoration across hops.

- Instrument cross-instance performance metrics  
  Why it matters: Need visibility into queue depth, time-to-first-useful-IO, and avoided tokens to prove that delegation pays off.  
  Effort: S | Impact: Med | Risk: Low  
  Owners: `orchestrator/src/cli/metrics`, `packages/orchestrator/src/telemetry`, `packages/sdk-node/src/orchestrator.ts`  
  Acceptance Criteria: (1) Metrics capture remote queue wait, bytes transferred, and avoided tokens, (2) Manifest summary records worker selection + latency, (3) Documentation explains new counters for reviewers.

## Patch Sketches
```ts
// packages/orchestrator/src/mcp/client.ts
import { Client as MCPClient } from '@modelcontextprotocol/sdk';

const client = new MCPClient({ transport: 'stdio' });

export async function startRun(taskId: string, pipelineId: string) {
  return client.callTool('codex/start_run', { taskId, pipelineId });
}

export async function pollRun(runId: string) {
  return client.callTool('codex/poll_run', { runId });
}
```

```ts
// packages/orchestrator/src/mcp/servers/codex/startRun.ts
import { startRun } from '../../mcp/client.js';

export interface StartRunInput { taskId: string; pipelineId: string; priority?: number; }
export interface StartRunResult { runId: string; manifest: string; workerId: string; }

export async function triggerRemoteRun(input: StartRunInput): Promise<StartRunResult> {
  return startRun(input.taskId, input.pipelineId) as Promise<StartRunResult>;
}
```

```ts
// orchestrator/src/manager.ts (excerpt)
const worker = await workerPool.acquire({ task, subtask });
const remoteResult = await remoteController.start({
  workerId: worker.id,
  taskId: task.id,
  pipelineId: subtask.id
});
registerChildManifest(runSummary, remoteResult.manifest);
```

```ts
// packages/orchestrator/src/privacy/tokenization.ts
import { tokenizePII, untokenizePII } from '@openai/agents-core/privacy';

export function redactPayload<T>(payload: T): T {
  return tokenizePII(payload, { fields: ['email', 'phone', 'name'], deterministic: true }) as T;
}

export function restorePayload<T>(payload: T): T {
  return untokenizePII(payload, { allowDestinations: ['codex-local', 'codex-cloud'] }) as T;
}
```

## Telemetry Additions
- Track `metrics.observe('codex.worker_queue_ms', waitMs)` when a task waits for an available remote worker in `orchestrator/src/manager.ts`.
- Emit `metrics.observe('codex.remote_ttfu_ms', ttfu)` when the first stdout chunk arrives from a delegated run in `orchestrator/src/cli/services/commandRunner.ts`.
- Record `metrics.increment('codex.tokens_avoided', avoidedTokens)` and `metrics.observe('codex.bytes_transferred', bytes)` for handle-based streaming inside `packages/orchestrator/src/telemetry/otel-exporter.ts`.
- Log `metrics.increment('codex.worker_error', 1, { workerId })` whenever a remote run fails in `packages/sdk-node/src/orchestrator.ts`.

## Security Notes
- Apply CPU, memory, and wall-clock quotas to remote workers before granting escalations (`orchestrator/src/cli/services/execRuntime.ts`).
- Replace `shell: true` with argv-based spawn plus allow-listed binaries so delegated runners cannot run arbitrary shells on the host.
- Require signed worker descriptors and redact payloads via `redactPayload` before broadcasting manifests to remote Codex instances.

## Migration Plan
1. Implement the typed Codex MCP control plane and swap `ExecClient` to call it for new runs while keeping local spawn as fallback.
2. Introduce the worker pool + scheduler under a feature flag, delegate a single pipeline stage remotely, and validate manifests link child runs.
3. Enable handle-based streaming and privacy guard for remote results, then turn on queue + latency metrics to confirm performance wins before broad rollout.

## Open Questions
- Which Codex instances (local, cloud, or partner-hosted) should the scheduler treat as first-class workers, and how are credentials provisioned?
- What workload heuristics (task size, estimated runtime, queue depth) determine when to delegate versus execute locally?
- Do remote workers need additional capability scoping (filesystem, network) beyond the current local sandbox defaults?
