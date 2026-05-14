# PRD - CO: audit remaining top-level non-doc and config stewardship surfaces and prune low-value residue

## Added by Bootstrap 2026-04-12

## Traceability
- Linear issue: `CO-139` / `2136ea50-1fdf-44c2-ae3c-0e8d8a364b59`
- Linear URL: https://linear.app/asabeko/issue/CO-139/co-audit-remaining-top-level-non-doc-and-config-stewardship-surfaces
- Source issue: `CO-124` / `d43b6785-88d6-442b-a34e-2ad19d4f723a`

## Summary
- Problem Statement: `CO-124` introduced the recurring `repo:stewardship` contract and `CO-126` already handled the archive/reference residue cluster, but the remaining top-level non-doc/config surfaces still rely mostly on broad stewardship globs instead of an explicit keep/update/move/delete pass tied to current consumers. Live repo truth is already concrete: `.ai-dev-tasks`, `.codex`, `adapters`, `eslint-plugin-patterns`, `patterns`, `prompt-snippets`, `types`, and root JSON/YAML config files are all tracked active surfaces, yet at least `.ai-dev-tasks/*.md` still describes deprecated template paths and older task-shaping conventions.
- Desired Outcome: publish an explicit disposition and rationale for every targeted surface, update any retained surface whose local story is stale, accept only bounded prompt-surface changes that remain truthful, and rerun `repo:stewardship` so this target set is either clean or explicitly justified without reopening `CO-126`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): keep the lane tightly focused on the listed top-level non-doc/config surfaces, prove why each one still belongs in the repo today, and remove or refresh only the low-value residue actually found in that set. The output should help future maintainers understand what is active, what is merely retained, and what no longer deserves to live at the repo root.
- Success criteria / acceptance:
  - every targeted surface has an explicit `keep`, `update`, `move`, or `delete` disposition with rationale
  - retained surfaces point to current consumer or owner evidence in code, docs, tests, packaging, or policy config
  - stale retained guidance is refreshed or removed instead of being hand-waved as “active”
  - `repo:stewardship` is rerun and the resulting state for this target set is reviewable
- Constraints / non-goals:
  - do not reopen the `CO-126` `archives/**` / `reference/**` cleanup cluster
  - do not broaden into unrelated compatibility cleanup, provider/runtime work, or generic docs freshness repair
  - keep the diff bounded to the targeted surface set plus minimum supporting docs/task/workpad updates

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `top-level non-doc and config stewardship surfaces`
  - `keep`, `update`, `move`, `delete`
  - `.ai-dev-tasks`
  - `.codex`
  - `adapters`
  - `eslint-plugin-patterns`
  - `patterns`
  - `prompt-snippets`
  - `types`
  - `root JSON/YAML config files`
  - `repo:stewardship`
- Protected terms / exact artifact and surface names:
  - `.ai-dev-tasks/create-prd.md`
  - `.ai-dev-tasks/generate-tasks.md`
  - `.ai-dev-tasks/process-task-list.md`
  - `.codex/orchestrator.toml`
  - `prompt-snippets/frontend-aesthetics-v1.md`
  - `codex.orchestrator.json`
  - `design.config.yaml`
  - `mcp-client.json`
  - `tsconfig.json`
  - `tsconfig.build.json`
- Nearby wrong interpretations to reject:
  - reopen the `CO-126` archive/reference lane because this issue also mentions stewardship
  - treat the broad catalog globs as sufficient proof without rechecking the listed surfaces
  - turn this into a repo-wide docs freshness or compatibility cleanup pass

## Parity / Alignment Matrix
- Current truth:
  - `.ai-dev-tasks/*.md` is still catalogued and scanned as active tasking/docs input, but the content still points at deprecated `.agent/task/*_TEMPLATE.md` paths and older task-id rules
  - `.codex/orchestrator.toml`, `adapters/**/*`, `eslint-plugin-patterns/**/*`, `patterns/**/*`, `types/**/*`, and root config files all have live code/test/docs/package consumers
  - `prompt-snippets/frontend-aesthetics-v1.md` is still referenced by the frontend design packet, but it needs local owner/consumer metadata rather than a folder-level README
- Reference truth:
  - each retained top-level surface should have a truthful present-day story that a maintainer can confirm from nearby code, docs, packaging, or policy config
  - stale retained guidance should be updated or removed, not merely carried forward under a broad wildcard rationale
- Target truth / intended delta:
  - the targeted surface set has a reviewable disposition matrix and sharper rationale anchors
  - `.ai-dev-tasks` reflects current docs-first/template truth
  - prompt-surface retention is either explicitly annotated or explicitly rejected by the parent lane after reviewing the child patch
