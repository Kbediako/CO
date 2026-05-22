# PRD: Coordinator Symphony-Parity Provider-Driven Autonomous Intake and Run Handoff

## Summary

`1302` proved provider setup and read-only advisory surfacing, but it did not close the final Symphony-parity gap: CO still cannot autonomously start working a provider-selected issue once that issue is accepted for work.

## Problem

The current tree can:
- resolve a live Linear advisory recommendation,
- surface that recommendation through `/api/v1/dispatch`,
- expose it through Telegram `/dispatch`,
- accept bounded Linear webhook ingress into advisory state.

The current tree cannot:
- keep a persistent provider-driven intake host alive when no active run exists,
- accept any provider-originated `start` action or equivalent work-intake handoff,
- claim or dedupe a Linear issue as the authoritative next unit of work,
- map an accepted Linear issue into deterministic CO `start` or `resume` behavior,
- rehydrate or reject duplicate issue events without operator intervention,
- reconcile the current single-run oversight surfaces with provider-driven autonomous intake.

That means the repo is Symphony-aligned for the wrapper/runtime seams and provider-backed advisory read path, but not yet for provider-driven autonomous issue intake and run handoff.

## Goal

Prepare the next truthful docs-first lane for the remaining parity gap:
- accepted provider input should be able to drive CO into autonomous work intake,
- CO must remain execution authority,
- any missing pieces beyond the bare ticket-to-run trigger should be included now so the implementation lane does not under-scope the final parity boundary.

## Non-Goals

- reopening completed Symphony shell extraction slices,
- broad transport expansion beyond what is required for autonomous provider-driven intake,
- handing scheduler ownership or execution authority to Linear,
- assuming issue write-back, comments, or state transitions are required in the first autonomy lane,
- pretending provider setup alone closed full Symphony parity.

## Success Criteria

- a new docs-first packet defines the smallest correct path from accepted Linear issue to autonomous CO work intake,
- the packet explicitly includes any additional missing parity requirements discovered during planning,
- persistent intake/runtime hosting, issue-to-run mapping, idempotency, replay handling, and rollback/manual override requirements are all covered,
- `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` are updated for the new lane,
- docs-first validation is green with explicit evidence and override notes.
