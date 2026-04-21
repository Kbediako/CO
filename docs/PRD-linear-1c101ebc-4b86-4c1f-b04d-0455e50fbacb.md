# PRD - CO-276: replace remaining dead-code-pruning archive README pointers with durable guidance

## Traceability
- Linear issue: `CO-276` / `1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- Linear URL: https://linear.app/asabeko/issue/CO-276/co-replace-remaining-dead-code-pruning-archive-readme-pointers-with
- Task id: `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- Canonical spec: `tasks/specs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- Source issue: `CO-272` / `9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Source anchor: `ctx:sha256:037f0a76dfa8211a54a56b272676253d1646041df2073a17c9a971e9ea74ea69#chunk:c000001`

## Summary
- Problem Statement: seven tracked README files still present ignored `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/...` payload paths as if they are durable checkout guidance, so fresh clones point readers at absent archives.
- Desired Outcome: the listed README surfaces should give durable tracked guidance, release-artifact direction, or explicit regeneration steps without reintroducing ignored `.runs` payloads or widening into generic archive cleanup.

## User Request Translation
- User intent / needs: complete the CO-276 follow-up by replacing the remaining dead-code-pruning `.runs` archive README pointers in the exact seven named surfaces.
- Success criteria / acceptance: no listed README presents the missing `0801-dead-code-pruning` archive path as durable guidance, any remaining `.runs` mention is explicitly local-only output, and the diff stays inside the named residue surfaces plus required docs-first packet.
- Constraints / non-goals: do not restore deleted archive payloads into git, do not sweep unrelated `.runs` examples, do not change mirror tooling or hi-fi pipeline behavior, and do not modify the already-handled CO-272 surfaces unless a fresh regression appears.

## Intent Checksum
- Exact user wording / phrases to preserve: "replace remaining dead-code-pruning `.runs` archive README pointers with durable tracked guidance".
- Protected terms / exact artifact and surface names:
  - `packages/des-obys/README.md`
  - `packages/des-obys/public/README.md`
  - `packages/eminente/README.md`
  - `packages/eminente/public/README.md`
  - `packages/obys-library/README.md`
  - `packages/obys-library/public/README.md`
  - `reference/plus-ex-15th/README.md`
  - `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`
- Nearby wrong interpretations to reject:
  - reopen generic archive cleanup across unrelated `.runs` references
  - restore ignored `.runs/0801-dead-code-pruning/archive/...` payloads into git
  - widen into mirror-regeneration tooling, hi-fi pipeline behavior, or archive retention policy changes
  - edit `packages/abetkaua/*` or the three CO-272 surfaces as part of this issue

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Listed package mirror READMEs | `des-obys`, `eminente`, and `obys-library` root/public READMEs point at missing ignored `.runs/0801-dead-code-pruning/archive/.../public/` paths. | Fresh checkout contains the tracked README stubs, not the ignored archive payloads. | READMEs should identify the package as a tracked mirror stub and point to explicit regeneration or tracked source guidance instead of a missing archive location. |
| `reference/plus-ex-15th/README.md` | The README names the missing `.runs/0801-dead-code-pruning/archive/.../reference/plus-ex-15th` path as "Latest archive" and gives a serve command for that ignored path. | Fresh checkout contains only the tracked reference README and any tracked reference assets. | The README should direct readers to tracked reference assets or explicit regeneration steps; `.runs` paths, if mentioned, must be local-only generated output. |
| Adjacent dead-code-pruning residue | `packages/abetkaua/*` and historical 0801 docs still mention the dead-code-pruning archive. | CO-276 is scoped only to the seven named surfaces after CO-272. | Leave unrelated historical/task docs and non-listed package surfaces unchanged unless a separate issue owns them. |

## Not Done If
- Any listed README still presents `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/...` as a durable checkout path.
- Replacement guidance depends on ignored local-only archive payloads existing in fresh clones.
- The issue drifts into generic archive cleanup instead of the named dead-code-pruning residue surfaces.
- The implementation changes mirror tooling, hi-fi pipeline behavior, or archive retention policy without a separate issue.

## Goals
- Replace all seven listed README pointers with durable tracked guidance or explicit regeneration steps.
- Keep any `.runs` reference in those files clearly labeled as local-only generated output.
- Preserve the scope boundary around CO-276's named surfaces.
- Register the docs-first packet and validation evidence for review handoff.

## Non-Goals
- No restoration of ignored `.runs/0801-dead-code-pruning/archive/...` payloads into git.
- No generic archive sweep across unrelated tracked files.
- No modifications to CO-272 surfaces unless a new regression appears.
- No mirror tooling, hi-fi pipeline, or retention-policy changes.

## Stakeholders
- Product: CO operators and downstream reviewers using fresh checkouts.
- Engineering: CO docs and mirror/reference maintainers.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics: targeted `rg` over the seven protected README files no longer finds the missing 0801 archive path; README text gives actionable tracked guidance.
- Guardrails / Error Budgets: keep the implementation small, docs-only/README-only, and avoid untracked archive payloads.

## User Experience
- Personas: a reviewer or future agent opening the tracked README in a fresh clone.
- User Journeys: read the package/reference README, understand that archived payloads are not tracked, and follow durable regeneration or tracked asset guidance without needing ignored `.runs` state.

## Technical Considerations
- Architectural Notes: this is a documentation residue fix; no runtime or data-model changes are expected.
- Dependencies / Integrations: existing mirror scripts and tracked reference assets, only as documented guidance.

## Open Questions
- None blocking. If a listed README cannot be made useful without mirror tooling changes, file a follow-up instead of widening this issue.

## Approvals
- Product: CO-276 issue body.
- Engineering: parent provider worker.
- Design: not applicable.
