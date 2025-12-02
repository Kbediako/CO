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
import { computeColorPalette, computeFontFamilies, normalizeSentenceSpacing } from './snapshot.js';

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
      description: artifact.description ?? undefined
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
  const desiredColorCount = 16;
  const aggregatedCss = await loadAggregatedCss(entry, repoRoot);
  const paletteFromFile = await loadPaletteFromFile(entry, repoRoot);
  const palettePreview = Array.isArray(entry.palettePreview) ? mergeUniqueStrings(entry.palettePreview) : [];
  const runtimeCanvasColors = Array.isArray(entry.runtimeCanvasColors) ? mergeUniqueStrings(entry.runtimeCanvasColors) : [];
  const cssColors = computeColorPalette(aggregatedCss);
  const palette = buildPalette(
    mergeUniqueStrings([...paletteFromFile, ...palettePreview, ...cssColors, ...runtimeCanvasColors]),
    desiredColorCount
  );
  const sections = await loadSections(entry, repoRoot);
  const cssFonts = computeFontFamilies(aggregatedCss);
  const capturedFonts = Array.isArray(entry.fontFamilies) ? mergeUniqueStrings(entry.fontFamilies) : [];
  const runtimeFonts = Array.isArray(entry.resolvedFonts) ? mergeUniqueStrings(entry.resolvedFonts) : [];
  const mergedFonts = mergeUniqueStrings([...cssFonts, ...capturedFonts, ...runtimeFonts]);
  const semanticColors = deriveSemanticColors(palette);
  const semanticTokens = buildSemanticTokens(palette, semanticColors);
  const tokens = {
    "$schema": "https://design-tokens.github.io/community-group/format/module.json",
    tokenSetOrder: ['global', 'semantic'],
    global: {
      color: buildColorTokens(palette),
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
    semantic: semanticTokens,
    metadata: {
      source: entry.url,
      reference: entry.referenceUrl ?? entry.url,
      css_path: entry.snapshotCssPath ?? null,
      palette_sources: {
        file: paletteFromFile.length,
        extracted: cssColors.length,
        preview: palettePreview.length,
        runtime_canvas: runtimeCanvasColors.length
      },
      generated_at: new Date().toISOString(),
      fonts: mergedFonts,
      runtime_fonts: runtimeFonts,
      palette_sample: palette.slice(0, 8),
      runtime_canvas_colors: runtimeCanvasColors
    }
  };

  const cssVariables = buildCssVariables(entry.slug, palette, semanticColors);

  const styleGuide = buildStyleGuide(
    entry,
    palette,
    mergedFonts,
    sections,
    runtimeFonts,
    runtimeCanvasColors,
    semanticColors,
    {
      paletteFromFileCount: paletteFromFile.length,
      palettePreviewCount: palettePreview.length,
      cssColorCount: cssColors.length
    }
  );

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
    tokenCount: palette.length,
    semanticCount: Object.keys(semanticTokens).length,
    pageCount: 1
  };
}

