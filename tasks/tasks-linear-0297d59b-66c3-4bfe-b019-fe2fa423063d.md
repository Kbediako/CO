# Task Checklist - linear-0297d59b-66c3-4bfe-b019-fe2fa423063d
- Issue: `CO-306` / `0297d59b-66c3-4bfe-b019-fe2fa423063d`; canonical task: `20260422-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d`; docs: `docs/PRD-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d.md`, `tasks/specs/linear-0297d59b-66c3-4bfe-b019-fe2fa423063d.md`, `docs/ACTION_PLAN-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d.md`
## Progress
- [x] Docs packet created and registry mirrors updated.
- [x] Docs-review or truthful fallback recorded.
- [ ] Apr 22 live failure shapes reproduced and root cause isolated.
- [ ] Same-attempt parity retry suppression restored.
- [ ] Parent-dirty child-lane launch guidance restored.
- [ ] Focused regression coverage proves both guarantees.
- [ ] PR/workpad evidence attached and review threads closed or waived before final handoff.
## Notes
- The docs child packet was imported by the parent after accept failed closed on `updated_at` drift; the lane remains strictly bounded to restoring the live CO-185 helper-preflight guarantees.
