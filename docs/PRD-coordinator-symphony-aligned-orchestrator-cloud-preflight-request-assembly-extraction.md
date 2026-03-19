# PRD: Coordinator Symphony-Aligned Orchestrator Cloud-Preflight Request Assembly Extraction

## Summary

After `1170` isolated the cloud-preflight failure contract, the next truthful bounded seam inside `orchestratorExecutionRouter.ts` is the request-assembly cluster that prepares the `runCloudPreflight(...)` call.

## Problem

`executeCloudRoute(...)` is smaller now, but it still assembles several tightly coupled cloud-preflight inputs inline: cloud environment id resolution, branch resolution, Codex binary resolution, and the final `runCloudPreflight(...)` argument object. That leaves one remaining cloud-specific cluster mixed into the route body even though the actual hard-fail/fallback behavior should remain local.

## Goal

Extract or tighten the cloud-preflight request assembly into a smaller router-local seam so `executeCloudRoute(...)` keeps ownership of route decisions while the preflight input shaping becomes clearer and easier to review in isolation.

## Non-Goals

- changing cloud preflight criteria or fallback policy
- moving hard-fail versus fallback execution out of `executeCloudRoute(...)`
- changing `executeCloudPipeline(...)` behavior
- reopening the broader router policy split already closed in `1169`

## Success Criteria

- cloud-preflight request assembly is isolated into a smaller router-local seam
- `executeCloudRoute(...)` still owns the actual preflight call plus hard-fail/fallback handling
- focused router regressions cover the extracted preflight-request contract directly

