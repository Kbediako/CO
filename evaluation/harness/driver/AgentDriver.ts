import type { AgentTask, ScenarioGoalResult } from '../types.js';
import { logger } from '../../../orchestrator/src/logger.js';

import { promises as fs } from 'node:fs';
import path from 'node:path';

export class AgentDriver {
    constructor(private readonly workspace: string) { }

    async runTask(task: AgentTask): Promise<ScenarioGoalResult> {
        const startedAt = Date.now();
        logger.info(`[AgentDriver] Starting task in ${this.workspace}: ${task.instruction}`);

        // Initialize git to track changes
        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(exec);

        try {
            await execAsync('git init && git add . && git commit -m "Initial state"', { cwd: this.workspace });
        } catch (e) {
            // Ignore if git fails (e.g. no git installed), but log it
            logger.warn(`[AgentDriver] Failed to init git: ${e}`);
        }

        // TODO: Integrate with actual Orchestrator/Agent API
        // For now, this is a mock implementation that simulates agent activity
        // In a real implementation, this would call `codex-orchestrator start ...` or similar

        // Mock capability for testing: WRITE|path|content
        if (task.instruction.startsWith('WRITE|')) {
            const parts = task.instruction.split('|');
            if (parts.length >= 3) {
                const filePath = parts[1];
                const content = parts.slice(2).join('|');
                await fs.writeFile(path.join(this.workspace, filePath), content);
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work

        // Capture diff
        let solutionPatch: string | undefined;
        try {
            const { stdout } = await execAsync('git diff', { cwd: this.workspace });
            logger.info(`[AgentDriver] git diff output length: ${stdout.length}`);
            if (stdout.trim()) {
                solutionPatch = stdout;
            } else {
                logger.warn('[AgentDriver] git diff is empty');
            }
        } catch (e) {
            logger.warn(`[AgentDriver] Failed to capture diff: ${e}`);
        }

        return {
            goal: 'agent-task' as any, // Custom goal type
            command: {
                id: 'agent-driver' as any,
                title: 'Agent Driver',
                description: 'Executes agent task',
                requiresCleanFixture: false,
                supportsParallel: false,
                command: 'agent-driver',
                args: [task.instruction],
                env: {},
                cwd: this.workspace
            },
            status: 'passed',
            exitCode: 0,
            stdout: `[Mock Agent] Executed: ${task.instruction}`,
            stderr: '',
            durationMs: Date.now() - startedAt,
            solutionPatch
        };
    }
}
