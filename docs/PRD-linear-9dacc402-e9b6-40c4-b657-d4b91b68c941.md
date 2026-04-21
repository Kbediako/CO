# PRD: CO-272 Replace Dead .runs Archive Guidance

## Traceability

- Linear issue: `CO-272`
- Issue title: `Replace dead-code-pruning .runs archive pointers with durable tracked guidance`
- Task id: `linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Registry id: `20260421-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Phase: docs implementation slice
- Source anchor: `ctx:sha256:89eae343f6b7d6c89e08d2ae54c394e5c638f9dcb5407f0a55fe38560772d55b#chunk:c000001`
- Source object id: `sha256:89eae343f6b7d6c89e08d2ae54c394e5c638f9dcb5407f0a55fe38560772d55b`
- Declared source payload: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-readme-guidance/cli/2026-04-21T13-03-01-509Z-99593f7b/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-readme-guidance/cli/2026-04-21T13-03-01-509Z-99593f7b/manifest.json`
- Source caveat: the declared `.runs/.../source.txt` path is absent in this child checkout, so this packet is anchored on the parent-provided issue contract, the current README contents, and the prior attempt reference `31c319913`.

## User Request Translation

Replace the currently tracked README guidance that treats the dead-code-pruning `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/...` payload as durable:

- `archives/hi-fi-tests/README.md`
- `packages/abetkaua/README.md`
- `packages/abetkaua/public/README.md`
- `packages/des-obys/README.md`
- `packages/des-obys/public/README.md`
- `packages/eminente/README.md`
- `packages/eminente/public/README.md`
- `packages/obys-library/README.md`
- `packages/obys-library/public/README.md`
- `reference/plus-ex-15th/README.md`

The replacement must be durable tracked guidance or explicit regeneration steps. This is not a broad archive cleanup; the lane stays bounded to the current Task 0801 README residue and must not restore, relocate, or delete archived payloads.

## Problem

The in-scope README files pointed readers at a historical run-local archive under `.runs/0801-dead-code-pruning/archive/...`. That path is ignored, not durable in fresh checkouts, and should not be treated as public guidance.

`packages/abetkaua/README.md` also contains valid mirror fetch, serve, check, and non-0801 manifest history. The fix must preserve that guidance while replacing only the dead Task 0801 archive pointer.

## Desired Outcome

- The target README files no longer reference `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`.
- Readers are pointed to tracked docs and regeneration commands such as `docs/README.md`, `docs/guides/pixel-perfect-local-clones.md`, and `npm run mirror:fetch -- --project abetkaua`.
- `packages/abetkaua/README.md` keeps mirror workflow guidance and separate non-0801 run-manifest history.
- Similar mirror stubs use project-specific regeneration, validation, and serve commands instead of dead archive pointers.

## Issue-Quality Review

The issue is specific enough for a bounded docs implementation. It names the exact bad path and three example README surfaces, while the acceptance criteria require that no tracked archive README rely on ignored local-only `.runs/...` paths as durable public locations. A tracked README grep found the additional Task 0801 residue listed in this packet.

The micro-task path is not appropriate because correctness depends on exact protected wording, exact paths, and preserving valid `.runs` operational history that is not the dead-code-pruning archive pointer.

## Protected Terms

- `dead-code-pruning .runs archive pointers`
- `durable tracked guidance`
- `archives/hi-fi-tests/README.md`
- `packages/abetkaua/README.md`
- `packages/abetkaua/public/README.md`
- `packages/des-obys/README.md`
- `packages/des-obys/public/README.md`
- `packages/eminente/README.md`
- `packages/eminente/public/README.md`
- `packages/obys-library/README.md`
- `packages/obys-library/public/README.md`
- `reference/plus-ex-15th/README.md`
- `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`
- `docs/guides/pixel-perfect-local-clones.md`
- `Task 0801`
- `broad archive cleanup`
- `des-obys`
- `eminente`
- `obys-library`
- `reference/plus-ex-15th`

## Wrong Interpretations To Reject

- Do not leave other current README stubs with the same dead archive path solely because they were not named in the issue evidence list.
- Do not sweep unrelated `.runs` mentions or historical operational manifest evidence.
- Do not remove every `.runs` reference from `packages/abetkaua/README.md`.
- Do not restore, relocate, or delete archive payloads.
- Do not mutate Linear, GitHub PRs, or parent workpad state from this child lane.

## Current / Reference / Target Parity

| Surface | Current | Target |
| --- | --- | --- |
| `archives/hi-fi-tests/README.md` | Points to the Task 0801 `.runs/.../archive` location. | Explains this is a tracked stub and gives regeneration or retained-snapshot guidance through tracked docs. |
| `packages/abetkaua/README.md` | Says the previous static snapshot lives under the Task 0801 `.runs/.../archive` location. | Explains fresh checkouts should regenerate `packages/abetkaua/public/` with mirror scripts while preserving mirror workflow commands. |
| `packages/abetkaua/public/README.md` | Says to use or copy from the Task 0801 `.runs/.../archive` location. | Describes `public/` as rebuilt on demand and lists fetch, check, and serve commands. |
| `packages/des-obys/**` README stubs | Point to the Task 0801 `.runs/.../archive` public payload. | Describe on-demand rebuilds and list project-specific fetch, check, and serve commands. |
| `packages/eminente/**` README stubs | Point to the Task 0801 `.runs/.../archive` public payload. | Describe on-demand rebuilds and list project-specific fetch, check, and serve commands. |
| `packages/obys-library/**` README stubs | Point to the Task 0801 `.runs/.../archive` public payload or restore-from-archive flow. | Describe on-demand rebuilds while preserving the existing local start workflow. |
| `reference/plus-ex-15th/README.md` | Points to and serves a Task 0801 `.runs/.../archive` reference payload. | Explains the tracked directory retains loader metadata and points readers to hi-fi toolkit regeneration plus serving the regenerated output. |

## Acceptance Criteria

- Tracked README files no longer contain `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`.
- Replacement text uses durable tracked guidance or regeneration commands.
- Valid abetkaua mirror workflow and separate non-0801 manifest history remain.
- Docs-first packet and registry mirrors are refreshed for `CO-272`.
- The scope remains bounded to Task 0801 README residue and the CO-272 docs packet.

## Not Done If

- Any tracked README still contains the dead Task 0801 archive path.
- The change turns into generic `.runs` scrubbing.
- Valid abetkaua mirror commands are removed.
- The lane restores, relocates, or deletes archive payloads instead of correcting durable guidance.
- The lane edits parent-owned Linear/workpad/PR surfaces.
