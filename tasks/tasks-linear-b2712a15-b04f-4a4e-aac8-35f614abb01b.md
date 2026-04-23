# Task Checklist - linear-b2712a15-b04f-4a4e-aac8-35f614abb01b

- Linear Issue: `CO-315` / `b2712a15-b04f-4a4e-aac8-35f614abb01b`
- MCP Task ID: `linear-b2712a15-b04f-4a4e-aac8-35f614abb01b`
- Primary PRD: `docs/PRD-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- TECH_SPEC: `tasks/specs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- Shared source 0 anchor: `ctx:sha256:08ac8534528c20e15c4bf7265a363da0a47f727b08fa91807f76e42ad0030574#chunk:c000001`
- Source object id: `sha256:08ac8534528c20e15c4bf7265a363da0a47f727b08fa91807f76e42ad0030574`
- Origin manifest: `.runs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-docs-packet/cli/2026-04-23T00-51-01-276Z-b894da73/manifest.json`

## Docs-First
- [x] PRD drafted for release-runbook parity plus `docs:check` truth coverage. Evidence: `docs/PRD-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`.
- [x] Canonical TECH_SPEC drafted with protected release surfaces, parity matrix, validation floor, and machine-checkable acceptance. Evidence: `tasks/specs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`.
- [x] TECH_SPEC mirror drafted inside docs scope. Evidence: `docs/TECH_SPEC-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused docs-hygiene coverage, and review gates. Evidence: `docs/ACTION_PLAN-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`.
- [x] Checklist mirrored to `.agent/task/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`. Evidence: `.agent/task/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`.
- [x] `tasks/index.json` updated under canonical `items[]` with the `CO-315` task registration and child-lane approval metadata. Evidence: `tasks/index.json`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md` readiness gate.

## Workflow
- [x] Child lane stayed within the declared docs/file scope. Evidence: final diff limited to the owned docs/task files plus `tasks/index.json`.
- [x] Child lane did not mutate Linear state or the parent workpad. Evidence: no Linear mutation helpers called.
- [x] Child lane did not edit implementation, workflow, or test files. Evidence: final diff.
- [x] Shared source 0 metadata was recorded even though the literal `source.txt` payload path is absent in this child checkout. Evidence: packet traceability fields point to the supplied anchor/object/manifest paths and the packet is anchored on the parent-provided issue-shaping contract plus current repo release surfaces.
- [x] Child lane left its packet in the workspace for parent patch export instead of committing in-lane. Evidence: working tree changes remain uncommitted.

## Implementation Acceptance
- [ ] `skills/release/SKILL.md` matches the current release runbook truthfully and no longer requires hidden repo knowledge.
- [ ] The release-skill validation floor is accurate for the current release SOP/workflow contract.
- [ ] Signing secret posture is explicit and accurate, including exactly-one-of `RELEASE_SIGNING_PUBLIC_KEYS` / `RELEASE_SIGNING_ALLOWED_SIGNERS`.
- [ ] Manual-dispatch tag semantics are explicit and accurate, including `workflow_dispatch` / `inputs.tag` behavior against existing tags only.
- [ ] Overview override behavior is explicit and accurate, including signed annotated tag body handling, explicit .github/release-overview.md non-use, and release-notes addendum guidance.
- [ ] OIDC-vs-`NPM_TOKEN` publish posture is explicit and accurate, including `--provenance` and automation-token fallback requirements.
- [ ] `docs:check` fails when release skill/SOP/addendum drift on the protected release truths.
- [ ] The final release runbook no longer depends on hidden repo knowledge for the standard release path.

## Validation
- [x] Child scoped JSON syntax check. Evidence: `jq empty tasks/index.json`.
- [x] Child scoped whitespace/diff check. Evidence: `git diff --check -- docs/PRD-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md docs/TECH_SPEC-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md docs/ACTION_PLAN-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md tasks/specs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md tasks/tasks-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md .agent/task/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md tasks/index.json`.
- [ ] Parent focused docs-hygiene coverage for release-runbook parity drift. Evidence: pending.
- [ ] Parent `npm run docs:check`. Evidence: pending.
- [ ] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] Parent docs-review and required validation/review/elegance gates before PR handoff. Evidence: pending.

## Progress Log
- 2026-04-23: Bounded same-issue child lane created the `CO-315` docs-first packet and task registration only. The packet preserves `skills/release/SKILL.md`, `.agent/SOPs/release.md`, `docs/release-notes-template-addendum.md`, `docs/README.md`, `.github/workflows/release.yml`, `docs:check`, validation floor, `RELEASE_SIGNING_PUBLIC_KEYS`, `RELEASE_SIGNING_ALLOWED_SIGNERS`, `workflow_dispatch`, `inputs.tag`, signed annotated tag body overview override, explicit .github/release-overview.md non-use, OIDC trusted publishing, `secrets.NPM_TOKEN`, and `--provenance`, while explicitly rejecting release-workflow redesign and generic docs cleanup reinterpretations.
