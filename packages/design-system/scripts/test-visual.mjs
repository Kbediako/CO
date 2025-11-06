import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const now = new Date().toISOString();
  const codexDir = join(process.cwd(), '.codex');
  const reportDir = join(codexDir, 'visual-regression');

  await mkdir(reportDir, { recursive: true });

  const summary = {
    generatedAt: now,
    metrics: {
      total: 0,
      failed: 0,
      passed: 0
    },
    report: {
      message: 'Visual regression placeholder run complete.'
    }
  };

  await writeFile(join(codexDir, 'visual-regression-summary.json'), JSON.stringify(summary, null, 2));
  await writeFile(join(reportDir, 'diffs.txt'), 'Placeholder diff artifacts for design pipeline.\n');
  console.log('[design-system] visual regression placeholder complete');
}

main().catch((error) => {
  console.error('[design-system] visual regression placeholder failed');
  console.error(error);
  process.exit(1);
});
