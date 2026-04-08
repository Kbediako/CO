# PRD - Coordinator Symphony-Aligned Compatibility Route Contract + Dispatch Extension Boundary

## Summary

After `1029`, `ControlRuntime` is transport-neutral and dispatch/refresh compatibility handling is controller-owned, but CO still carries a mixed compatibility route contract that does not map cleanly onto the real Symphony router/controller/presenter shape. This slice tightens that contract, makes the `/api/v1/dispatch` extension boundary explicit, and keeps the remaining Symphony-aligned observability routes closer to a controller -> presenter -> runtime flow.

## Problem

- CO still exposes `/api/v1/dispatch` as if it were part of the same compatibility route family as `/api/v1/state`, `/api/v1/refresh`, and `/api/v1/:issue_identifier`.
- Real Symphony’s observability router is state/refresh/issue centered; it does not place a dispatch route inside that core route set.
- CO’s compatibility helpers still mix controller response writing and CO-specific extension behavior in a way that makes future parity and downstream reasoning harder than necessary.

## Goals

- Normalize the remaining compatibility observability route contract around the real Symphony controller/presenter shape.
- Make `/api/v1/dispatch` an explicit CO extension boundary instead of an implicit member of the Symphony-aligned core route set.
- Preserve current authority, auth, and advisory-only behavior.
- Preserve existing client-visible payload shapes where compatibility is required.

## Non-Goals

- No broad Telegram or Linear feature redesign.
- No changes to dispatch decision policy or runtime authority boundaries.
- No full router rewrite or large module split unless a small bounded extraction proves necessary.
- No BEAM/Elixir migration work.

## Success Criteria

- The Symphony-aligned core compatibility routes (`state`, `refresh`, `issue`) have a cleaner controller/presenter contract that matches the real Symphony reference more closely.
- `/api/v1/dispatch` remains available only as an explicit CO extension path, with its separation documented in code and task docs.
- Existing refresh/state/issue behavior stays backward-compatible, including fail-closed handling and traceability.
- Tests clearly distinguish Symphony-aligned route behavior from CO-specific dispatch-extension behavior.
