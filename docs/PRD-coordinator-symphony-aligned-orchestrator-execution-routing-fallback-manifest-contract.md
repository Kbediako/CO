# PRD: Coordinator Symphony-Aligned Orchestrator Execution-Routing Fallback Manifest Contract

## Summary

After `1169` split the router-local policy helpers, the next truthful bounded seam is the cloud-preflight failure contract inside `orchestratorExecutionRouter.ts`: keep cloud hard-fail versus optional recursive `mcp` fallback semantics explicit while narrowing the manifest/error-note shaping into a clearer contract boundary.

## Problem

The router is thinner after `1169`, but the cloud preflight failure path still owns several tightly coupled details in one place: hard-fail status/summary shaping, fallback `cloud_fallback` shaping, appended summary/note text, and the recursive `mcp` reroute inputs. That makes it harder to reason about the exact contract without re-reading the whole route helper body.

## Goal

Extract or tighten the cloud-preflight failure contract inside `orchestratorExecutionRouter.ts` so the remaining hard-fail and isolated fallback behavior is clearer, smaller, and directly testable without widening the seam beyond the router module.

## Non-Goals

- Reopening the broader router policy split already closed in `1169`
- Changing runtime selection behavior
- Changing cloud preflight criteria or fallback policy outcomes
- Refactoring `orchestrator.ts`, lifecycle helpers, or executor bodies
- Changing the public router API

## Success Criteria

- the cloud fallback manifest/error-note contract is isolated into a smaller truthful router-local seam
- hard-fail versus fallback outcomes remain behaviorally unchanged
- recursive `mcp` fallback keeps the same runtime-mode and env-override handoff
- focused router regressions cover the fallback contract directly
