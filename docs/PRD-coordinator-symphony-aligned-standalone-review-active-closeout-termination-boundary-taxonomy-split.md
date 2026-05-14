# PRD - Coordinator Symphony-Aligned Standalone Review Active-Closeout Termination Boundary Taxonomy Split

## Summary

`1132` closed the last obvious contract-parity seam by promoting shell-probe failures into the first-class standalone-review `termination_boundary` surface. The next truthful seam is not “active-closeout parity” as a single family. Active-closeout is currently split across two different behaviors:
- broad self-reference / closeout-surface searching already terminates as meta-surface expansion
- post-anchor active-closeout bundle rereads terminate on a dedicated reread guard but still persist `termination_boundary: null`

## Problem

Treating all active-closeout behavior as one parity-ready family would blur a meaningful taxonomy boundary:
- repo-wide self-reference searching is already modeled as a broader meta-surface policy problem
- post-anchor rereads of the resolved active closeout bundle are a narrower deterministic guard with their own runtime state

Today that leaves an awkward operator surface:
- some active-closeout-related failures already appear as first-class meta-surface-expansion boundaries
- the dedicated active-closeout reread guard still emits only free-form prose and `termination_boundary: null`
- docs describe active-closeout as outside the first-class taxonomy without clearly spelling out that split

## Goals

- Make the active-closeout taxonomy explicit rather than pretending the whole area is one parity family.
- Preserve repo-wide self-reference / closeout searching under the existing meta-surface-expansion family.
- Promote only the dedicated active-closeout bundle reread guard into a first-class `termination_boundary` family.
- Keep current guard thresholds, prompt rules, and search/reread ordering unchanged.

## Non-Goals

- Creating a single umbrella `active-closeout` boundary that absorbs both search and reread behavior.
- Reclassifying existing meta-surface-expansion active-closeout searches.
- Changing active-closeout detection heuristics, reread timing, or startup-anchor behavior.
- Reopening shell-probe, command-intent, timeout, stall, heavy-command, or startup-loop taxonomy work.

## User Value

- Operators get a truthful contract: active-closeout reread failures become machine-readable without obscuring that broader self-reference searches are still meta-surface expansion.
- Standalone-review keeps converging toward a hardened Symphony-like surface where deterministic runtime families are explicit and policy-shaped cross-surface drift remains classified separately.
- Future review automation can distinguish “active-closeout reread” from “broad meta-surface drift” without parsing prose.

## Acceptance Criteria

- Active-closeout bundle reread failures persist a stable non-null first-class `termination_boundary` record.
- Repo-wide active-closeout searching that currently terminates as meta-surface expansion continues to do so.
- Terminal failure output prints one explicit stable active-closeout reread classification/provenance line while preserving existing human-readable failure prose.
- Docs explicitly describe the taxonomy split: active-closeout search stays under meta-surface expansion; active-closeout bundle rereads become their own first-class boundary.
- Focused tests prove the reread family is promoted without changing current meta-surface behavior.
