# Findings - 1145 Telegram Oversight Runtime Lifecycle Shell Extraction

## Decision

Open `1145` as the next truthful Telegram production seam after `1144`.

## Why This Slice

- The bridge already delegates update handling, command handling, projection-notification policy, state storage, transport, and inbound polling orchestration.
- The remaining unmatched Telegram responsibility is the runtime lifecycle shell in `start()` and `close()`: persisted-state bootstrap, `getMe()`, startup logging, polling-controller lifecycle wiring, and shutdown ordering.
- Extracting that lifecycle shell is smaller and more truthful than reopening config parsing or inventing another artificial micro-slice.

## Scope

- Persisted-state bootstrap during startup.
- `getMe()` and startup logging.
- Polling-controller start/abort lifecycle wiring.
- Shutdown ordering against the projection notification queue.

## Explicitly Out Of Scope

- Env/config extraction.
- Polling-controller behavior changes.
- Read, command, or push policy changes.
- Linear/runtime/provider feature work.

## Evidence

- `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/15-next-slice-note.md`
- delegated next-seam scout captured during `1144` closeout
