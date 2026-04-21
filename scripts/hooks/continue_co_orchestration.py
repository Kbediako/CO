#!/usr/bin/env python3
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional

STATE_PATH = Path(
    os.environ.get(
        "CO_ORCHESTRATION_AUTOCONTINUE_STATE_PATH",
        "/Users/kbediako/.codex/hooks/co_orchestration_autocontinue.json",
    )
)

DONE_SENTINEL = "CO_ORCHESTRATOR_DONE"
CRITICAL_BLOCKER_SENTINEL = "CO_ORCHESTRATOR_CRITICAL_BLOCKER"
DESTRUCTIVE_DECISION_SENTINEL = "CO_ORCHESTRATOR_DESTRUCTIVE_DECISION_REQUIRED"
STOP_SENTINELS = {
    DONE_SENTINEL,
    CRITICAL_BLOCKER_SENTINEL,
    DESTRUCTIVE_DECISION_SENTINEL,
}
STOP_CONTROL_PATTERN = re.compile(
    r"^CO_ORCHESTRATOR_STOP:\s*("
    r"CO_ORCHESTRATOR_DONE|"
    r"CO_ORCHESTRATOR_CRITICAL_BLOCKER|"
    r"CO_ORCHESTRATOR_DESTRUCTIVE_DECISION_REQUIRED"
    r")$"
)


def load_state() -> Dict[str, Any]:
    if not STATE_PATH.exists():
        return {"enabled": False}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"enabled": False}


def save_state(state: Dict[str, Any]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def emit(payload: Dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload))


def parse_structured_stop_sentinel(last_message: str) -> Optional[str]:
    for raw_line in reversed(last_message.splitlines()):
        line = raw_line.rstrip()
        if not line:
            continue
        match = STOP_CONTROL_PATTERN.fullmatch(line)
        return match.group(1) if match else None
    return None


def parse_max_in_progress(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 4


def is_inside_repo(cwd: str, repo_root: str) -> bool:
    try:
        cwd_path = Path(cwd).expanduser().resolve(strict=False)
        repo_path = Path(repo_root).expanduser().resolve(strict=False)
    except Exception:
        return False
    return cwd_path == repo_path or repo_path in cwd_path.parents


def main() -> int:
    try:
        event = json.load(sys.stdin)
        state = load_state()
        if not state.get("enabled", False):
            emit({"continue": True})
            return 0

        repo_root = str(state.get("repo_root", "")).strip()
        cwd = str(event.get("cwd", "")).strip()
        if not repo_root or not cwd or not is_inside_repo(cwd, repo_root):
            emit({"continue": True})
            return 0

        last_message = str(event.get("last_assistant_message") or "")
        stop_sentinel = parse_structured_stop_sentinel(last_message)
        if stop_sentinel in STOP_SENTINELS:
            state["enabled"] = False
            save_state(state)
            emit({"continue": True})
            return 0

        max_in_progress = parse_max_in_progress(state.get("max_in_progress", 4))
        resume_prompt = (
            "Resume CO orchestration mode. "
            "Rebuild live context from Linear, GitHub, provider-intake-state, manifests, and co-status. "
            f"Do not let more than {max_in_progress} issues be In Progress at once. "
            "Shepherd backlog, blocked, in review, merging, and rework issues end to end. "
            "Use subagents for queue audit, blocker validation, PR readiness, and bug discovery. "
            "Only stop by ending the assistant message with one exact unquoted structured control line: "
            "CO_ORCHESTRATOR_STOP: <sentinel>. "
            f"Use CO_ORCHESTRATOR_STOP: {CRITICAL_BLOCKER_SENTINEL} only for a true critical blocker that needs the user; "
            "do not use it for read-only mode or approval_policy=never limitations when work can continue by reporting or monitoring. "
            f"Use CO_ORCHESTRATOR_STOP: {DESTRUCTIVE_DECISION_SENTINEL} only for a destructive decision requiring user approval. "
            f"Use CO_ORCHESTRATOR_STOP: {DONE_SENTINEL} only when all issues are done. "
            "Quoted or explanatory sentinel text is not a stop signal. "
            "Otherwise do not end the turn; keep orchestrating and monitoring."
        )
        emit({"decision": "block", "reason": resume_prompt})
        return 0
    except Exception as exc:
        emit(
            {
                "continue": True,
                "systemMessage": f"CO auto-continue hook failed open: {type(exc).__name__}: {exc}",
            }
        )
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
