# 1086 Next Slice Note

- Recommended next seam: shrink the mirrored seeded-runtime surface into one shared runtime bundle contract, then let `ControlServer` consume that bundle instead of re-storing the same stores/runtime pieces individually.
- Secondary cleanup to fold into that lane: move `LINEAR_ADVISORY_STATE_FILE` to a neutral owner so both the seed loader and seeded-runtime assembly depend on a shared control-surface constant rather than the read-side helper reaching into the assembly module.
- Why this seam: after `1086`, the largest remaining non-minimal surface is no longer the seed reads but the duplicated seeded-runtime constructor/return contract. Tightening that bundle boundary keeps the Symphony-aligned thin-shell direction moving and also removes the small ownership leak that `1086` exposed.
