# Action Plan - Release Notes Template + Signed Tags (Task 0943)

## Status Snapshot
- Current Phase: Implementation + validation (template file added; label alignment + dry-run complete)
- Run Manifest Link: (docs-review run recorded in task checklist)
- Metrics / State Snapshots: `.runs/0943-release-notes-template-signing/metrics.json`, `out/0943-release-notes-template-signing/state.json`
- Approvals / Escalations: Approvals recorded in PRD (2026-01-12); no escalations.

## Milestones & Tasks
1. Documentation updates (this pass)
   - Update `.agent/SOPs/release.md` to require signed commits/tags plus verification steps.
   - Add `--verify-tag` guardrail for any manual `gh release create`.
   - Capture the release notes template plan, catch-all category, and label taxonomy contract.
   - Update task mirrors and docs registry with evidence.
2. Implementation + validation (this pass)
   - Add .github/release.yml with Overview/Bug Fixes categories and a catch-all.
   - Align repo label taxonomy to the template categories (complete).
   - Validate release notes output on a dry-run release and confirm template lookup behavior (complete).

## Release Notes Template Plan (Summary)
- Use GitHub release notes template with explicit sections for Overview/Bug Fixes plus a catch-all.
- Keep `--generate-notes` in the workflow.
- Validate labels for consistent categorization.

## Risks & Mitigations
- Risk: Template added without label alignment -> empty sections.
  - Mitigation: audit labels prior to adding .github/release.yml.
- Risk: Manual `gh release create` could auto-create an unsigned tag.
  - Mitigation: require pre-created signed tags and `--verify-tag`.
- Risk: Signing requirement blocks release if keys are missing.
  - Mitigation: document key setup and confirm the release maintainer has configured signing.

## Comms Plan
- Notify the release maintainer about the new signed tag requirement.
- Share a short checklist for signing setup and release note labeling.

## Next Review
- Date: 2026-01-13
- Agenda: confirm SOP adoption; schedule follow-up PR for template file.
