# PRD: Coordinator Symphony-Aligned Skills Install CLI Shell Extraction

## Summary

After `1256` froze the remaining local `codex` pocket, the next truthful nearby shell candidate is the inline `skills install` family in `bin/codex-orchestrator.ts`.

## Problem

`handleSkills(...)` in `bin/codex-orchestrator.ts` still owns a bounded shell above the existing skills engine:

- help and subcommand gating for the `skills` family
- `skills install` flag mapping into the installer engine
- JSON vs text output shaping for the install result
- unknown-subcommand handling

That is a real mixed shell boundary even though the underlying installer already lives in `orchestrator/src/cli/skills.ts`.

## Goal

Extract the inline `skills install` shell into a dedicated boundary without changing user-facing behavior.

## Non-Goals

- widening into `setup` bootstrap or doctor-owned skill-install callers
- changing the underlying `installSkills(...)` engine semantics
- refactoring shared top-level parser/help helpers outside the bounded shell move

## Success Criteria

- `skills install` moves behind a dedicated shell boundary
- help gating, flag mapping, JSON/text output, and unknown-subcommand handling remain stable
- focused parity coverage is added if the extracted shell needs direct tests
