# PRD: Coordinator Symphony-Aligned Control Server Lifecycle Boundary Freeze Reassessment

## Summary

After `1234` extracted the owned runtime publication and close boundary, the remaining control-server lifecycle chain appears to be partitioned into stable helper ownership rather than another truthful extraction seam.

## Problem

The remaining lifecycle files still sit adjacent to each other:

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/controlServerReadyInstanceLifecycle.ts`
- `orchestrator/src/cli/control/controlServerOwnedRuntimeLifecycle.ts`
- `orchestrator/src/cli/control/controlServerReadyInstanceStartup.ts`
- `orchestrator/src/cli/control/controlServerStartupSequence.ts`
- `orchestrator/src/cli/control/controlBootstrapAssembly.ts`
- `orchestrator/src/cli/control/controlServerBootstrapStartSequence.ts`

But adjacency alone is no longer evidence of a real remaining boundary. After `1234`, public lifecycle, ready-instance startup, owned runtime, bootstrap assembly, startup sequence, and bootstrap start sequence each look like narrow authority owners. Before opening another implementation lane, we need to confirm whether anything truthful remains here or whether the correct result is an explicit freeze / no-op reassessment.

## Goal

Reassess the remaining control-server lifecycle pocket after `1234` and record whether there is any concrete next implementation seam, or whether the lifecycle boundary should now freeze as already Symphony-aligned.

## Non-Goals

- forcing another helper split for symmetry
- reopening request/action dispatch, Telegram, Linear, or oversight controller families
- changing lifecycle behavior during a reassessment lane
- treating wrapper adjacency as sufficient proof of another extraction

## Success Criteria

- docs-first artifacts capture the post-`1234` lifecycle freeze reassessment boundary
- the lane identifies either:
  - an exact next truthful implementation seam, or
  - an explicit no-op freeze with concrete reasons
- the reassessment keeps startup/close sequencing risk explicit while preferring no-op over fake abstraction
