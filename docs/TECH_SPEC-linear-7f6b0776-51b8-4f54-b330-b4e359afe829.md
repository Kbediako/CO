# TECH_SPEC - CO-364 RLM GPT-5.5 Route Posture

Canonical TECH_SPEC: `tasks/specs/linear-7f6b0776-51b8-4f54-b330-b4e359afe829.md`.

## Summary
- Align the RLM route default posture from `gpt-5.4` to `gpt-5.5` in `orchestrator/src/cli/rlm/alignment.ts`.
- Keep this as a CO-local RLM route fix, not a generic packaged default or spark role change.

## Scope
- In scope: `DEFAULT_ALIGNMENT_POLICY.route`, focused tests for default route posture and explicit override behavior, CO-364 docs/checklist mirrors.
- Out of scope: provider-worker/appserver behavior, CO-356 workflow files, CO-360 surfaces, `explorer_fast`, spark exceptions, cloud/release posture, and downstream templates.

## Validation
- Focused RLM tests.
- Spec/build/test/docs gates listed in `tasks/tasks-linear-7f6b0776-51b8-4f54-b330-b4e359afe829.md`.