- Explicitly out-of-scope differences:
  - `archives/**` or `reference/**` rationale-anchor work already closed by `CO-126`
  - unrelated placeholder cleanup from `CO-88`
  - provider-worker/runtime/control-host behavior changes

## Disposition Matrix
- `.ai-dev-tasks/*` -> `update`: retained active tasking/docs input, but the three shipped guides must be refreshed to current docs-first templates, registry mirrors, and validation/review flow.
- `.codex/orchestrator.toml` -> `keep`: active repo-local Codex policy surface consumed by provider-worker/delegation behavior and related docs/tests.
- `adapters/**/*` -> `keep`: active CLI adapter surface imported by orchestrator code and covered by adapter tests.
- `eslint-plugin-patterns/**/*` -> `keep`: active bundled plugin surface wired through the `package.json` file dependency and linter loader.
- `patterns/**/*` -> `keep`: active codemod/linter/template surface used by `npm run build:patterns`, tests, and nearby README guidance.
- `prompt-snippets/frontend-aesthetics-v1.md` -> `update`: retained active prompt surface; accept the bounded metadata patch instead of creating a new folder-level README.
- `types/**/*` -> `keep`: active declaration/contract surface used by TypeScript configs, build output, and shipped package metadata.
- Root config files (`package.json`, `package-lock.json`, `codex.orchestrator.json`, `mcp-client.json`, `design.config.yaml`, `tsconfig.json`, `tsconfig.build.json`) -> `keep`: active CLI/runtime/build/package contracts with current consumer evidence in code, docs, tests, or packaging.
- Low-value residue found in scope -> `none to delete or move beyond stale retained guidance`: the target set is active; the truthful fix is update-focused and does not reopen `CO-126`.

## Not Done If
- Any targeted surface still lacks an explicit disposition and rationale.
- A retained surface still has stale or misleading local guidance after this lane claims it is active.
- The lane closes without rerunning `repo:stewardship` and recording the post-change state for this target set.

## Goals
- Audit the named top-level surfaces against current code, docs, tests, packaging, and policy usage.
- Refresh stale retained tasking/config/prompt surfaces where the surface is still real.
- Keep the diff bounded and reviewable while leaving the broader stewardship contract intact.
- Produce a future-agent-readable packet that explains why each surface is kept.

## Non-Goals
- Redesigning `scripts/repo-stewardship-audit.mjs` or the overall stewardship contract.
- Reopening `archives/**` / `reference/**` cleanup or unrelated root-cluster residue.
- Rewriting active runtime or packaging behavior beyond what is needed to keep the surface story truthful.

## Stakeholders
- Product: CO maintainers relying on truthful upkeep output and bounded follow-up lanes.
- Engineering: maintainers of repo scaffolding, tasking prompts, root config contracts, patterns, and adapters.
- Design: maintainers of the frontend design pipeline prompt surface.

## Metrics & Guardrails
- Primary Success Metrics:
  - every targeted surface lands on an explicit disposition with evidence
  - `repo:stewardship` rerun is clean or explicitly justified for this slice
  - no unrelated archive/reference or compatibility clusters are reopened
- Guardrails / Error Budgets:
  - keep the diff bounded to the targeted surfaces plus minimum packet/mirror changes
  - prefer update-or-delete over vague retention stories
  - keep the catalog fail-closed and the workpad current

## User Experience
- Personas:
  - maintainers reading `repo:stewardship` output
  - future agents deciding whether a top-level retained surface still has a live purpose
- User Journeys:
  - a maintainer can trace each targeted surface to a current consumer or a deliberate delete/update decision
  - a future agent can open the packet and understand why a top-level surface remains in the repo

## Technical Considerations
- Architectural Notes:
  - keep `docs/repo-stewardship-catalog.json` as the machine-checkable classification surface and sharpen only the targeted entries/patterns
  - prefer explicit path entries with checks where current consumer truth can be enforced cheaply
  - use the child-lane patch only if it remains bounded to `prompt-snippets/**` and improves retention truth
- Dependencies / Integrations:
  - `docs/repo-stewardship-catalog.json`
  - `scripts/repo-stewardship-audit.mjs`
  - `scripts/lib/docs-helpers.js`
  - `docs/design/PRD-frontend-design-pipeline-v2.md`
  - `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`
  - `tasks/frontend-design-pipeline-v2.md`

## Open Questions
- Resolved: the prompt-surface should stay as a one-file retained snippet with inline metadata; adding a folder-level README would add ownership surface area without improving truth for the current single-file folder.
- Resolved: the current consumer inventory does not justify any additional delete-worthy root config leftovers inside this scope.

## Approvals
- Product: pending
- Engineering: pending
- Design: pending if prompt-surface wording changes materially
