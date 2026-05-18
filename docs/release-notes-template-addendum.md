# Release Notes Addendum — Shipped Skills

Reviewed 2026-05-18: the release workflow contract still keeps shipped-skill highlights in the release overview path, with one-shot overview copy sourced from the signed annotated tag body rather than a committed override file.

When a release adds or updates bundled skills, include the shipped-skills highlight under **Overview** in the release notes. The release workflow promotes generated **Overview** and **Bug Fixes** into top-level release sections; **Documentation** remains in the generated **Full Changelog** and is not promoted as a shipped-skills highlight section. If a one-shot overview override is needed, put it in the signed annotated tag body so the shipped-skills highlight remains release-specific.

Example:
- Shipped new bundled skills: `collab-evals`, `collab-deliberation`, `delegate-early`.
- Install/refresh command: `codex-orchestrator skills install --force`.
- Include the docs link: `docs/skills-release.md`.
