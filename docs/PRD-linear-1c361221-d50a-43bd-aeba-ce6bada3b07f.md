# PRD - CO: Add a bounded macOS screenshot-proof capture path without external helper dependencies

## Added by Bootstrap 2026-04-08

## Traceability
- Linear issue: `CO-105` / `1c361221-d50a-43bd-aeba-ce6bada3b07f`
- Linear URL: https://linear.app/asabeko/issue/CO-105/co-add-a-bounded-macos-screenshot-proof-capture-path-without-external
- Related issue: `CO-97` / `bd8f3cc3-0871-470b-8c86-2f3815b326f2`
- Related issue: `CO-61` / `17c2a486-f5d8-4801-823e-edb8d9ec9936`
- Related issue: `CO-8` / `e913b2ab-2be9-4891-bf54-0ac4642ba012`

## Summary
- Problem Statement: current CO `main` owns the reviewer-facing `runtime-proof` policy contract and the `upsert-workpad` local-image upload-and-embed path, but it still has no first-class repo-owned macOS screenshot capture seam. `CO-97` closed with an explicit host note that the local screenshot helper path failed because of a Swift/SDK mismatch, so proof capture fell back to raw macOS `screencapture` plus AppleScript cleanup. That leaves workers with a brittle, partly undocumented, and partly off-repo step right before the existing CO proof contract is supposed to take over.
- Desired Outcome: add one bounded CO-owned macOS screenshot-proof helper path that uses built-in macOS tools only, produces a local artifact compatible with existing `linear upsert-workpad` embedding, reports capture and cleanup truth explicitly, and keeps the existing `runtime-proof` reviewer-URL flow and `upsert-workpad` embed flow intact instead of replacing either seam.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete `CO-105` by giving workers a repo-owned default way to create screenshot proof on macOS without relying on the machine-local Swift wrapper that already failed on this host. The solution must stay narrow: built-in macOS only, explicit failure and cleanup reporting, and direct compatibility with the already-landed Linear embed flow. It must not broaden into cross-platform media tooling, browser automation, or a replacement for `runtime-proof`.
- Success criteria / acceptance:
  - CO exposes one repo-owned macOS screenshot-proof capture helper or equivalent documented CLI path
  - the default path uses built-in macOS capabilities only and does not require the external/local Swift helper wrapper
  - capture results include a truthful local artifact path or file URL usable with `linear upsert-workpad`
  - capture failure, Screen Recording failure, unreadable-output failure, Automation/cleanup failure, and cleanup skip are explicitly distinguishable
  - worker guidance clearly separates:
    - local screenshot capture for direct-in-Linear workpad proof
    - `runtime-proof` reviewer URLs for app-touching handoff
    - direct local-file image embedding as the upload step after capture
  - focused tests and host-manual validation prove both the happy path and the explicit failure-reporting paths
- Constraints / non-goals:
  - keep the lane bounded to macOS still-image capture
  - preserve `runtime-proof` reviewer-link semantics and `upsert-workpad` upload/embed semantics
  - do not require Homebrew, SwiftPM, Playwright, ffmpeg, or another new external dependency for the default path
  - do not declare docs-only victory by telling operators to run raw `screencapture` manually

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `repo-owned macOS screenshot-proof capture`
  - `no external helper dependency requirement`
  - `explicit cleanup of temporary proof surfaces`
  - `compatibility with existing upsert-workpad local image embedding`
  - `embedded directly in Linear`
  - `runtime-proof`
