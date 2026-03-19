# Findings - 1144 Telegram Oversight Polling Controller Extraction

## Decision

Open `1144` as the next truthful Telegram production seam after `1143`.

## Why This Slice

- The bridge now already delegates lifecycle, read rendering, command handling, update handling, projection-notification policy, state storage, and transport clients.
- The remaining unmatched Telegram control-path responsibility is the inbound polling/update-offset orchestration.
- Extracting that orchestration is smaller and more truthful than reopening config parsing or another broad bridge refactor.

## Scope

- Poll loop orchestration.
- `getUpdates` timeout/offset flow.
- Per-update error isolation.
- `next_update_id` advancement and persistence flow.

## Explicitly Out Of Scope

- Env/config extraction.
- Read, command, or push policy changes.
- Bot API/control-action client changes.
- Broader runtime or Linear work.

## Evidence

- `out/1143-coordinator-symphony-aligned-telegram-oversight-state-store-extraction/manual/20260312T232532Z-closeout/15-next-slice-note.md`
- delegated next-seam scout captured during `1143` closeout
