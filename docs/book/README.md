# Codex Orchestrator Book

This folder keeps the long-form public and maintainer guidance out of the GitHub front door while preserving stable links for operators and reviewers.

## Contents

- [Setup](setup.md): npm baseline, Codex marketplace/plugin install, rollback, downstream bootstrap, and provider onboarding links
- [Operations](operations.md): common commands, run artifacts, workflow modes, and review handoff expectations
- [Bundled Skills](skills.md): install behavior and pointer to the canonical roster in [skills/README.md](../../skills/README.md)
- [Public Posture](public-posture.md): current compatibility target, model/runtime posture, and evidence gates
- [Local Hook Impact](local-hook-impact.md): evidence for the local CO auto-continue hook and whether it affects subagents/provider agents
- [Historical Codex CLI 0.124.0 Evidence](archive/codex-cli-0124-adoption.md): archive-only CO-341/CO-345 evidence for the `0.124.0` step; see the canonical version policy for the current local `0.130.0` ChatGPT-auth appserver/model posture, package/downstream-smoke `0.125.0` compatibility hold, and cloud-only `0.124.0` candidate split

## Navigation Contract

- Keep the root [README.md](../../README.md) concise.
- Put detailed setup and posture guidance in this folder or in the focused public guides under [docs/public](../public/).
- Keep canonical version-policy decisions in [docs/guides/codex-version-policy.md](../guides/codex-version-policy.md) and summarize them here instead of duplicating the full policy.
- Keep task-specific evidence in the task packet; link to durable summaries when a future operator needs the decision context.
