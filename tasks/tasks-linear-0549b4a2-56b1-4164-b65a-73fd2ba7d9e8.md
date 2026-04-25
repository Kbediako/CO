# Task Checklist - linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8

- Linear Issue: `CO-338` / `0549b4a2-56b1-4164-b65a-73fd2ba7d9e8`
- MCP Task ID: `linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8`
- Primary PRD: `docs/PRD-linear-0549b4a2-release-publish-workflow-fix.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-0549b4a2-release-publish-workflow-fix.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0549b4a2-release-publish-workflow-fix.md`
- Source anchor: `ctx:sha256:f3219348160765aa3ff9c69d862bb95a512a169bc4c1a4e5a794a8754b5f7c19#chunk:c000001`
- Origin manifest: `.runs/linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8-docs-packet/cli/2026-04-23T18-52-23-912Z-060c3757/manifest.json`

## Docs-First
- [x] Source payload availability checked. Evidence: provided `.runs/.../source-0/source.txt` path was not present in this child checkout.
- [x] PRD drafted for CO-338 release publish workflow fix. Evidence: `docs/PRD-linear-0549b4a2-release-publish-workflow-fix.md`.
- [x] TECH_SPEC drafted with protected terms, release workflow contract, `v0.2.0` recovery decision, and CO-316 blocking requirement. Evidence: `docs/TECH_SPEC-linear-0549b4a2-release-publish-workflow-fix.md`.
- [x] ACTION_PLAN drafted for parent workflow repair, publish verification, and release recovery. Evidence: `docs/ACTION_PLAN-linear-0549b4a2-release-publish-workflow-fix.md`.
- [x] `tasks/index.json` updated under canonical `items[]`. Evidence: `tasks/index.json`.

## Workflow Contract
- [x] Failure identifiers preserved. Evidence: packet references run `24850552467` / job `72749842900`.
- [x] Root cause preserved. Evidence: packet references missing `promise-retry` during `npm install --global npm@^11.5.1`.
- [x] Trusted publishing remains the preferred path. Evidence: packet preserves `npm publish ... --provenance` and rejects removing trusted publishing.
- [x] `v0.2.0` half-shipped recovery decision documented. Evidence: PRD parity matrix and ACTION_PLAN milestone 5.
- [x] `CO-316` remains blocked until npm publication is complete. Evidence: PRD, TECH_SPEC, and ACTION_PLAN protected terms and acceptance gates.

## Parent-Owned Follow-On
- [x] Parent confirms failure evidence from GitHub Actions run `24850552467` / job `72749842900`. Evidence: `gh run view 24850552467 --repo Kbediako/CO --job 72749842900 --log` showed Node `v22.22.2`, npm `10.9.7`, and `MODULE_NOT_FOUND: promise-retry` before `Publish to npm`.
- [x] Parent confirms the current post-PR #627 retry failure. Evidence: `gh run view 24852631649 --repo Kbediako/CO --log-failed` showed `gh release create` failed because release `v0.2.0` already exists.
- [x] Parent implements the smallest workflow fix that removes the missing-`promise-retry` prerequisite failure and repairs the existing-release rerun blocker. Evidence: `.github/workflows/release.yml` pins Node.js `24.5.0` with a Node/npm version guard, runs `npm publish` directly, repairs existing GitHub Release metadata with `gh release edit`, and preserves the existing expected release tarball asset when present.
- [ ] Parent reruns or dispatches the release publish workflow and verifies it reaches `Publish to npm`.
- [ ] Parent verifies actual `npm publish` for the intended release tarball.
- [ ] Parent verifies npm registry publication for the intended version/dist-tag.
- [ ] Parent keeps `CO-316` blocked until npm publication is confirmed.
- [ ] Parent records docs-review, implementation validation, PR, and release lifecycle evidence.

## Validation
- [x] Child scoped JSON parse check for `tasks/index.json`. Evidence: `node -e "const fs=require('node:fs'); const idx=JSON.parse(fs.readFileSync('tasks/index.json','utf8')); const entry=idx.items.find(x=>x.id==='linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8'); if(!entry) throw new Error('missing CO-338 index entry');"`.
- [x] Child protected-term scan across declared files. Evidence: `rg -n "CO-338|24850552467|72749842900|promise-retry|npm install --global npm@\\^11\\.5\\.1|trusted publishing|actual npm publish step|half-shipped|v0\\.2\\.0|CO-316" ...`.
- [x] Child scoped whitespace/diff check. Evidence: `git diff --check -- docs/PRD-linear-0549b4a2-release-publish-workflow-fix.md docs/TECH_SPEC-linear-0549b4a2-release-publish-workflow-fix.md docs/ACTION_PLAN-linear-0549b4a2-release-publish-workflow-fix.md tasks/tasks-linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8.md tasks/index.json`.
- [x] Parent docs-review / review gate before implementation handoff. Evidence: manifest-backed standalone review completed with `review_outcome: bounded-success` in `.runs/linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8/cli/2026-04-23T18-05-18-016Z-b61e07e6/review/telemetry.json` after the asset-fallback P2 was fixed.
- [x] Parent local release workflow contract validation after implementation. Evidence: `npx vitest run --config vitest.config.core.ts tests/pack-smoke.spec.ts`, `npm run test`, `npm run pack:smoke`, and `npm run pack:audit`.

## Progress Log
- 2026-04-23: bounded same-issue child lane created the CO-338 docs-first packet and task registration only. No workflow, package, script, Linear, workpad, or PR lifecycle edits were made.
- 2026-04-23: parent implemented the release workflow fix, preserved the existing `v0.2.0` tarball asset when present, kept the build-artifact fallback reachable when the release asset is not found, and completed local gates plus bounded standalone review.

## Notes
- Do not edit `.github/workflows/release.yml` in this child lane.
- Do not remove trusted publishing or `--provenance` to make the job green.
- Do not mark `CO-316` unblocked until npm publication is complete.
