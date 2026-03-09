# Next Slice Note

The next bounded Symphony-aligned follow-on should extract the shared question-read sequencing seam now that the retry rule is correct.

Recommended next slice:
- move the common "snapshot question state, run expiry, list questions, apply shared retry selector" flow behind a dedicated question-read service/helper used by both the authenticated route controller and Telegram oversight read adapter.

Why this seam is next:
- `1074` proved the API and Telegram read surfaces already share real autonomous coordination behavior;
- both surfaces still assemble that sequencing inline in separate call sites;
- extracting the shared question-read seam would reduce future drift without widening into Telegram rendering or broad controller rewrites.
