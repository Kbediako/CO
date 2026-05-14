# PRD - Coordinator Symphony-Aligned Telegram Dispatch Read Adapter Extraction

## Summary

After `1076`, Telegram oversight question reads now delegate through `controlTelegramQuestionRead.ts`, but Telegram dispatch reads still assemble their remaining Telegram-local flow inline inside `controlServer.ts`:
- build the internal control context,
- read the runtime dispatch evaluation,
- emit Telegram-surface dispatch audit events,
- return the Telegram-facing dispatch payload.

This slice extracts that remaining Telegram dispatch-read adapter assembly seam so `controlServer.ts` keeps lifecycle and transport ownership while Telegram dispatch-read setup moves behind one bounded control-local helper.

## Problem

`controlServer.ts` still owns the non-trivial Telegram oversight `readDispatch()` assembly path even after the question-read seam was extracted. That leaves one more real Telegram-local control/setup seam inline in the shell and slows the path toward a Symphony-style thin controller surface.

## Goals

- Extract the remaining Telegram dispatch-read adapter assembly into one dedicated control-local helper.
- Keep `controlServer.ts` responsible for server lifecycle and read-adapter registration, not inline dispatch-read setup details.
- Preserve current dispatch evaluation, audit emission, and Telegram dispatch payload behavior exactly.

## Non-Goals

- Dispatch evaluation semantics or tracker policy changes.
- Authenticated/API route changes.
- Telegram rendering or polling changes.
- Selected-run read adapter extraction.
- Broader Telegram read-adapter/controller rewrites.

## User Value

- Moves CO one more step toward the real Symphony posture where shells consume narrow shared seams instead of owning orchestration details.
- Reduces future Telegram dispatch-read drift without broadening into larger control-surface rewrites.

## Acceptance Criteria

- A dedicated control-local helper owns Telegram dispatch-read adapter assembly.
- `controlServer.ts` delegates Telegram oversight `readDispatch()` to that helper.
- Existing dispatch evaluation, audit emission, and Telegram `/dispatch` output remain unchanged under focused regressions.
