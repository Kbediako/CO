---
name: release
description: Ship a signed tag + GitHub Release + npm publish for @kbediako/codex-orchestrator with low-friction, agent-first steps (PR -> watch-merge -> tag -> watch publish -> downstream smoke).
---

# Release (CO Maintainer)

Use this skill when the user asks to ship a new CO version to npm/downstream users.

## Guardrails (required)

- Never publish from an unmerged branch: release tags must point at `main`.
- Release tags must be **signed annotated tags** (`git tag -s vX.Y.Z -m "vX.Y.Z"`).
- Confirm `gh auth status` is OK before any PR/release steps.
- Prefer non-interactive commands; avoid anything that can hang on prompts.
- If any check fails (Core Lane, Cloud Canary, CodeRabbit, release workflow), stop and fix before proceeding.

## Workflow

### 1) Preflight

```bash
gh auth status -h github.com
git status -sb
git checkout main
git pull
```

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
codex-orchestrator pr watch-merge --pr "$PR_NUMBER" --auto-merge --delete-branch --quiet-minutes 1 --interval-seconds 20
```

### 3) Create signed tag + push

```bash
git checkout main
git pull

TAG="v${VERSION}"
git tag -s "$TAG" -m "$TAG"
git tag -v "$TAG"
git push origin "$TAG"
```

### 4) Watch the release workflow + confirm npm publish

```bash
RUN_ID="$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$RUN_ID" --exit-status

npm view @kbediako/codex-orchestrator version
gh release view "v${VERSION}" --json url,assets --jq '{url: .url, assets: (.assets|map(.name))}'
```

### 5) Update global + downstream smoke

```bash
npm i -g @kbediako/codex-orchestrator@"${VERSION}"
codex-orchestrator --version

TMPDIR="$(mktemp -d)"
cd "$TMPDIR"
npx -y @kbediako/codex-orchestrator@"${VERSION}" --version
npx -y @kbediako/codex-orchestrator@"${VERSION}" pr watch-merge --help | head -n 10
```

If the release included bundled skill changes, refresh local skills:

```bash
codex-orchestrator skills install --force
```

