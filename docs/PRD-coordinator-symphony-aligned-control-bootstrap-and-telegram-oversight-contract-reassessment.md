# PRD: Coordinator Symphony-Aligned Control Bootstrap And Telegram Oversight Contract Reassessment

## Summary

After `1235` froze the remaining local control-server lifecycle pocket, the next truthful broader subsystem is the bootstrap and Telegram oversight contract around control metadata persistence, expiry startup, bridge activation, and bridge teardown.

## Problem

The control bootstrap path is already partially extracted, but the remaining coordination boundary still spans a compact multi-file contract:

- `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`
- `orchestrator/src/cli/control/controlTelegramBridgeLifecycle.ts`
- `orchestrator/src/cli/control/controlServerBootstrapStartSequence.ts`
- `orchestrator/src/cli/control/controlTelegramBridgeBootstrapLifecycle.ts`

That path owns a meaningful sequencing contract: persist control auth and endpoint metadata, start expiry tracking, then start the best-effort Telegram oversight bridge against the ready runtime context. If a future extraction is mis-scoped here, bootstrap order, bridge replacement behavior, or bridge close semantics could drift.

## Goal

Reassess the broader bootstrap and Telegram oversight contract and record whether an exact bounded implementation seam still exists there, or whether the correct result is another explicit no-op freeze.

## Non-Goals

- reopening the already-frozen control-server lifecycle wrapper family from `1235`
- widening into request/action dispatch, broader oversight policy, Linear, or runtime seed-loading families
- changing live bootstrap or Telegram bridge behavior in a docs-first reassessment lane
- treating adjacency alone as proof that another extraction must exist

## Success Criteria

- docs-first artifacts capture the broader bootstrap and Telegram oversight reassessment boundary
- the lane identifies either:
  - an exact next truthful implementation seam, or
  - an explicit no-op freeze with concrete reasons
- the reassessment keeps bootstrap-order, bridge replacement, and bridge teardown risks explicit
