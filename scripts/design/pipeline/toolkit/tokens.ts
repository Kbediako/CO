import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { loadDesignContext } from '../context.js';
import {
  appendToolkitArtifacts,
  ensureToolkitState,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage,
  upsertToolkitContext,
  type ToolkitContextState
} from '../state.js';
import { stageArtifacts } from '../../../../orchestrator/src/persistence/ArtifactStager.js';
import { buildRetentionMetadata } from './common.js';
import type { DesignToolkitArtifactRecord } from '../../../../packages/shared/manifest/types.js';
import { normalizeSentenceSpacing } from './snapshot.js';

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-toolkit-tokens';
  const toolkitState = ensureToolkitState(state);
  const contexts = toolkitState.contexts;

  if (contexts.length === 0) {
    upsertStage(state, {
      id: stageId,
      title: 'Toolkit token + style guide generation',
      status: 'skipped',
      notes: ['No toolkit contexts available. Run the extract stage first.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-toolkit-tokens] skipped — no contexts found');
    return;
  }

  const retention = toolkitState.retention ?? {
    days: state.retention?.days ?? 30,
    autoPurge: state.retention?.autoPurge ?? false,
    policy: state.retention?.policy ?? 'design.config.retention'
  };

  const tmpRoot = join(tmpdir(), `design-toolkit-tokens-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  const artifacts: DesignToolkitArtifactRecord[] = [];
  const failures: string[] = [];
  let processed = 0;

  for (const entry of contexts) {
    try {
      const outputs = await buildTokenOutputs({ entry, repoRoot: context.repoRoot, tmpRoot });
      const tokensRetention = buildRetentionMetadata(retention, new Date());

      const stagedTokens = await stageArtifacts({
        taskId: context.taskId,
        runId: context.runId,
        artifacts: [
          {
            path: relative(process.cwd(), outputs.tokensPath),
            description: `Token bundle for ${entry.slug}`
          }
        ],
        options: {
          relativeDir: `design-toolkit/tokens/${entry.slug}`,
          overwrite: true
        }
      });

      const stagedGuide = await stageArtifacts({
        taskId: context.taskId,
        runId: context.runId,
        artifacts: [
          {
            path: relative(process.cwd(), outputs.styleGuidePath),
            description: `Style guide for ${entry.slug}`
          }
        ],
        options: {
          relativeDir: `design-toolkit/styleguide/${entry.slug}`,
          overwrite: true
        }
      });

      artifacts.push({
        id: `${entry.slug}-tokens`,
        stage: 'tokens',
        status: 'succeeded',
        relative_path: stagedTokens[0].path,
        description: `Design tokens for ${entry.slug}`,
        retention: tokensRetention,
        metrics: {
          token_count: outputs.tokenCount,
          semantic_alias_count: outputs.semanticCount
        }
      });

      artifacts.push({
        id: `${entry.slug}-styleguide`,
        stage: 'styleguide',
        status: 'succeeded',
        relative_path: stagedGuide[0].path,
        description: `Style guide for ${entry.slug}`,
        retention: tokensRetention,
        metrics: {
          styleguide_pages: outputs.pageCount
        }
      });

      upsertToolkitContext(state, {
        ...entry,
        tokensPath: stagedTokens[0].path,
        styleguidePath: stagedGuide[0].path
      });

      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${entry.slug}: ${message}`);
      console.error(`[design-toolkit-tokens] failed for ${entry.slug}: ${message}`);
    }
  }

  if (artifacts.length > 0) {
    appendToolkitArtifacts(state, artifacts);
  }

  const status: 'succeeded' | 'failed' = failures.length === 0 && processed > 0 ? 'succeeded' : 'failed';

  upsertStage(state, {
    id: stageId,
    title: 'Toolkit token + style guide generation',
    status,
    notes: failures.length > 0 ? failures : undefined,
    metrics: {
      context_count: contexts.length,
      processed
    },
    artifacts: artifacts.map((artifact) => ({
      relative_path: artifact.relative_path,
      stage: artifact.stage,
      status: artifact.status,
      description: artifact.description
    }))
  });

  await saveDesignRunState(context.statePath, state);

  if (status === 'failed') {
    throw new Error('Token or style guide generation failed.');
  }

  console.log(`[design-toolkit-tokens] generated tokens for ${processed} contexts`);
}

interface TokenBuildOptions {
  entry: ToolkitContextState;
  repoRoot: string;
  tmpRoot: string;
}

