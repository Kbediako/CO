# Findings: 1183 Orchestrator Cloud Route Fallback Contract Extraction Deliberation

## Decision

- Proceed with a bounded `1183` lane for the remaining cloud-route fallback contract cluster inside `orchestratorCloudRouteShell.ts`.

## Why This Slice

- `1182` removed the local-route shell, leaving the cloud-route fallback policy and contract shaping as the next dense routing surface.
- The inline fallback cluster is cohesive: it interprets fallback policy, shapes fail-fast versus fallback behavior, and assembles the reroute payload.
- This is smaller and more truthful than reopening router-local branch selection, successful cloud dispatch wiring, or broader executor lifecycle behavior.

## In Scope

- cloud fallback allow/deny policy parsing
- preflight-failure contract shaping
- fallback reroute payload assembly for the fallback-to-`mcp` path
- focused regressions for fail-fast behavior, fallback contract shaping, and reroute payload assembly

## Out of Scope

- successful cloud preflight dispatch wiring
- cloud preflight request assembly
- router-local route-state resolution and branch selection
- local-route shell extracted in `1182`
- broader cloud target executor lifecycle behavior

## Review Posture

- Local read-only review approves this as the next truthful seam after `1182`.
- The lane stays aligned with the Symphony shape by carving pure fallback policy and contract shaping out of the cloud-route shell without reopening router or executor ownership.
