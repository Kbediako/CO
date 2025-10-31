import type { PlanPreviewResult, PlanPreviewStage } from '../types.js';

export function formatPlanPreview(result: PlanPreviewResult): string {
  const lines: string[] = [];
  lines.push(`Pipeline: ${result.pipeline.id} — ${result.pipeline.title} [${result.pipeline.source}]`);
  if (result.pipeline.description) {
    lines.push(`Description: ${result.pipeline.description}`);
  }
  lines.push('Stages:');
  if (result.stages.length === 0) {
    lines.push('  (none)');
  } else {
    for (const stage of result.stages) {
      lines.push(...formatStage(stage));
    }
  }
  if (result.plan.notes) {
    lines.push(`Notes: ${result.plan.notes}`);
  }
  return lines.join('\n');
}

function formatStage(stage: PlanPreviewStage): string[] {
  if (stage.kind === 'command') {
    const lines: string[] = [
      `  ${stage.index}. [command] ${stage.title} (${stage.id})`,
      `     command: ${stage.command}`
    ];
    if (stage.cwd) {
      lines.push(`     cwd: ${stage.cwd}`);
    }
    if (stage.env && Object.keys(stage.env).length > 0) {
      lines.push(`     env: ${Object.entries(stage.env).map(([key, value]) => `${key}=${value}`).join(', ')}`);
    }
    if (stage.allowFailure) {
      lines.push('     allowFailure: true');
    }
    if (stage.summaryHint) {
      lines.push(`     summaryHint: ${stage.summaryHint}`);
    }
    return lines;
  }

  const lines: string[] = [
    `  ${stage.index}. [subpipeline] ${stage.title} (${stage.id})`,
    `     pipeline: ${stage.pipeline}`
  ];
  if (stage.optional) {
    lines.push('     optional: true');
  }
  return lines;
}
