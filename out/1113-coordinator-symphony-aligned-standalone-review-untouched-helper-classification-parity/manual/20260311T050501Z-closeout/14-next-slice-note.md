# Next Slice Note - 1113

- The next truthful standalone-review reliability slice should target terminal verdict reliability after speculative hypothesis expansion, not helper-family semantics.
- `1113` closed the real review-owned helper parity cluster:
  - untouched `review-scope-paths` sibling reads now classify as `review-support`,
  - shared `docs-helpers` remain ordinary,
  - touched sibling reads stay ordinary,
  - startup-anchor handling is consistent with the sibling-family seam.
- The residual issue in `09-review.log` is that the wrapper still allows the reviewer to keep dwelling into non-concrete or hypothetical paths after the bounded diff has no new actionable findings.
- Frame the follow-on as an explicit stop-condition / terminal-verdict reliability seam for standalone review, with acceptance criteria centered on ending speculative dwell once repeated expansion stops producing concrete diff-local findings.