- Protected terms / exact artifact and surface names:
  - `screenshot proof`
  - `runtime-proof`
  - `upsert-workpad`
  - `file:///absolute/path/to/proof.png`
  - `macOS screencapture`
  - `AppleScript / osascript cleanup`
  - `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `skills/linear/SKILL.md`
- Nearby wrong interpretations to reject:
  - treating `CO-61` as if local screenshot capture were already solved there
  - reopening `CO-8` reviewer URL policy instead of the local capture seam
  - standardizing on the machine-local Swift helper wrapper that already failed on this host
  - broadening into video capture, browser automation, or generic media tooling
  - documenting raw manual `screencapture` plus hand cleanup as the permanent solution

## Parity / Alignment Matrix
- Current truth:
  - `runtime-proof` already resolves permit posture and reviewer-link handoff, but it requires a reviewer-visible proof URL and does not create local screenshots
  - `upsert-workpad` already uploads supported local image refs into Linear, but only after a screenshot file already exists
  - `CO-97` closeout explicitly recorded that the local screenshot helper path failed on this host because of a Swift/SDK mismatch, so proof capture used direct macOS `screencapture` plus AppleScript cleanup instead
- Reference truth:
  - proof-required CO lanes should have one auditable, repo-owned macOS capture helper that uses built-in tools, reports capture and cleanup truth clearly, and feeds the existing local-image embed path without extra operator invention
- Target truth / intended delta:
  - CO adds a bounded `linear screenshot-proof` capture path on macOS that creates a local screenshot artifact, reports structured capture and cleanup results, and leaves upload/embed plus reviewer-URL handoff in their current dedicated seams
- Explicitly out-of-scope differences:
  - cross-platform Linux or Windows capture
  - video or screen recording
  - replacing `runtime-proof`
  - redesigning comment management or generic asset hosting

## Not Done If
- macOS screenshot capture still depends on the external/local Swift helper wrapper outside the repo contract.
- The only documented fallback remains raw manual `screencapture` plus ad hoc cleanup.
- Operators still cannot distinguish local capture failure from Linear upload/embed failure.
- Temporary proof windows or sessions opened by the repo-owned helper are left behind without explicit cleanup status.
- Validation does not include one real host capture plus direct Linear embedding on this machine.

## Goals
- Add one repo-owned worker-visible macOS screenshot-proof capture path using built-in tools only.
- Keep the capture path separate from existing reviewer-URL handoff and existing local-image upload/embed.
- Record explicit capture and cleanup outcomes that operators can audit quickly.
- Update worker guidance so the correct proof path is discoverable without relying on machine-local wrappers.

## Non-Goals
- Changing `runtime-proof` reviewer reachability semantics.
- General-purpose media tooling or video capture.
- Cross-platform capture support in this slice.
- Reworking Linear comment management or asset hosting beyond existing `upsert-workpad` behavior.

## Stakeholders
- Product: CO operators and reviewers who need screenshot proof embedded directly in Linear without ad hoc host-local steps.
- Engineering: Codex.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - at least one real screenshot is captured on this host via the new helper and embedded directly in the live CO-105 workpad
  - helper output makes it obvious whether a failure happened during capture, output verification, or cleanup
  - worker guidance explicitly distinguishes `runtime-proof` reviewer URLs from direct-in-Linear screenshot proof capture
- Guardrails / Error Budgets:
  - keep the default path on built-in macOS tools only
  - do not regress `runtime-proof` or `upsert-workpad`
  - fail closed and truthfully when permissions, output verification, or cleanup do not succeed

## User Experience
- Personas: provider-worker author capturing terminal or desktop proof, reviewer reading the workpad, maintainer auditing why proof capture failed on a given host.
- User Journeys:
  - worker uses the repo-owned helper to capture a screenshot, receives a local file path plus cleanup status, and embeds the file directly into the active workpad
  - reviewer sees the screenshot directly in Linear and can separate capture from upload/embed concerns
  - maintainer reruns a failure path and sees a clear classification for Screen Recording, Automation, unreadable output, or cleanup behavior

## Technical Considerations
- Architectural Notes:
  - the new capture helper should live adjacent to the existing Linear helper surface, not inside `runtime-proof`
  - the narrowest truthful contract is a new `linear screenshot-proof` subcommand backed by a repo-owned control module that shells only built-in macOS tools such as `screencapture` and `osascript`
  - `runtime-proof` remains the reviewer-visible external-link policy helper for app-touching lanes
  - `upsert-workpad` remains the local-image upload/embed helper once a screenshot file already exists
  - optional built-in cleanup of a temporary proof surface is allowed only when the helper opened that surface and the cleanup result is reported explicitly
- Dependencies / Integrations:
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/LinearCliShell.test.ts`
  - focused new screenshot-proof tests
  - `skills/linear/SKILL.md`

## Open Questions
- Whether a later follow-up should add richer window-target selection or additional proof-surface staging modes once the default built-in macOS screen/display path is stable. `CO-105` only needs one bounded repo-owned default path.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria.
- Engineering: pending docs-review child stream and implementation validation.
- Design: N/A.
