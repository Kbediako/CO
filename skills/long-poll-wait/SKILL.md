---
name: long-poll-wait
description: Wait for long-running operations (including multi-hour/multi-day runs) by polling to terminal status with checkpointed updates, explicit stall/intervention policy, and patience-first continuity.
---

# Long Poll Wait

## Overview

Use this skill whenever work depends on an operation that can run for a long time:
- CI pipelines, cloud jobs, RLM loops, eval sweeps, delegated runs, release checks, and long reviews.

Primary objective:
- Keep the agent patient and reliable; do not report completion until terminal status is reached unless the user explicitly asks to stop early.

## 24/7 Patience-First Contract

- Waiting is a valid form of progress when terminal state has not been reached.
- Continue polling as long as useful evidence is still arriving.
- Do not abandon monitoring because a run is "taking too long" by wall-clock time alone.
- Stop only when one of these is true:
  - terminal state reached,
  - user explicitly asks to stop,
  - hard infrastructure failure blocks further observation.

## Required behavior

- Poll until terminal state (`completed`, `failed`, `cancelled`, `stopped`, etc.).
- Use persistent, restartable polling loops with moderate cadence (`30-180s`).
- Emit concise progress checkpoints during waiting: current status, key progress fields, and next action.
- Record timestamps and evidence paths so context survives interruptions/compaction.
- If the monitor process exits unexpectedly, relaunch monitoring from latest known run identifiers.

## Cadence policy

- Active progress: update every `30-90s`.
- Slow/noisy phases: update every `60-180s`.
- Immediate update on any state transition.

Use lower frequency only when external limits require it.

## Stall/intervention policy

- Temporary no-progress windows are normal.
- Treat as potential stall only after sustained no-progress (`>=10-20m`) with no heartbeat/log movement.
- Before intervention, collect evidence from at least two signals (status endpoint + logs/events).
- Intervene only when policy/user intent allows; log reason, timestamp, and command.
- After intervention, continue polling to a terminal result.

## Monitor loop template

```bash
# Poll every 60s until terminal state
while true; do
  ts=$(date +"%Y-%m-%d %H:%M:%S")
  status="$(your_status_cmd_here)"
  echo "[$ts] status=$status"

  case "$status" in
    completed|COMPLETED|failed|FAILED|cancelled|CANCELLED|stopped|STOPPED)
      break
      ;;
  esac

  sleep 60
done
```

## Handoff checklist

Before reporting completion:
- Include final terminal status.
- Include key evidence paths (manifest/log/artifacts).
- Note any interventions performed (or explicitly state none).
- Note residual risks if the terminal state is non-success.

## Related skills

- `delegation-usage`: monitor delegated runs and question queues until terminal status.
- `collab-subagents-first`: monitor subagent streams and close lifecycles cleanly.
- `standalone-review`: monitor deep review runs without premature timeout assumptions.
- `release`: monitor PR/release workflows until terminal outcomes.
