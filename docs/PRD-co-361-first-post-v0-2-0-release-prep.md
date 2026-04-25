# PRD - CO-361 First Post-v0.2.0 Release Prep

## Summary
- Problem Statement: `origin/main` is ready for the first release after `v0.2.0`, but `package.json` still reports `0.2.0`, `README.md` still routes the "Older package docs" link to `v0.1.38`, and release-facing posture summaries (`docs/guides/codex-version-policy.md`, `docs/book/public-posture.md`, and the `docs/book/README.md` pointer to `docs/book/codex-cli-0124-adoption.md`) still leave `0.124.0` looking like the active release-planning baseline even though current evidence separates local ChatGPT-auth/appserver `gpt-5.5` posture from Codex CLI `0.125.0` downstream-smoke/package evidence.
- Desired Outcome: prepare a clean release PR from current `origin/main` that bumps the package version, keeps the public package surfaces truthful for the first post-`v0.2.0` cut, clarifies that the remaining `0.124.0` hold is cloud-only rather than a blanket hold on local ChatGPT-auth appserver/model posture or package/downstream-smoke `0.125.0` compatibility, and leaves the `0.124.0` evidence page clearly historical instead of current.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): prepare the first post-`v0.2.0` release lane from clean `origin/main` after PR `#658`, keep the current posture on `gpt-5.5` / Codex CLI `0.125.0`, avoid lazily holding appserver work behind unrelated cloud-only blockers, and stop before any publish, tag, merge, or npm release execution.
- Success criteria / acceptance:
  - clean release-prep branch starts from current `origin/main` and includes merge commit `375aec3cfee018b80bac6a4cb6e3ba357086c36d`
  - the next package version is bumped in `package.json` and `package-lock.json`
  - public/package-facing docs no longer point published-package users at `v0.1.38` as the previous package docs route
  - version policy and release-facing book summaries separate local ChatGPT-auth appserver/model posture from package/downstream-smoke `0.125.0` compatibility without falsely promoting unproven cloud execution surfaces
  - release workflow / pack-smoke surfaces remain truthful and untouched unless the audit proves a release blocker there
  - no publish, tag, merge, or npm release execution happens in this lane
- Constraints / non-goals:
  - do not publish npm
  - do not create tags
  - do not merge PRs
  - do not broaden scope into CO-371 / CO-372
  - do not rewrite portable fallback defaults away from `gpt-5.4` unless a separate evidence lane requires it

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `first post-v0.2.0 release lane`
  - `gpt-5.5`
  - `Codex CLI 0.125.0 adoption evidence`
  - `not to lazily hold appserver work`
- Protected terms / exact artifact and surface names:
  - `origin/main`
  - `375aec3cfee018b80bac6a4cb6e3ba357086c36d`
  - `package.json`
  - `package-lock.json`
  - `README.md`
  - `docs/guides/codex-version-policy.md`
  - `docs/book/public-posture.md`
  - `docs/book/README.md`
  - `docs/book/codex-cli-0124-adoption.md`
  - `.github/workflows/release.yml`
  - `npm run pack:smoke`
  - `codex debug models`
  - `appserver`
- Nearby wrong interpretations to reject:
  - treat this as a publish/tag lane
  - reopen generic model-default work instead of bounded release prep
  - change cloud-canary posture just to make the docs look uniform
  - widen this into unrelated cleanup or future issue work

## Parity / Alignment Matrix
- Current truth:
  - `package.json` still reports `0.2.0`
  - `README.md` still points the older package-docs link at `v0.1.38`
  - public/package docs already advertise current local ChatGPT-auth/appserver `gpt-5.5` posture and package/downstream-smoke `0.125.0` compatibility
  - `docs/guides/codex-version-policy.md` and the linked `docs/book/*` posture summaries still leave `0.124.0` looking like the active release-planning target even though `release`, `core-lane` pack smoke, and `pack-smoke-backstop` already use `@openai/codex@0.125.0`
- Reference truth:
  - CO-351 approved bounded `0.125.0` appserver control/proof usage
  - CO-352 adopted `gpt-5.5` / `xhigh` for current local ChatGPT-auth/appserver posture
  - CO-355 rebaselined marketplace/downstream-smoke compatibility to `0.125.0`
- Target truth / intended delta:
  - next release branch is versioned for the first post-`v0.2.0` cut
  - README routes older package readers to `v0.2.0`
  - version policy and book/public summaries distinguish local ChatGPT-auth appserver/model posture plus package/downstream-smoke `0.125.0` compatibility from the still-separate cloud-only candidate lane
  - `docs/book/codex-cli-0124-adoption.md` remains available as historical evidence instead of current posture guidance
- Explicitly out-of-scope differences:
  - cloud execution promotion
  - provider-runtime or provider-supervision promotion
  - release publication, signing, or merge execution

## Not Done If
- The branch only bumps the version but still leaves public package docs pointing at `v0.1.38`.
- The branch still implies local appserver/model posture or package/downstream-smoke `0.125.0` compatibility is globally blocked by the cloud-only candidate hold.
- The public book summaries still present the `0.124.0` evidence page as the current posture.
- The lane mutates publish/tag/merge state instead of staying release-prep only.

## Goals
- Register CO-361 as a bounded docs-first release-prep lane.
- Prepare the next package version bump.
- Make the public release/package posture truthful for the first post-`v0.2.0` release PR.

## Non-Goals
- No release publication.
- No tag creation.
- No workflow architecture redesign.

## Stakeholders
- Product: CO operators and downstream package users.
- Engineering: release maintainers, docs/package posture maintainers, workflow maintainers.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - release PR diff stays minimal and truthful
  - public/package posture matches current validated evidence
  - release-prep validation passes on changed surfaces
- Guardrails / Error Budgets:
  - no edits outside the clean CO-361 worktree
  - no untruthful `0.125.0` cloud promotion
  - no skipped pack-smoke if package/release-facing files change

## User Experience
- Personas:
  - maintainer preparing the next release PR
  - downstream user reading package docs after the next release
- User Journeys:
  - maintainer bumps the release branch cleanly without triggering publish
  - downstream user sees current `0.125.0` / `gpt-5.5` posture and the correct previous tagged-doc route

## Technical Considerations
- Architectural Notes: this is a release-prep-only lane. It should change versioning and public posture wording, not runtime behavior.
- Dependencies / Integrations: `README.md`, `docs/guides/codex-version-policy.md`, `docs/book/public-posture.md`, `docs/book/README.md`, `docs/book/codex-cli-0124-adoption.md`, `package.json`, `package-lock.json`, `.github/workflows/release.yml`, `npm run pack:audit`, `npm run pack:smoke`.

## Open Questions
- Is `0.2.1` the correct next release number for this post-`v0.2.0` prep branch, or does downstream release-note review justify a larger bump later?

## Approvals
- Product: accepted via CO-361 release-worker brief.
- Engineering: clean-worktree audit confirms the lane is bounded to release prep and public posture truthfulness.
- Design: not applicable.