async function buildTokenOutputs(options: TokenBuildOptions) {
  const { entry, repoRoot, tmpRoot } = options;
  const tokenCount = 12;
  const semanticCount = 3;
  const palette = await resolvePalette(entry, repoRoot, tokenCount);
  const sections = await loadSections(entry, repoRoot);
  const fonts = entry.fontFamilies && entry.fontFamilies.length > 0 ? entry.fontFamilies : ['system-ui'];
  const tokens = {
    "$schema": "https://design-tokens.github.io/community-group/format/module.json",
    tokenSetOrder: ['global', 'semantic'],
    global: {
      color: Object.fromEntries(
        palette.map((hex, idx) => [`color-${idx + 1}`, { value: hex }])
      ),
      radius: {
        sm: { value: '4px' },
        md: { value: '8px' },
        lg: { value: '16px' }
      },
      spacing: {
        xs: { value: '4px' },
        sm: { value: '8px' },
        md: { value: '16px' },
        lg: { value: '24px' }
      }
    },
    semantic: {
      foreground: { value: '{global.color.color-1.value}' },
      background: { value: '{global.color.color-4.value}' },
      accent: { value: '{global.color.color-8.value}' }
    },
    metadata: {
      source: entry.url,
      generated_at: new Date().toISOString(),
      fonts,
      palette_sample: palette.slice(0, 8)
    }
  };

  const cssVariables = palette
    .map((hex, idx) => `  --${entry.slug}-color-${idx + 1}: ${hex};`)
    .join('\n');

  const styleGuide = buildStyleGuide(entry, palette, fonts, sections);

  const slugDir = join(tmpRoot, entry.slug);
  await mkdir(slugDir, { recursive: true });
  const tokensPath = join(slugDir, 'tokens.json');
  const cssPath = join(slugDir, 'tokens.css');
  const styleGuidePath = join(slugDir, 'STYLE_GUIDE.md');

  await Promise.all([
    writeFile(tokensPath, JSON.stringify(tokens, null, 2), 'utf8'),
    writeFile(cssPath, `:root\n{\n${cssVariables}\n}\n`, 'utf8'),
    writeFile(styleGuidePath, styleGuide, 'utf8')
  ]);

  return {
    tokensPath,
    cssPath,
    styleGuidePath,
    tokenCount,
    semanticCount,
    pageCount: 1
  };
}

async function resolvePalette(entry: ToolkitContextState, repoRoot: string, desired: number): Promise<string[]> {
  const paletteFromFile = await loadPaletteFromFile(entry, repoRoot);
  if (paletteFromFile.length > 0) {
    return fillPalette(paletteFromFile, desired, entry.slug);
  }
  if (entry.palettePreview && entry.palettePreview.length > 0) {
    return fillPalette(entry.palettePreview, desired, entry.slug);
  }
  return fillPalette([], desired, entry.slug);
}

async function loadPaletteFromFile(entry: ToolkitContextState, repoRoot: string): Promise<string[]> {
  if (!entry.palettePath) {
    return [];
  }
  try {
    const absolute = join(repoRoot, entry.palettePath);
    const raw = await readFile(absolute, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => (typeof value === 'string' ? value.trim() : null))
        .filter((value): value is string => Boolean(value));
    }
  } catch (error) {
    console.warn(`[design-toolkit-tokens] Failed to read palette for ${entry.slug}:`, error);
  }
  return [];
}

async function loadSections(entry: ToolkitContextState, repoRoot: string) {
  if (!entry.sectionsPath) {
    return [] as Array<{ title: string; description: string }>;
  }
  try {
    const absolute = join(repoRoot, entry.sectionsPath);
    const raw = await readFile(absolute, 'utf8');
    const parsed = JSON.parse(raw) as Array<{ title?: string; description?: string }>;
    return parsed
      .map((section) => ({
        title:
          normalizeSentenceSpacing(section.title ?? 'Section')
            .replace(/\s+/g, ' ')
            .trim() || 'Section',
        description: normalizeSentenceSpacing(section.description ?? '')
          .replace(/\s+/g, ' ')
          .trim()
      }))
      .filter((section) => section.description.length > 0);
  } catch (error) {
    console.warn(`[design-toolkit-tokens] Failed to read sections for ${entry.slug}:`, error);
  }
  return [];
}

function fillPalette(base: string[], desired: number, slug: string): string[] {
  const palette = [...base.map(normalizeHexColor)];
  let index = 0;
  while (palette.length < desired) {
    palette.push(colorFromSeed(slug, index));
    index += 1;
  }
  return palette.slice(0, desired);
}

function normalizeHexColor(value: string): string {
  if (!value.startsWith('#')) {
    return value;
  }
  return value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase()
    : value.toLowerCase();
}

function buildStyleGuide(
  entry: ToolkitContextState,
  palette: string[],
  fonts: string[],
  sections: Array<{ title: string; description: string }>
): string {
  const paletteList = palette.map((hex) => `- ${hex}`).join('\n');
  const fontList = fonts.map((font) => `- ${font}`).join('\n');
  const sectionList =
    sections.length > 0
      ? sections.map((section) => `- **${section.title}** — ${section.description}`).join('\n')
      : '- (No sections detected)';
  return `# ${entry.slug} Style Guide\n\nGenerated tokens for ${entry.url}.\n\n## Palette\n${paletteList}\n\n## Typography\n${fontList}\n\n## Layout Sections\n${sectionList}\n`;
}

function colorFromSeed(seed: string, index: number): string {
  let hash = 0;
  const text = `${seed}-${index}`;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const r = Math.abs((hash >> 16) & 0xff);
  const g = Math.abs((hash >> 8) & 0xff);
  const b = Math.abs(hash & 0xff);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

main().catch((error) => {
  console.error('[design-toolkit-tokens] failed to generate tokens');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