async function loadAggregatedCss(entry: ToolkitContextState, repoRoot: string): Promise<string> {
  if (!entry.snapshotCssPath) {
    return '';
  }
  try {
    const absolute = join(repoRoot, entry.snapshotCssPath);
    return await readFile(absolute, 'utf8');
  } catch (error) {
    console.warn(`[design-toolkit-tokens] Failed to read aggregated CSS for ${entry.slug}:`, error);
    return '';
  }
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

function buildPalette(candidates: string[], desired: number): string[] {
  const normalized = mergeUniqueStrings(candidates.map(normalizeHexColor));
  if (normalized.length >= desired) {
    return normalized.slice(0, desired);
  }
  if (normalized.length === 0) {
    return ['#111111', '#ffffff'].slice(0, desired);
  }
  const padded = [...normalized];
  const anchor = normalized[normalized.length - 1];
  padded.push(...padPalette(anchor, desired - normalized.length));
  return padded.slice(0, desired);
}

function padPalette(anchor: string, additional: number): string[] {
  const rgb = hexToRgb(anchor);
  if (!rgb) {
    return Array.from({ length: additional }, () => anchor);
  }
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const results: string[] = [];
  for (let step = 1; step <= additional; step += 1) {
    const offset = Math.min(0.45, step * 0.08);
    const lightness = Math.min(1, Math.max(0, l + (step % 2 === 0 ? -offset : offset)));
    results.push(hslToHex(h, s, lightness));
  }
  return results;
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
  sections: Array<{ title: string; description: string }>,
  runtimeFonts: string[],
  runtimeCanvasColors: string[],
  semanticColors: { foreground: string; background: string; accent: string },
  paletteSources: { paletteFromFileCount: number; palettePreviewCount: number; cssColorCount: number }
): string {
  const paletteList = palette.map((hex) => `- ${hex}`).join('\n');
  const fontList = fonts.map((font) => `- ${font}`).join('\n');
  const runtimeFontList = runtimeFonts.map((font) => `- ${font}`).join('\n');
  const runtimeCanvasList = runtimeCanvasColors.map((hex) => `- ${hex}`).join('\n');
  const sectionList =
    sections.length > 0
      ? sections.map((section) => `- **${section.title}** — ${section.description}`).join('\n')
      : '- (No sections detected)';
  const canvasSection = runtimeCanvasList ? `\n## Canvas Samples\n${runtimeCanvasList}\n` : '\n';
  const runtimeFontSection = runtimeFontList ? `\n## Resolved Typekit Fonts\n${runtimeFontList}\n` : '\n';
  const paletteSourceNotes = [
    `- Aggregated CSS colors: ${paletteSources.cssColorCount}`,
    `- Palette file swatches: ${paletteSources.paletteFromFileCount}`,
    `- Preview sample swatches: ${paletteSources.palettePreviewCount}`
  ].join('\n');
  return `# ${entry.slug} Style Guide\n\nGenerated tokens for ${entry.url}.\n\n## Palette\n${paletteList}\n\n## Semantic Roles\n- Background: ${semanticColors.background}\n- Foreground: ${semanticColors.foreground}\n- Accent: ${semanticColors.accent}\n\n## Palette Inputs\n${paletteSourceNotes}${canvasSection}\n## Typography (CSS)\n${fontList}${runtimeFontSection}\n## Layout Sections\n${sectionList}\n`;
}

function mergeUniqueStrings(values: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    unique.push(text);
  }
  return unique;
}

function deriveSemanticColors(palette: string[]): { foreground: string; background: string; accent: string } {
  if (palette.length === 0) {
    return { foreground: '#0b0b0b', background: '#ffffff', accent: '#1d4ed8' };
  }
  const scoring = palette.map((hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return { hex, lightness: 0.5, saturation: 0.5 };
    }
    const { l, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { hex, lightness: l, saturation: s };
  });
  const background = scoring.reduce((lightest, current) => (current.lightness > lightest.lightness ? current : lightest));
  const foreground = scoring.reduce((darkest, current) => (current.lightness < darkest.lightness ? current : darkest));
  const accentCandidate = scoring
    .filter((entry) => entry.hex !== background.hex && entry.hex !== foreground.hex)
    .reduce(
      (vibrant, current) => (current.saturation > vibrant.saturation ? current : vibrant),
      scoring[0]
    );
  return {
    foreground: foreground.hex,
    background: background.hex,
    accent: accentCandidate.hex
  };
}

function buildSemanticTokens(palette: string[], semantic: { foreground: string; background: string; accent: string }) {
  const alias = (hex: string) => {
    const index = palette.findIndex((value) => value.toLowerCase() === hex.toLowerCase());
    if (index >= 0) {
      return `{global.color.color-${index + 1}.value}`;
    }
    return hex;
  };
  return {
    foreground: { value: alias(semantic.foreground) },
    background: { value: alias(semantic.background) },
    accent: { value: alias(semantic.accent) }
  };
}

function buildColorTokens(palette: string[]) {
  return Object.fromEntries(palette.map((hex, idx) => [`color-${idx + 1}`, { value: hex }]));
}

function buildCssVariables(slug: string, palette: string[], semantic: { foreground: string; background: string; accent: string }): string {
  const colors = palette.map((hex, idx) => `  --${slug}-color-${idx + 1}: ${hex};`);
  const semanticVars = [
    `  --${slug}-background: ${semantic.background};`,
    `  --${slug}-foreground: ${semantic.foreground};`,
    `  --${slug}-accent: ${semantic.accent};`
  ];
  return [...colors, ...semanticVars].join('\n');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!/^#([0-9a-f]{6})$/i.test(normalized)) {
    return null;
  }
  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === nr) {
      h = ((ng - nb) / delta) % 6;
    } else if (max === ng) {
      h = (nb - nr) / delta + 2;
    } else {
      h = (nr - ng) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (value: number) => {
    const scaled = Math.round((value + m) * 255);
    return scaled.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

main().catch((error) => {
  console.error('[design-toolkit-tokens] failed to generate tokens');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
