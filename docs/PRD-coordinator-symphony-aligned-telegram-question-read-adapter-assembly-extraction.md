# PRD - Coordinator Symphony-Aligned Telegram Question-Read Adapter Assembly Extraction

## Summary

After `1075`, the shared question-read sequencing itself now lives in `questionReadSequence.ts`, but Telegram oversight question reads still assemble the remaining Telegram-local adapter flow inline inside `controlServer.ts`:
- build the internal control context,
- create the child-resolution adapter,
- run the shared question-read sequence,
- queue child resolutions,
- return the Telegram-facing payload.

This slice extracts that remaining Telegram question-read adapter assembly seam so `controlServer.ts` keeps lifecycle and transport ownership while the Telegram question-read setup moves behind one bounded control-local helper.

## Problem

`controlServer.ts` still owns the full Telegram oversight `readQuestions()` assembly path even though the sequencing core is already shared. That keeps too much Telegram/control question-read setup inside the top-level shell and leaves a real next drift seam in the server surface.

## Goals

- Extract the remaining Telegram question-read adapter assembly into one dedicated control-local helper.
- Keep `controlServer.ts` responsible for server lifecycle and read-adapter registration, not inline question-read setup details.
- Preserve `1074` and `1075` behavior exactly.

## Non-Goals

- Authenticated question queue route extraction.
- Telegram rendering or polling changes.
- Changes to runtime projections or observability payloads.
- Changes to expiry lifecycle ownership or question child-resolution semantics.

## User Value

- Moves CO one step closer to the real Symphony posture where shells consume narrow shared seams instead of owning orchestration details.
- Reduces future drift in Telegram question reads without broadening into larger controller rewrites.

## Acceptance Criteria

- A dedicated control-local helper owns Telegram question-read adapter assembly.
- `controlServer.ts` delegates Telegram oversight `readQuestions()` to that helper.
- Existing question-read behavior, child-resolution retries, and Telegram `/questions` output remain unchanged under focused regressions.
