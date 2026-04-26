# Codex CLI Release-Intake Issue Template

Use this template for every future Codex CLI release-intake issue. One issue owns the release decision, supersession record, current-facing docs posture, and closeout classification.

## Intent Checksum
- Candidate Codex CLI release:
- Previous current release posture:
- Scope boundaries:
- Non-goals:
- Not Done If:

## Release Evidence Axes
- [ ] local CLI evidence: installed or candidate executable version, command-surface smoke, and local auth/provider constraints.
- [ ] package/downstream smoke evidence: package install, marketplace/plugin smoke, and downstream workflow compatibility.
- [ ] cloud-canary evidence: required cloud canary result, fallback cloud contract result, and any explicit hold reason.
- [ ] workflow pins evidence: every release-facing workflow pin, cloud-canary pin, package-smoke pin, and intentional hold.
- [ ] model posture evidence: current local model posture, delegated/review posture, portable fallback posture, and unsupported-provider notes.
- [ ] docs surfaces evidence: README, book index, public posture docs, downstream setup docs, version policy, docs catalog, evidence pages, and task packets.
- [ ] release notes evidence: official release notes, npm version/time, local help deltas, and classified CO impact.

## Supersedes / Holds Matrix
Every prior release evidence page and posture surface must have one row before closeout.

| Surface | Prior release evidence page or posture surface | Classification | Reason | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| local CLI |  | superseded / adopt latest / intentionally hold / demote/archive-only |  |  |  |
| package/downstream smoke |  | superseded / adopt latest / intentionally hold / demote/archive-only |  |  |  |
| cloud-canary |  | superseded / adopt latest / intentionally hold / demote/archive-only |  |  |  |
| workflow pins |  | superseded / adopt latest / intentionally hold / demote/archive-only |  |  |  |
| model posture |  | superseded / adopt latest / intentionally hold / demote/archive-only |  |  |  |
| docs surfaces |  | superseded / adopt latest / intentionally hold / demote/archive-only |  |  |  |
| release notes |  | superseded / adopt latest / intentionally hold / demote/archive-only |  |  |  |

## Closeout Classification
- [ ] Adopt latest: list every surface that now adopts the candidate release.
- [ ] Intentionally hold: list every surface that keeps an older release and cite the blocking evidence.
- [ ] Demote/archive-only: list every historical evidence page removed from current-facing navigation or classified as archive-only.
- [ ] Stale current-facing docs are classified, demoted, or linked to a blocking follow-up.
- [ ] Workflow pins remain unclassified nowhere: every pin is either updated, intentionally held, or linked to a blocking follow-up.
- [ ] Release-intake closeout states which surfaces adopt latest, which intentionally hold, and which docs are demoted/archive-only.

## Closure Gate
- [ ] No stale current-facing docs remain unclassified.
- [ ] No workflow pins remain unclassified.
- [ ] No prior release evidence page remains current-facing without a deliberate supersedes/holds row.
- [ ] No model posture surface carries forward a stale claim without a current evidence row.
- [ ] Any out-of-scope cleanup is filed as a linked follow-up instead of expanding this release-intake issue.
