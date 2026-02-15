# Bundled Skills Release + Install Guide

This guide defines how downstream users consume skills shipped with `@kbediako/codex-orchestrator`.

## What ships
- Bundled skills are stored under `skills/` in this repository and included in npm package files.
- Global user skills in `$CODEX_HOME/skills` should take precedence when present; bundled skills are fallback defaults.

## Install / refresh downstream
1. Install or upgrade package:
   - `npm install -g @kbediako/codex-orchestrator@latest`
2. Install bundled skills into Codex home:
   - `codex-orchestrator skills install`
3. Force refresh existing skill files (when release notes call it out):
   - `codex-orchestrator skills install --force`
4. Refresh only specific skills (avoid overwriting everything):
   - `codex-orchestrator skills install --only collab-subagents-first --force`
5. Verify expected skills exist:
   - `ls "$CODEX_HOME/skills"`

## Release-note requirement
- When a release adds or updates bundled skills, include them in release notes and link this guide.
- Example wording: `Shipped/updated bundled skills: <list>. Install with codex-orchestrator skills install --force`.

## Validation
- Run `npm run pack:audit` and `npm run pack:smoke` before release tags.
- Ensure `skills/**` changes appear in the generated tarball contents.
