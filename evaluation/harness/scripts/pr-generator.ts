import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
interface GoalResult {
    goal: string;
    status: string;
    durationMs: number;
    solutionPatch?: string;
}

interface SampleResult {
    scenarioId: string;
    reward?: {
        gtScore: number;
    };
    goals: GoalResult[];
    scenario?: { id: string }; // For compatibility if full result
}

interface InputData {
    epochs?: { samples: SampleResult[] }[];
    samples?: SampleResult[];
}

const execAsync = promisify(exec);

interface PrGeneratorOptions {
    inputFile: string;
    scoreThreshold: number;
    dryRun: boolean;
}

async function generatePrs(options: PrGeneratorOptions) {
    console.log(`Reading input file: ${options.inputFile}`);
    const content = await fs.readFile(options.inputFile, 'utf8');
    const data: InputData = JSON.parse(content);

    // Handle both single epoch result and full schedule result
    const samples: SampleResult[] = data.samples || (data.epochs ? data.epochs.flatMap(e => e.samples) : []);

    if (!samples.length) {
        console.log('No samples found.');
        return;
    }

    console.log(`Found ${samples.length} samples. Filtering for score >= ${options.scoreThreshold}...`);

    const highQualitySamples = samples.filter(s => {
        const gtScore = s.reward?.gtScore ?? 0;
        return gtScore >= options.scoreThreshold;
    });

    console.log(`Found ${highQualitySamples.length} high-quality samples.`);

    // Deduplicate by scenarioId (take the highest score or first one)
    const bestSamples = new Map<string, SampleResult>();
    for (const sample of highQualitySamples) {
        const scenarioId = sample.scenarioId || sample.scenario?.id;
        if (!scenarioId) continue;

        const existing = bestSamples.get(scenarioId);
        if (!existing || (sample.reward?.gtScore ?? 0) > (existing?.reward?.gtScore ?? 0)) {
            bestSamples.set(scenarioId, sample);
        }
    }

    console.log(`Processing ${bestSamples.size} unique scenarios...`);

    for (const sample of bestSamples.values()) {
        const scenarioId = sample.scenarioId || sample.scenario?.id;
        if (!scenarioId) continue;

        const score = sample.reward?.gtScore;
        const agentTask = sample.goals.find(g => g.goal === 'agent-task');
        const patch = agentTask?.solutionPatch;

        if (!patch) {
            console.warn(`[${scenarioId}] High score (${score}) but no solution patch found. Skipping.`);
            continue;
        }

        const branchName = `learning/${scenarioId}-optimization`;
        const commitMessage = `feat: optimize ${scenarioId} (score: ${score})`;

        console.log(`[${scenarioId}] Generating PR...`);
        console.log(`  Branch: ${branchName}`);
        console.log(`  Commit: ${commitMessage}`);

        if (options.dryRun) {
            console.log(`  [Dry Run] Would apply patch:\n${patch.slice(0, 200)}...`);
            continue;
        }

        try {
            // 0. Enforce clean worktree
            try {
                // Ignore untracked files (-uno)
                const { stdout } = await execAsync('git status --porcelain -uno');
                if (stdout.trim()) {
                    throw new Error('Worktree is dirty. Please commit or stash changes before running.');
                }
            } catch (e: any) {
                if (e.message.includes('Worktree is dirty')) throw e;
                // If git status failed, maybe not a repo?
                console.warn(`  Warning: Could not check git status: ${e.message}`);
            }

            // 1. Checkout base branch (main) to avoid stacking
            // We assume 'main' is the base. In a real tool, this might be configurable.
            try {
                await execAsync('git checkout main');
            } catch (e: any) {
                console.warn(`  Failed to checkout main: ${e.message}`);
                // If main exists but failed (e.g. dirty), we shouldn't try master.
                // Only try master if main doesn't exist.
                if (e.message.includes("did not match any file(s)")) {
                    try {
                        await execAsync('git checkout master');
                    } catch (e2) {
                        throw new Error("Could not checkout main or master. Please ensure a base branch exists.");
                    }
                } else {
                    // It failed for another reason (e.g. dirty worktree).
                    // We can try to stash? Or just warn and proceed (risky).
                    // Let's throw to be safe.
                    throw e;
                }
            }

            // 2. Handle existing branch
            try {
                // Check if branch exists
                await execAsync(`git show-ref --verify refs/heads/${branchName}`);
                console.log(`  Branch ${branchName} exists. Deleting...`);
                await execAsync(`git branch -D ${branchName}`);
            } catch (e) {
                // Branch doesn't exist, ignore
            }

            // 3. Create branch
            await execAsync(`git checkout -b ${branchName}`);

            // 4. Resolve fixture path to rewrite patch
            const scenariosDir = path.resolve(process.cwd(), 'evaluation/scenarios');
            const scenarioPath = path.join(scenariosDir, `${scenarioId}.json`);

            let fixturePath = '';
            try {
                const scenarioContent = await fs.readFile(scenarioPath, 'utf8');
                const scenario = JSON.parse(scenarioContent);
                fixturePath = scenario.fixture.path;
            } catch (e) {
                console.warn(`  Could not load scenario config for ${scenarioId}. Assuming root or manual apply.`);
            }

            // 5. Rewrite patch paths and collect affected files
            // Use precise regex to only target diff headers
            let finalPatch = patch;
            const affectedFiles = new Set<string>();

            if (fixturePath) {
                const cleanFixturePath = fixturePath.replace(/^\.\//, '');

                // Rewrite 'diff --git a/... b/...'
                finalPatch = finalPatch.replace(
                    /^diff --git a\/(\S+) b\/(\S+)/gm,
                    (match, p1, p2) => {
                        const newPath = `${cleanFixturePath}/${p1}`;
                        affectedFiles.add(newPath);
                        return `diff --git a/${newPath} b/${cleanFixturePath}/${p2}`;
                    }
                );

                // Rewrite '--- a/...'
                finalPatch = finalPatch.replace(
                    /^--- a\/(\S+)/gm,
                    `--- a/${cleanFixturePath}/$1`
                );

                // Rewrite '+++ b/...'
                finalPatch = finalPatch.replace(
                    /^\+\+\+ b\/(\S+)/gm,
                    `+++ b/${cleanFixturePath}/$1`
                );
            } else {
                // If no fixture path, try to extract paths from original patch
                const matches = patch.matchAll(/^diff --git a\/(\S+) b\/(\S+)/gm);
                for (const match of matches) {
                    affectedFiles.add(match[1]);
                }
            }

            const patchFile = `solution-${scenarioId}.patch`;
            await fs.writeFile(patchFile, finalPatch);
            console.log(`  Saved rewritten patch to ${patchFile}`);

            // 6. Apply patch
            try {
                await execAsync(`git apply ${patchFile}`);
                console.log(`  Applied patch successfully.`);

                // 7. Commit
                if (affectedFiles.size > 0) {
                    const files = Array.from(affectedFiles).join(' ');
                    await execAsync(`git add ${files}`);
                    await execAsync(`git commit -m "${commitMessage}"`);
                    console.log(`  Committed changes to: ${files}`);
                } else {
                    console.warn('  No files found to commit.');
                }
            } catch (e) {
                console.error(`  Failed to apply/commit patch: ${e}`);
                // Cleanup
                await execAsync(`git checkout -`);
                try {
                    await execAsync(`git branch -D ${branchName}`);
                } catch (ignore) { }
            }
        } catch (e) {
            console.error(`  Failed to process ${scenarioId}: ${e}`);
        }
    }
}

// CLI
const args = process.argv.slice(2);
const inputFile = args[0];
const scoreThreshold = parseFloat(args[1] || '0.8');
const dryRun = args.includes('--dry-run');

if (!inputFile) {
    console.error('Usage: node pr-generator.js <input-json> [threshold] [--dry-run]');
    process.exit(1);
}

generatePrs({ inputFile, scoreThreshold, dryRun }).catch(console.error);
