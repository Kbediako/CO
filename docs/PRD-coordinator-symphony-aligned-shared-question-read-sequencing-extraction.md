# PRD - Coordinator Symphony-Aligned Shared Question-Read Sequencing Extraction

## Summary

After `1074`, the authenticated `GET /questions` route and the Telegram oversight `readQuestions()` surface now share the correct retry semantics, but both still assemble the same question-read sequence inline:
- snapshot pre-read question state,
- run expiry,
- list current questions,
- apply the shared retry selector.

This slice extracts that shared sequencing seam so the route/controller shells keep transport-specific ownership while autonomous question-read coordination moves behind one reusable boundary.

## Problem

The actual read-time coordination rule is now shared across two call sites, but its sequencing still lives inline in:
- `questionQueueController.ts`
- `controlServer.ts`

That duplication is now a clear drift risk: any future refinement to question-read coordination would need to be updated in both the API and Telegram paths again.

## Goals

- Extract the shared question-read sequencing seam into one dedicated control-local helper/module.
- Keep authenticated route and Telegram question reads behaviorally aligned.
- Preserve the `1074` retry semantics exactly.

## Non-Goals

- Telegram rendering or polling behavior changes.
- Broad route/controller extraction.
- Changes to expiry lifecycle ownership.
- Changes to child-resolution adapter behavior.

## User Value

- Reduces future drift in CO’s autonomous question-read coordination.
- Moves both API and Telegram surfaces closer to a hardened Symphony-like controller shape with clearer shared core behavior.

## Acceptance Criteria

- The common question-read sequencing logic is owned by one shared seam.
- `questionQueueController.ts` and the Telegram oversight read adapter delegate to that seam.
- Existing `1074` retry-deduplication behavior remains unchanged under focused regressions.
