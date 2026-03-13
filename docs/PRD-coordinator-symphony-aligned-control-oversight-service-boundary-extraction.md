# PRD: Coordinator Symphony-Aligned Control Oversight Service Boundary Extraction

## Problem

After `1146`, Telegram no longer has another equivalently small bridge-only seam. What remains is the higher-level coordinator oversight contract Telegram consumes across multiple places: selected-run reads, dispatch reads, question reads, and projection/update subscription are assembled through separate bootstrap, lifecycle, and read-helper paths instead of one coordinator-owned service boundary.

## Goal

Introduce one coordinator-owned oversight service boundary that exposes the current oversight surface Telegram needs, so Telegram bootstrap and lifecycle become consumers of a shared coordinator contract rather than stitching together runtime subscription plus multiple read helpers directly.

## Non-Goals

- New Telegram commands or bot features
- Polling/update-handler/state-store/queue refactors inside `telegramOversightBridge.ts`
- Env/config parsing changes
- A broader `controlServer` rewrite
- New Discord or Linear surface expansion
- Any authority or policy changes

## Requirements

1. One coordinator-owned oversight facade exposes the current Telegram consumer contract:
   - selected-run read
   - dispatch read
   - question read
   - projection/update subscription
2. Telegram bootstrap and lifecycle wiring consume that facade instead of separately threading `ControlRuntime`, request-shared context, expiry access, and audit closures.
3. The slice remains bounded to the current Telegram consumer surface only; it does not generalize prematurely to unrelated channels.
4. Focused coordinator and Telegram regressions cover the new facade plus the integrated consumer behavior.

## Success Criteria

- Telegram oversight bootstrap/lifecycle read as consumers of one coordinator service boundary.
- Existing Telegram runtime behavior remains unchanged.
- Focused regressions and the standard closeout gate bundle pass on the final tree.
