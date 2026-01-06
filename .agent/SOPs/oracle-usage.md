# SOP - Oracle Usage

## Goal
Standardize Oracle runs (browser mode) with reliable file batching and unique filenames.

## Oracle run rules (must follow)
1) Max 4 files per Oracle run. Do not exceed four `--file` entries.
2) Do not upload files with duplicate basenames (e.g., two `manifest.json`).
3) Keep the Chrome window open until Oracle completes. Closing it ends the run.
4) Prefer uploads: `--browser-attachments always`; if uploads fail, use inline or `--render --copy` and paste manually.

## Preflight checklist
- Run once per session: `npx -y @steipete/oracle --help`.
- Dry-run to confirm file count + sizes:
  - `npx -y @steipete/oracle --dry-run summary --files-report -p "<prompt>" --file "<path1>" --file "<path2>"`

## Batching strategy (4-file max)
- If you need more than 4 files, split into multiple runs and label them clearly with `--slug`.
- If basenames collide (e.g., `manifest.json`), copy and rename to a temp directory:
  - `mkdir -p /tmp/oracle-batch`
  - `cp path/a/manifest.json /tmp/oracle-batch/manifest-run-a.json`
  - `cp path/b/manifest.json /tmp/oracle-batch/manifest-run-b.json`

## Uploads + fallback
- Default to attachments with `--browser-attachments always`.
- If uploads fail or are blocked, use inline (`--browser-inline-files` or `--browser-attachments never`).
- If inline is too large, use `--render --copy` and paste manually.
- Hard inline cap: 255k chars. Recommend <=200k chars for safety. 256k+ fails with ChatGPT “message too long”.

## Canonical Oracle command (browser mode)
```
npx -y @steipete/oracle --engine browser --model gpt-5.2-pro \
  --browser-port 9222 \
  --browser-cookie-wait 5 \
  --browser-attachments always \
  --slug "<short-slug>" \
  -p "<prompt>" \
  --file "<file1>" \
  --file "<file2>" \
  --file "<file3>" \
  --file "<file4>"
```

## Session recovery
- List sessions: `npx -y @steipete/oracle status --hours 24`
- Reattach: `npx -y @steipete/oracle session <id> --render`

## Notes
- Always keep Oracle runs to 4 files max, and avoid duplicate basenames.
- Use `--render --copy` for manual paste if browser runs fail repeatedly.
- If uploads fail, fall back to inline or manual paste.
