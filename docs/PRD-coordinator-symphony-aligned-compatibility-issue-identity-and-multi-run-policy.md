# PRD - Coordinator Symphony-Aligned Compatibility Issue Identity and Multi-Run Policy

## Problem

`1034` moved the Symphony-aligned compatibility `state` / `issue` surface beyond a selected-manifest-only source, but the current discovery path still picks the latest readable sibling run per task and relies on opportunistic task/run aliases. As multiple runs for the same task or issue identifier accumulate, compatibility lookup becomes heuristic rather than explicitly issue-centered.

## Goal

Make the core compatibility surface deterministic when multiple runs contribute to the same issue identity:

- define issue-centered compatibility identity explicitly,
- preserve run-id lookup as a secondary alias,
- surface bounded multi-run state without moving UI/Telegram off the selected-run seam.

## User Value

- Symphony-aligned issue lookup remains stable as CO grows from “one selected run” toward “many autonomous runs”.
- Operators and downstream users get deterministic compatibility route behavior even when multiple retries or reruns exist for one task.
- CO keeps the harder current-run authority boundary while improving the read-only compatibility projection.

## Scope

- Compatibility issue identity policy for `state` / `issue` routes.
- Same-task / same-issue multi-run handling within bounded runtime discovery.
- Deterministic alias behavior for issue-id versus run-id lookup.
- Regression/manual evidence for same-issue multi-run cases.

## Non-Goals

- No scheduler ownership transfer.
- No Symphony retry/backoff orchestrator adoption.
- No UI/Telegram migration onto the compatibility collection surface.
- No new mutating control behavior.
- No live provider polling inside compatibility reads.

## Constraints

- Keep `/api/v1/dispatch` a CO-only extension seam.
- Keep `/ui/data.json`, Telegram oversight, and selected-run state current-run-only.
- Keep the change bounded to compatibility read paths and tests.
