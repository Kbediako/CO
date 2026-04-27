# PRD - CO-390 Upstream Codex CLI Release Detection And Release Intake

## Summary
- Problem Statement: CO version posture is evidence-gated, but release discovery is still easy to handle as ad hoc posture work after someone notices an upstream Codex CLI change. CO-390 needs a governed release-intake contract that compares upstream Codex CLI release detection against GitHub release truth, npm `@openai/codex` dist-tags/time, the current CO version-policy target, and workflow pins before any adoption lane starts.
- Desired Outcome: define the docs-first packet for canonical release-intake triggering so the parent lane can implement or wire a detector that opens or updates one canonical Linear intake issue using the CO-386 release-intake template, while preserving existing version-policy gates and avoiding duplicate issue spray.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the CO-390 docs-first packet only. The issue should shape a release-detection and intake-triggering lane, not perform a Codex CLI promotion, not change workflow pins, and not mutate Linear from this child lane. The parent lane needs a packet that preserves exact issue wording around upstream release truth, npm registry evidence, CO version-policy posture, workflow pins, one canonical Linear intake issue, and the CO-386 release-intake template.
- Success criteria / acceptance:
  - the packet preserves the protected wording: upstream Codex CLI release detection, canonical release-intake triggering, GitHub release truth, npm `@openai/codex` dist-tags/time, CO version-policy target, workflow pins, one canonical Linear intake issue, CO-386 release-intake template
  - current/reference/target truth distinguishes release detection from version adoption
  - GitHub releases and npm registry metadata are both required inputs; neither alone is authoritative enough
  - the CO version-policy target and workflow pins are comparison inputs, not things this docs lane changes
  - the parent implementation must deduplicate against an existing canonical intake issue before creating any new Linear issue
  - non-goals and Not Done If conditions reject blind promotion, duplicate issues, direct pin updates, and child-lane Linear mutation
- Constraints / non-goals: this child lane may edit only the declared docs/task registry files. It must not touch implementation, workflow, package, or test files. It must not call Linear mutation helpers. The parent lane owns authoritative issue state, implementation, docs-review, validation, and PR lifecycle.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO-390`
  - upstream Codex CLI release detection
  - canonical release-intake triggering
  - GitHub release truth
  - npm `@openai/codex` dist-tags/time
  - CO version-policy target
  - workflow pins
  - one canonical Linear intake issue
  - CO-386 release-intake template
- Protected terms / exact artifact and surface names:
  - `docs/guides/codex-version-policy.md`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/cloud-canary.yml`
  - `tests/pack-smoke.spec.ts`
  - `@openai/codex`
  - `dist-tags`
  - `time`
  - `latest`
  - `rust-v*`
  - `CO-386`
  - `CO-390`
- Nearby wrong interpretations to reject:
  - treating npm `latest` alone as GitHub release truth
  - treating a GitHub tag alone as npm publish readiness
  - promoting a new Codex CLI version or changing workflow pins inside this lane
  - opening multiple Linear issues for the same upstream release candidate
  - replacing the CO-386 release-intake template with a generic posture issue
  - bypassing the CO version-policy target, cloud canary gates, or marketplace smoke split from prior posture work

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| -- | -- | -- | -- |
| Version policy | `docs/guides/codex-version-policy.md` records the current CO compatibility/adoption target and audited candidate posture. | CO posture changes require release, npm, local runtime, cloud canary, fallback, and no-regression evidence. | Release detection reports candidate drift against the CO version-policy target without changing posture by itself. |
| Workflow pins | Release-facing smoke workflows and cloud canary may intentionally pin different `@openai/codex` versions for compatibility and reproducibility. | Workflow pins are governed evidence surfaces, not automatic mirrors of npm `latest`. | Release intake records which workflow pins are older, newer, or intentionally split before any pin update is proposed. |
| Upstream release truth | Manual posture lanes have captured release/npm facts after a human starts the audit. | GitHub release truth and npm `@openai/codex` dist-tags/time together establish whether a canonical upstream release candidate exists. | A detector compares both sources and triggers one canonical Linear intake issue only when the release is new or materially untracked. |
| Linear intake | Release lanes can be created manually from operator context. | CO-386 release-intake template defines the canonical issue shape for release-intake work. | CO-390 funnels release discovery into one canonical Linear intake issue and updates/deduplicates instead of spraying follow-ups. |

