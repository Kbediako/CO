---
name: release
description: Ship a signed tag + GitHub Release + npm publish for @kbediako/codex-orchestrator with low-friction, agent-first steps (PR -> watch-merge -> tag -> watch publish -> downstream smoke).
---

# Release (CO Maintainer)

Use this skill when the user asks to ship a new CO version to npm/downstream users.
If a global `release` skill is installed, prefer that and fall back to this bundled skill.

Reviewed 2026-05-18: this bundled fallback remains aligned with the release SOP after local smoke on Codex CLI `0.130.0`; signed annotated tags, docs freshness, manifest-backed review, pack audit, and pack smoke remain required before publish. This smoke note is not a posture promotion; canonical version posture remains governed by `docs/guides/codex-version-policy.md`.

## Guardrails (required)

- Never publish from an unmerged branch: release tags must point at `main`.
- Release tags must be **signed annotated tags** (`git tag -s vX.Y.Z -m "vX.Y.Z"`).
- Confirm `gh auth status` is OK before any PR/release steps.
- Release is blocked unless commit/tag signing is configured on the release machine.
- Prefer non-interactive commands; avoid anything that can hang on prompts.
- Run the full release validation floor before tagging:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." npm run review`
  - `npm run pack:audit`
  - `npm run pack:smoke`
- Validate the package artifact from a clean `dist/` before tagging: `npm run clean:dist && npm run build`, then `npm run pack:audit` and `npm run pack:smoke`.
- Release/RC lanes should also run the full matrix: `npm run build:all`, `npm run test:adapters`, `npm run test:evaluation`, and `npm run eval:test` when fixtures/optional deps exist.
- If any check fails (Core Lane, Cloud Canary, CodeRabbit, release workflow), stop and fix before proceeding.

## Workflow

### 1) Preflight

```bash
gh auth status -h github.com
git status -sb
git checkout main
git pull --ff-only
git config commit.gpgsign
git config tag.gpgSign
```

If signing is not configured, stop and fix the release machine before continuing.

### 2) Version bump PR

Pick a version (usually patch): `0.1.N+1`.

```bash
VERSION="0.1.20"
BRANCH="task/release-${VERSION}"

git checkout -b "$BRANCH"
npm version "$VERSION" --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore(release): bump version to ${VERSION}"
git push -u origin "$BRANCH"
```

Open PR (use `--body-file` to avoid literal `\\n` rendering):

```bash
cat <<EOF > /tmp/pr-body.md
## What
- Bump version to ${VERSION}.

## Why
- Ship latest main to npm/downstream users.

## How Tested
- CI on this PR (Core Lane / Cloud Canary / CodeRabbit).
EOF

gh pr create --title "chore(release): bump version to ${VERSION}" --body-file /tmp/pr-body.md
```

Monitor + auto-merge once green:

```bash
PR_NUMBER="$(gh pr view --json number --jq .number)"
codex-orchestrator pr resolve-merge --pr "$PR_NUMBER" --auto-merge --delete-branch --quiet-minutes 1 --interval-seconds 20
```

If bundled skills changed, update the release notes copy before tagging:
- Keep the bundled-skill highlight under **Overview**. The workflow promotes generated **Overview** and **Bug Fixes** into top-level release-note sections and leaves **Documentation** under **Full Changelog**.
- Include `codex-orchestrator skills install --force`.
- Include the docs link `docs/skills-release.md`.
- If you want a one-shot manual overview narrative, put it in the signed annotated tag body, for example `git tag -s "$TAG" -m "$TAG" -m "Release overview text..."`. Do not use a committed overview file for this path.

### 3) Validate the package artifact

```bash
npm run clean:dist && npm run build
npm run pack:audit
npm run pack:smoke
```

### 4) Create signed tag + push

```bash
git checkout main
git pull --ff-only

TAG="v${VERSION}"
git tag -s "$TAG" -m "$TAG"
git tag -v "$TAG"
git push origin "$TAG"
```

If the tag-triggered workflow needs a manual rerun, use `workflow_dispatch` with `inputs.tag="$TAG"`. Manual dispatch still requires an existing signed tag; it is not a substitute for creating the tag.

### 5) Watch the release workflow + confirm npm publish

```bash
TAG_SHA="$(git rev-list -n 1 "$TAG")"
RUN_ID=""
for i in {1..30}; do
  RUN_ID="$(
    gh run list \
      --workflow release.yml \
      --limit 20 \
      --json databaseId,headBranch,headSha \
      --jq ".[] | select((.headBranch==\"${TAG}\") or (.headSha==\"${TAG_SHA}\")) | .databaseId" \
      | head -n 1 \
      || true
  )"
  if [[ -n "$RUN_ID" && "$RUN_ID" != "null" ]]; then
    break
  fi
  sleep 2
done
if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
  echo "::error::No release workflow run found for ${TAG}."
  exit 1
fi
gh run watch "$RUN_ID" --exit-status

npm view @kbediako/codex-orchestrator version
gh release view "v${VERSION}" --json url,assets --jq '{url: .url, assets: (.assets|map(.name))}'
```

Current workflow contract in `.github/workflows/release.yml`:
- CI tag verification requires exactly one signer secret: `RELEASE_SIGNING_PUBLIC_KEYS` (GPG) or `RELEASE_SIGNING_ALLOWED_SIGNERS` (SSH).
- The workflow rejects lightweight or unsigned tags and blocks tag/package version mismatches.
- Stable tags publish to npm `latest`; prerelease tags publish with a dist-tag derived from the prerelease label and create a GitHub prerelease.
- Generated release notes keep **Release Overview**, **Bug Fixes**, and **Full Changelog** sections; the signed annotated tag body overrides the Overview section when present.
- Publish prefers npm trusted publishing (OIDC with `--provenance`) and only falls back to `NPM_TOKEN` when OIDC fails.
- If `NPM_TOKEN` fallback is used, it must be an npm automation token, not an OTP-gated token.

### 6) Update global + downstream smoke

```bash
npm i -g @kbediako/codex-orchestrator@"${VERSION}"
codex-orchestrator --version

TMPDIR="$(mktemp -d)"
cd "$TMPDIR"
npx -y @kbediako/codex-orchestrator@"${VERSION}" --version
npx -y @kbediako/codex-orchestrator@"${VERSION}" pr resolve-merge --help | head -n 10
```

If the release included bundled skill changes, refresh local skills:

```bash
codex-orchestrator skills install --force
```

## Related skills
- `long-poll-wait`: for patience-first monitoring of release workflow/check runs until terminal state.
- `standalone-review`: for final targeted review checks before tag/publish.
