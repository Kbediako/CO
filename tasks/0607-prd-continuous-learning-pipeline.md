# PRD — Continuous Learning Pipeline (Task 0607)

## 1. Executive Summary
This document proposes the architecture for a **Continuous Learning Pipeline** that transforms the AI agent from a task executor into a self-improving engineer. By integrating a "Work -> Approve -> Learn -> Crystalize" workflow directly into the development lifecycle, the system will automatically harvest knowledge from daily work, validate it, and crystalize it into a shared "Pattern Library" for future use.

## 2. Problem Statement
*   **Knowledge Loss:** Valuable problem-solving patterns discovered during daily tasks are often lost once the PR is merged.
*   **Manual Friction:** The loop must default on; `LEARNING_PIPELINE_ENABLED=1` now auto-triggers harvesting + validation after approvals, replacing manual `tfgrpo-runner` invocations.
*   **Inconsistency:** New agents/sessions start with a blank slate, often reinventing the wheel or re-introducing previously solved anti-patterns.

## 3. Goals
1.  **Zero-Friction Learning:** Learning runs are triggered automatically upon task completion/approval.
2.  **Shared Brain:** Create a persistent "Pattern Library" (Knowledge Base) that accumulates wisdom over time.
3.  **Self-Reflection:** Agents actively identify novel patterns in their own work and initiate the learning process.

## 4. Proposed Architecture

### 4.1. The Workflow
The pipeline consists of four distinct phases:

1.  **Execution (The Work):** The agent completes a user request (e.g., "Fix bug X").
2.  **Trigger (The Handover):** Upon user approval (or self-validation), the agent triggers a background "Learning Task." **Crucially, this captures a snapshot of the repository state to ensure consistency.** With `LEARNING_PIPELINE_ENABLED=1`, the harvester runs automatically after a successful CLI stage, packaging the working tree (tracked + untracked, gitignore respected) into `.runs/<task-id>/cli/<run-id>/learning/<run-id>.tar.gz` and copying it to `learning-snapshots/<task-id>/<run-id>.tar.gz` (recorded as `learning.snapshot.storage_path`).
3.  **Validation (The Lab):** A background runner (`tfgrpo-runner`) isolates the change, creates a temporary scenario, and stress-tests/optimizes the solution to ensure it is robust and generalizable. Scenario synthesis replays the most recent successful command first, writes `learning/scenario.json`, and immediately executes the scenario; validation logs live at `learning/scenario-validation.log` (`learning.validation.log_path`) and statuses flow into `learning.validation.status` (`validated`, `snapshot_failed`, `stalled_snapshot`, `needs_manual_scenario`).
4.  **Crystalization (The Library):** A "Crystalizer" component summarizes the validated solution into a reusable **Knowledge Artifact** (Markdown Pattern).

### 4.2. Key Components

#### A. The Harvester (Trigger & Snapshot)
*   **Role:** Captures the context (Prompt), the Result (Git Diff), and the **State (Snapshot)** from a completed task.
*   **Mechanism:** Integrated into `AgentDriver` or via a `/learn` slash command.
*   **Snapshot Consistency:**
    *   To avoid race conditions (e.g., user rebasing or editing files after approval), the Harvester must capture an **Immutable Snapshot**.
    *   **Method:** Create a temporary git tag (e.g., `learning-snapshot-<uuid>`) and a tarball of the working directory at the moment of approval (`.runs/<task-id>/cli/<run-id>/learning/<run-id>.tar.gz`) while copying to `learning-snapshots/<task-id>/<run-id>.tar.gz`.
    *   The Runner will checkout this specific tag/commit before applying any logic, ensuring it validates exactly what the user approved; manifests record `learning.snapshot.{tag,commit_sha,tarball_path,tarball_digest,storage_path,retention_days}`.
*   **Logic:**
    *   Detects "Task Complete" state.
    *   **Captures Snapshot:** Tags the current commit and writes the tarball digest + `storage_path`.
    *   Extracts the relevant file changes (diff).
    *   Queues a job for the Runner with `(snapshot_id, diff_path, prompt_path, execution_history_path, manifest_path)` stored in `learning/queue-payload.json` (`learning.queue.payload_path`).
*   **Failure Handling & Escalation:**
    *   Persist snapshot metadata alongside the queue record so the Runner can verify integrity before applying any patch.
    *   If tag creation, tarball copy, or queue enqueue fails, mark the job as `snapshot_failed`, retry with backoff (max 2 attempts), and emit an alert to the operator channel before dropping the task.
    *   When the Runner cannot checkout the snapshot or apply the diff cleanly, mark the job as `stalled_snapshot` with logs, attach the failing git status to the `.runs/<task-id>/.../manifest.json`, and block re-queueing until a human approves the remediation.
    *   Manual recovery follows `.agent/SOPs/incident-response.md`: confirm the recorded `learning.snapshot.commit_sha` + `tarball_digest`, rebuild the tarball if needed, and re-queue with an explicit approver id to preserve the audit trail.

