# Gemini Subagent Capabilities

> **Governance Note**: This file defines the **technical capability** ("How-To") of spawning subagents. For the **governance strategy** ("When/Why") and the architectural role of Gemini as the Manager, please refer to [GEMINI_ORCHESTRATOR.md](./GEMINI_ORCHESTRATOR.md).

This repository runs in an environment where the `gemini` CLI is installed globally. This allows the current agent to spawn "subagents"—independent instances of the Gemini CLI—to perform parallel tasks or isolated operations.

## How to Spawn a Subagent

You can use the `run_shell_command` tool to invoke the `gemini` executable.

### Critical Considerations

1.  **Non-Interactive Mode**: Subagents must run without requiring user confirmation for every tool call, as the parent agent cannot easily interact with the subagent's `stdin` dynamically.
    *   Use the `--yolo` flag to automatically accept all tool actions.
2.  **Model Selection**: To ensure consistent behavior (e.g., using Gemini 3 Preview), set the `GEMINI_MODEL` environment variable or use the `--model` flag.
    *   Verified ID: `gemini-3-pro-preview`
3.  **Context**: Each subagent call starts a **fresh session**. It does not inherit memory or conversation history from the parent or previous subagent calls.
4.  **Output**: You can capture the subagent's output (stdout) to read its results.

## Environment Configuration

To set the default model for all subagent calls (and your own interactive sessions), export the `GEMINI_MODEL` variable:

```bash
export GEMINI_MODEL="gemini-3-pro-preview"
```

## Best Practices

### 1. Fire-and-Forget (Side Effects)
Use this for tasks where the subagent modifies files or performs actions, and you just need to know it finished.

```bash
# Spawn a subagent to perform a task (e.g., writing a file)
gemini "Analyze package.json and write a summary to deps_summary.md" --yolo
```

### 2. Query/Response (Information Retrieval)
Use this when you need the subagent to return an answer that you can parse. The `--output-format json` flag ensures the output is structured.

```bash
# Spawn a subagent to answer a question
gemini "What is the capital of France?" --yolo --output-format json
```

**Parsing the Output:**
When using `--output-format json`, the stdout will be a JSON object. The main answer is in the `response` field.
```json
{
  "response": "The capital of France is Paris.",
  "stats": { ... }
}
```

### Use Cases

#### 1. Risk Isolation (The "Sandbox" Approach)
Run risky or uncertain operations in a separate process. If the subagent crashes or fails, the main orchestrator remains stable.
*   **Running Unverified Code**: "Generate a python script to parse this CSV and run it. Return the error if it fails."
*   **Exploratory Refactoring**: "Try to refactor this function in a temporary file. If tests pass, report success."
*   **Tool Hallucination Checks**: Verify if a specific tool or command exists before the main agent attempts to use it.

#### 2. Context Window Management
Delegate large data processing to keep the main agent's context clean and focused.
*   **Large File Analysis**: "Read this 500-line log file and return only the 3 most critical errors."
*   **Documentation Lookup**: "Read the `docs/` folder and explain how to add a new route." (Returns just the answer, not the full text).

#### 3. Parallelism (Speed)
Execute independent tasks simultaneously using background processes (`&`).
*   **Multi-File Generation**: Spawn one agent to write the frontend component and another to write the backend API simultaneously.
*   **Test Generation**: While the main agent writes the implementation, a subagent writes the corresponding unit tests.

#### 4. "Red Teaming" & Self-Correction
Use a fresh, unbiased agent to review work.
*   **Code Review**: "I just wrote this function. Review it for bugs and security flaws." (Unbiased by the author's intent).
*   **Spec Compliance**: "Read the PRD and the code. Does the implementation actually meet the requirements?"

#### 5. Recursive Task Decomposition (Project Management)
The main agent acts as an Orchestrator/Manager, breaking down complex goals into subtasks for "Worker" agents.
*   **Manager**: "We need a database schema, an API, and a frontend."
*   **Workers**: Individual agents execute each specific task.
*   **Manager**: Integrates the outputs from all workers.
