# SOP - Oracle Usage

## Goal
Standardize Oracle runs (browser mode) with reliable file batching and unique filenames.

## Oracle run rules (must follow)
1) Repo policy: max 4 `--file` entries per Oracle run. If more are needed, split into multiple runs and label with `--slug`.
2) Tool limits: hard cap 20 attachments; target 18 (≈10% under cap). If 21+ files are provided, Oracle auto-bundles.
3) Do not upload files with duplicate basenames (e.g., two `manifest.json`).
4) Keep the Chrome window open until Oracle completes. Closing it ends the run.
5) Prefer attachments-first workflow: `--browser-attachments always`; if attachments fail, use inline or `--render --copy` and paste manually.

## Preflight checklist
- Ensure the Oracle repo is available (default: `../oracle` next to this repo) or set `ORACLE_ROOT=/path/to/oracle`.
- Run once per session: `./scripts/oracle-local.sh --help`.
- Dry-run to confirm file count + sizes:
  - `./scripts/oracle-local.sh --dry-run summary --files-report -p "<prompt>" --file "<path1>" --file "<path2>"`

## Batching strategy (repo policy: 4-file max)
- If you need more than 4 `--file` entries, split into multiple runs and label them clearly with `--slug`.
- If basenames collide (e.g., `manifest.json`), copy and rename to a temp directory:
  - `mkdir -p /tmp/oracle-batch`
  - `cp path/a/manifest.json /tmp/oracle-batch/manifest-run-a.json`
  - `cp path/b/manifest.json /tmp/oracle-batch/manifest-run-b.json`

## Attachments-first workflow
- Use the attachments-first workflow with `--browser-attachments always`.
- If attachments fail or are blocked, use inline (`--browser-inline-files` or `--browser-attachments never`).
- If inline is too large, use `--render --copy` and paste manually.
- Hard inline cap: 255k chars. Recommend <=200k chars for safety. 256k+ fails with ChatGPT “message too long”.

## Canonical Oracle command (browser mode)
```
./scripts/oracle-local.sh --engine browser --model gpt-5.2-pro \
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
- List sessions: `./scripts/oracle-local.sh status --hours 24`
- Reattach: `./scripts/oracle-local.sh session <id> --render`

## Notes
- Always keep Oracle runs to the repo policy (4 `--file` entries max) and avoid duplicate basenames.
- Use `--render --copy` for manual paste if browser runs fail repeatedly.
- If attachments fail, fall back to inline or manual paste.