#### B. The Runner (Validator & Scenario Synthesis)
*   **Role:** Scientifically validates the pattern.
*   **Mechanism:** Existing `tfgrpo-runner.ts` enhanced with **Heuristic Scenario Generation**.
*   **Scenario Synthesis:**
    *   **Problem:** A raw diff is not enough to run a test.
    *   **Solution:** Use heuristics to infer the execution context from the `ExecutionHistory` (commands run by the agent during the task).
    *   **Data Sources (ordered):**
        *   ExecutionHistory with exit codes and timestamps.
        *   Task prompt + acceptance criteria captured in the run manifest.
        *   Git diff analysis to locate changed entrypoints (tests, CLI tools, background jobs) and touched packages/services.
        *   Stack templates from `.agent/task/templates/` to seed defaults when explicit commands are missing.
    *   **Heuristics:**
        *   **Entrypoint:** Identify the test file modified or run during the task (e.g., `npm test src/foo.test.ts`). For non-test diffs, select the nearest runnable surface (CLI command, script, background worker harness) based on file paths and package scripts.
        *   **Commands:** Replay the successful verification commands used by the agent; if none, replay last-known-good commands for the same package or service.
        *   **Dependencies:** Parse `package.json` or `requirements.txt` if modified and include required setup (install/build) in the synthesized scenario.
    *   **Fallback & Manual Path:**
        *   If heuristic generation fails after two attempts, mark the job as `needs_manual_scenario`, emit the partial `scenario.json` to `.runs/<task-id>/.../manifest.json`, and notify the operator channel.
        *   A human reviewer supplies the missing fields (setup commands, entrypoint, env vars, fixtures) using `.agent/task/templates/manual-scenario-template.md`, signs the manifest, and re-queues the run. No learning run proceeds without that acknowledgement.
*   **Validation:** Runs the synthesized scenario to confirm the patch passes tests in isolation, logging to `learning/scenario-validation.log` (`learning.validation.log_path`) and updating `learning.validation.status` to `validated`, `snapshot_failed`, `stalled_snapshot`, or `needs_manual_scenario`.

#### C. The Crystalizer (Author)
*   **Role:** Turns code into knowledge.
*   **Mechanism:** A new LLM-based script.
*   **Input:** The "Best Patch" from the Runner + The original Problem Statement.
*   **Output:** A Markdown file in `.agent/patterns/candidates/`.
*   **Format:**
    *   **Problem:** Context description.
    *   **Solution:** The optimized code pattern.
    *   **Rationale:** Why this is the preferred approach.

#### D. The Pattern Library (Storage & Governance)
*   **Location:** `.agent/patterns/` is the canonical source of truth; `docs/patterns/` may host read-only summaries/links only.
*   **Governance (Human-in-the-Loop):**
    *   **Candidate State:** New patterns are saved to `.agent/patterns/candidates/` by default. They are **not** loaded by agents yet.
    *   **Review:** A human (or a senior "Librarian" agent) reviews candidates.
    *   **Promotion:** Validated patterns are moved to `.agent/patterns/active/`.
    *   **Deprecation:** Patterns can be moved to `deprecated/` if they become obsolete or harmful.
*   **Usage:** Agents only index patterns from `active/`.

## 5. User Experience

### Scenario: Fixing a Bug
1.  **User:** "Fix the N+1 query in `users.ts`."
2.  **Agent:** Fixes it. Tests pass.
3.  **User:** "LGTM."
4.  **Agent:** "Great! I've merged the fix. **I also noticed this is a reusable optimization pattern, so I've queued a learning run to document it.**"
5.  *(Background)*: System captures snapshot `learning-snapshot-123`.
6.  *(Background)*: Runner checks out snapshot, infers `npm test users.test.ts` was the verification command, and verifies the fix.
7.  *(Background)*: Crystalizer creates `.agent/patterns/candidates/api-optimization.md`.
8.  *(Later)*: User reviews the candidate and promotes it to `active/`.
9.  *(Next Week)*: **User:** "Create a `posts.ts` endpoint."
10. **Agent:** "Checking Pattern Library... I see we use `Promise.all` for optimizations. I'll apply that pattern here."

## 6. Implementation Plan
1.  **Phase 1: The Harvester:** Build the logic to extract `scenario.json` from a git diff and capture snapshots.
2.  **Phase 2: The Runner Upgrades:** Implement heuristic scenario generation and command replay.
3.  **Phase 3: The Crystalizer:** Build the script to generate Pattern Markdown from code.
4.  **Phase 4: Governance:** Implement the Candidate/Active folder structure and review workflow.

## 7. Success Metrics
*   **Validation Quality:** Pass/fail rate of learning runs, with root causes for failures (snapshot integrity, scenario synthesis, test failures) and time-to-resolution for `stalled_snapshot` events.
*   **Reviewer Safeguards:** Candidate rejection rate and median review latency for `.agent/patterns/candidates/` before promotion to `active/`.
*   **Regression Detection:** Number of regressions caught during validation versus those escaping to production; time-to-detect when a candidate causes a regression.
*   **Pattern Hygiene:** Count of deprecated patterns and instances of deprecated patterns being reintroduced, plus the cycle time to remove them from circulation.
*   **Throughput:** Pattern count and reuse rate, monitored after the above safety metrics so volume never overrides correctness.