Explicitly out-of-scope differences: direct Codex CLI promotion, workflow pin changes, cloud-canary execution, pack-smoke rebaseline, marketplace compatibility redesign, implementation file edits, and Linear mutation from this child lane.

## Not Done If
- GitHub release truth and npm `@openai/codex` dist-tags/time are not both represented as required inputs.
- CO version-policy target and workflow pins are not used as comparison surfaces.
- The packet allows npm `latest`, a GitHub tag, or a local `codex --version` result to trigger adoption by itself.
- The release-intake path can create more than one canonical Linear intake issue for the same upstream release candidate.
- The CO-386 release-intake template is omitted, weakened, or replaced with a generic issue body.
- The lane changes workflow pins, package versions, version-policy posture, cloud-canary gates, or implementation code.
- Linear mutation is performed by this child lane instead of being left to the parent integration path.

## Goals
- Create the CO-390 docs-first packet and registry mirrors.
- Preserve release-intake protected wording and exact surfaces for the parent lane.
- Define a posture-neutral detection contract that compares GitHub release truth, npm registry truth, CO version-policy target, and workflow pins.
- Make canonical issue deduplication a first-class requirement.

## Non-Goals
- No Codex CLI version promotion.
- No workflow pin update.
- No package, implementation, test, or workflow edit.
- No Linear mutation from this child lane.
- No cloud canary, runtime canary, pack-smoke, or marketplace rebaseline.
- No second release-intake issue when an existing canonical intake issue already covers the candidate.

## Stakeholders
- Product: CO operators who need upstream Codex CLI releases surfaced as governed intake instead of ad hoc posture drift.
- Engineering: CO version-policy, workflow, release, pack-smoke, cloud-canary, and Linear provider maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: one docs packet exists, protected terms are present, task registry mirrors point to the TECH_SPEC, and the parent lane has an unambiguous release-intake trigger contract.
- Guardrails / Error Budgets: no blind version adoption, no duplicate Linear issue creation, no workflow pin churn, no weakening of existing CO version-policy gates, and no child-lane Linear mutation.

## User Experience
- Personas:
  - CO maintainer checking whether upstream Codex CLI has a new release that needs intake.
  - Parent provider worker deciding whether to create or update a canonical release-intake Linear issue.
  - Reviewer verifying that release detection remains separate from adoption and pin updates.
- User Journeys:
  - Maintainer sees a new upstream release; detector compares GitHub release truth and npm `@openai/codex` dist-tags/time against policy and pins.
  - Parent lane either finds an existing canonical intake issue or creates one using the CO-386 release-intake template.
  - Reviewer confirms the resulting intake issue records source evidence and does not claim promotion readiness.

## Technical Considerations
- Architectural Notes: parent implementation should treat release detection as an intake classifier. Inputs should include GitHub release truth, npm `@openai/codex` dist-tags/time, current CO version-policy target, and workflow pins. Outputs should be no-op, update existing canonical intake, or create one canonical Linear intake issue from the CO-386 release-intake template.
- Dependencies / Integrations: GitHub release surface for upstream Codex CLI, npm registry metadata for `@openai/codex`, `docs/guides/codex-version-policy.md`, workflow pin files, Linear issue search/create/update handled by the parent lane, and CO-386 template content.

## Assumptions
- Parent-provided source anchor `ctx:sha256:458c1773dc00d4b3c070ab6ce8919e6b73816c6d2a2fc0f4903ebf3b075386e5#chunk:c000001` is the authoritative issue source for this child lane.
- The referenced source payload path was not present in this child checkout, so the packet preserves the issue-shaping contract supplied in the task prompt rather than inventing additional Linear body text.
- Current local policy evidence shows `docs/guides/codex-version-policy.md` as the governed posture source and workflow pins as comparison surfaces.

## Open Questions
- Which local helper should own the final release-detection comparison: an existing version-policy command, a provider workflow step, or a new narrowly scoped script?
- How should the parent identify an existing canonical release-intake issue: by CO-386 template marker, upstream release version, protected title text, or a dedicated canonical-owner marker?
- Should prerelease or npm dist-tag-only changes trigger intake, advisory output, or no-op classification?

## Approvals
- Product: issue accepted via CO-390.
- Engineering: docs child lane drafts packet only; parent owns implementation, Linear integration, validation, docs-review, and PR lifecycle.
- Design: Not applicable.
