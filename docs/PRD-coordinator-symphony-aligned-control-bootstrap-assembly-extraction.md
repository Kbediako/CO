# PRD - Coordinator Symphony-Aligned Control Bootstrap Assembly Extraction

## Summary

After `1081`, the bootstrap collaborator seams are already isolated in dedicated helpers, but `ControlServer.start()` still assembles the expiry lifecycle plus Telegram bridge bootstrap lifecycle inline before binding the HTTP server. This slice extracts that collaborator assembly into one bounded helper so `ControlServer.start()` reads more like a thin start sequence and less like an assembly site.

## Problem

`ControlServer.start()` still mixes:
- server startup and bind/listen ownership,
- bootstrap collaborator assembly for expiry lifecycle and Telegram bridge bootstrap lifecycle,
- final bootstrap start sequencing.

That inline assembly is now the next remaining mixed concern after the earlier bootstrap lifecycle extractions.

## Goals

- Extract the remaining bootstrap collaborator assembly from `ControlServer.start()` into one helper.
- Keep the server start path responsible for bind/listen ownership and top-level failure handling, not collaborator construction details.
- Preserve the current expiry lifecycle and Telegram bridge bootstrap contracts exactly.

## Non-Goals

- Changes to `persistControlBootstrapMetadata(...)`.
- Changes to HTTP bind/listen logic in `ControlServer.start()`.
- Deep changes inside `controlExpiryLifecycle.ts`, `controlTelegramBridgeBootstrapLifecycle.ts`, or `controlTelegramBridgeLifecycle.ts`.
- Splitting expiry assembly and Telegram bridge bootstrap assembly into separate micro-helpers in this slice.

## User Value

- Continues the Symphony-aligned thin-coordinator shape by pushing one more assembly concern out of `ControlServer.start()`.
- Makes later server-start hardening easier because collaborator assembly becomes one explicit seam with a bounded contract.

## Acceptance Criteria

- One new helper owns bootstrap collaborator assembly for the expiry lifecycle plus Telegram bridge bootstrap lifecycle.
- `ControlServer.start()` delegates collaborator assembly to that helper while preserving current start behavior and error handling.
- Focused regressions prove the extracted assembly still wires the same collaborators, closures, and ordering.
