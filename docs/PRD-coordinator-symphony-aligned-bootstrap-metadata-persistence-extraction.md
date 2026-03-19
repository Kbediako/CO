# PRD - Coordinator Symphony-Aligned Bootstrap Metadata Persistence Extraction

## Summary

After `1079`, `controlServer.ts` no longer wires the Telegram bridge bootstrap handoff inline, but `controlServerBootstrapLifecycle.ts` still combines three ordered responsibilities:
- bootstrap metadata persistence to `control-auth.json` and `control-endpoint.json`,
- expiry-lifecycle startup,
- Telegram bridge startup and subscription attachment.

This slice extracts the bootstrap metadata persistence phase into one bounded helper so the lifecycle reads more like a coordinator and less like a multi-duty implementation block.

## Problem

`controlServerBootstrapLifecycle.ts` still owns the low-level persistence details for control bootstrap metadata, including JSON payload shaping, permission tightening, and initial control snapshot flush. That block is already cohesive and independently testable, but it sits inline beside bridge startup/attach concerns.

## Goals

- Extract bootstrap metadata persistence into one dedicated helper near `controlServerBootstrapLifecycle.ts`.
- Keep `controlServerBootstrapLifecycle.ts` responsible for startup ordering and bridge attach behavior, not inline persistence mechanics.
- Preserve the existing `persist -> expiry -> bridge` ordering and all current bootstrap payloads exactly.

## Non-Goals

- Telegram bridge runtime, polling, subscription semantics, or teardown changes.
- Expiry lifecycle ownership or ordering changes.
- `controlServer.ts` bind/listen/start ownership changes.
- Authenticated/API route changes.

## User Value

- Continues the Symphony-aligned thin-coordinator shape by moving one more implementation block behind a narrow helper seam.
- Makes future hardening around bootstrap metadata writes safer without widening into bridge behavior changes.

## Acceptance Criteria

- A dedicated control-local helper owns the bootstrap metadata persistence currently implemented inline in `controlServerBootstrapLifecycle.ts`.
- `controlServerBootstrapLifecycle.ts` delegates that persistence phase while preserving the existing startup order.
- Focused regressions prove the persisted payloads, chmod behavior, and ordering contract stay unchanged.
