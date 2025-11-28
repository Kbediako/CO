#!/usr/bin/env node
/**
 * Generate a lightweight style fingerprint from a mirrored site.
 * Usage: node scripts/mirror-style-fingerprint.mjs --project <name> [--outDir docs/reference]
 */
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(rawArgs) {
  const args = {};
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (!arg.startsWith("--")) continue;
    const [flag, value] = arg.split("=");
    const key = flag.replace(/^--/, "");
    if (value !== undefined) {
      args[key] = value;
      continue;
    }
    const next = rawArgs[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

async function collectFiles(dir, ext = ".css") {
  const files = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(ext)) {
        files.push(full);
      }
    }
  }
  await walk(dir);
  return files;
}

function normalizeFontName(name) {
  return name.replace(/["']/g, "").trim();
}

function aggregateColors(css) {
  const colorRegex = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g;
  const counts = new Map();
  const matches = css.match(colorRegex) || [];
  for (const raw of matches) {
    const value = raw.trim();
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([value, count]) => ({ value, count }));
}

function aggregateFonts(css) {
  const families = new Set();
  const fontFaceRegex = /@font-face\s*{[^}]*font-family\s*:\s*([^;]+);/gi;
  let match;
  while ((match = fontFaceRegex.exec(css))) {
    normalizeFontName(match[1])
      .split(/[{},]/)
      .forEach((f) => {
        const trimmed = f.trim();
        if (
          trimmed &&
          /[a-zA-Z]/.test(trimmed) &&
          trimmed.length < 48 &&
          !/[:()]/.test(trimmed) &&
          !/[._]/.test(trimmed) &&
          !/cubic-bezier|opacity|transform|transition/i.test(trimmed) &&
          !trimmed.startsWith(".") &&
          !trimmed.startsWith("--")
        ) {
          families.add(trimmed);
        }
      });
  }

  const fontFamilyRegex = /font-family\s*:\s*([^;!]+)[;!]/gi;
  while ((match = fontFamilyRegex.exec(css))) {
    normalizeFontName(match[1])
      .split(/[{},]/)
      .forEach((f) => {
        const trimmed = f.trim();
        if (
          trimmed &&
          /[a-zA-Z]/.test(trimmed) &&
          trimmed.length < 48 &&
          !/[:()]/.test(trimmed) &&
          !/[._]/.test(trimmed) &&
          !["sans-serif", "serif", "monospace"].includes(trimmed.toLowerCase()) &&
          !trimmed.toLowerCase().startsWith("var(")
        ) {
          families.add(trimmed);
        }
      });
  }
  return Array.from(families);
}

function aggregateSpacing(css) {
  const spacingRegex = /(margin|padding|gap|grid-gap|column-gap|row-gap)\s*:\s*([^;]+);/gi;
  const counts = new Map();
  let match;
  while ((match = spacingRegex.exec(css))) {
    const values = match[2]
      .split(/\s+/)
      .map((v) => v.trim())
      .filter(Boolean);
    values.forEach((v) => {
      if (/^[+-]?\d*\.?\d+(rem|px|em|vw|vh|%)?$/.test(v) && !/[{}]/.test(v)) {
        counts.set(v, (counts.get(v) || 0) + 1);
      }
    });
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([value]) => value);
}

function aggregateMotion(css) {
  const durations = new Set();
  const easings = new Set();
  const durationRegex = /(animation|transition)[^;{}]*duration\s*:\s*([^;]+);/gi;
  let match;
  while ((match = durationRegex.exec(css))) {
    match[2]
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .forEach((v) => {
        if (/^-?\d*\.?\d+(ms|s)$/.test(v)) {
          durations.add(v);
        }
      });
  }
  const easingRegex = /(ease-in-out|ease-in|ease-out|linear|cubic-bezier\([^)]+\))/gi;
  let easeMatch;
  while ((easeMatch = easingRegex.exec(css))) {
    easings.add(easeMatch[1]);
  }
  return { durations: Array.from(durations), easings: Array.from(easings) };
}

function aggregateBackgrounds(css) {
  const results = [];
  const keywords = ["linear-gradient", "radial-gradient"];
  for (const keyword of keywords) {
    let start = css.indexOf(keyword);
    while (start !== -1) {
      let depth = 0;
      let end = start;
      let found = false;
      for (let i = start; i < css.length; i += 1) {
        const ch = css[i];
        if (ch === "(") depth += 1;
        if (ch === ")") {
          depth -= 1;
          if (depth === 0) {
            end = i;
            found = true;
            break;
          }
        }
      }
      if (found) {
        const snippet = css.slice(start, end + 1);
        if (!results.includes(snippet)) results.push(snippet);
        start = css.indexOf(keyword, end);
      } else {
        break;
      }
    }
  }
  return results.slice(0, 10);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = args.project;
  if (!project) {
    console.error("Missing required --project argument (e.g. --project glyphic)");
    process.exitCode = 1;
    return;
  }

  const publicDir = path.resolve("packages", project, "public");
  const cssDir = path.join(publicDir, "_next", "static", "css");
  const exists = await fs.stat(publicDir).catch(() => null);
  if (!exists || !exists.isDirectory()) {
    console.error(`Public directory not found: ${publicDir}`);
    process.exitCode = 1;
    return;
  }

  const cssFiles = [];
  if (await fs.stat(cssDir).catch(() => null)) {
    cssFiles.push(...(await collectFiles(cssDir)));
  }
  // Also pick up any top-level CSS
  cssFiles.push(
    ...(await collectFiles(publicDir)).filter((f) => f.toLowerCase().endsWith(".css") && !cssFiles.includes(f))
  );

  if (!cssFiles.length) {
    console.error(`No CSS files found under ${publicDir}`);
    process.exitCode = 1;
    return;
  }

  const cssContent = [];
  for (const file of cssFiles) {
    const raw = await fs.readFile(file, "utf8");
    cssContent.push(raw);
  }
  const combined = cssContent.join("\n");

  const fonts = aggregateFonts(combined);
  const colors = aggregateColors(combined);
  const spacingScale = aggregateSpacing(combined);
  const motion = aggregateMotion(combined);
  const backgrounds = aggregateBackgrounds(combined);

  const fingerprint = {
    project,
    generatedAt: new Date().toISOString(),
    sourceCssFiles: cssFiles.map((f) => path.relative(process.cwd(), f)),
    fonts: { families: fonts },
    colors,
    spacingScale,
    motion,
    backgrounds,
    components: {
      silhouettes: [
        "Buttons: pill/rounded, outlined + solid treatments",
        "Cards: rounded corners with ample padding",
        "Navigation: top-fixed header with CTA button",
        "Modals/forms: minimal, generous spacing"
      ]
    },
    doNotCopy: [],
    notes: "Heuristics derived from mirrored CSS; refine manually if needed."
  };

  const outDir = path.resolve(args.outDir ?? path.join("docs", "reference"));
  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `${project}-style-profile.json`);
  await fs.writeFile(jsonPath, JSON.stringify(fingerprint, null, 2));

  const mdPath = path.join(outDir, `${project}-style.md`);
  const md = [
    `# ${project} Style Profile`,
    "",
    `Generated: ${fingerprint.generatedAt}`,
    "",
    "## Typography",
    fonts.length ? `- Families: ${fonts.join(", ")}` : "- Families: (none detected)",
    "",
    "## Palette (top values)",
    colors.length
      ? colors.map((c) => `- ${c.value} (count ${c.count})`).join("\n")
      : "- No colors detected",
    "",
    "## Spacing Scale (most common)",
    spacingScale.length ? spacingScale.map((s) => `- ${s}`).join("\n") : "- No spacing tokens detected",
    "",
    "## Motion",
    motion.durations.length ? `- Durations: ${motion.durations.join(", ")}` : "- Durations: none detected",
    motion.easings.length ? `- Easings: ${motion.easings.join(", ")}` : "- Easings: none detected",
    "",
    "## Backgrounds",
    backgrounds.length ? backgrounds.map((g) => `- ${g}`).join("\n") : "- No gradients detected",
    "",
    "## Components (silhouettes)",
    ...fingerprint.components.silhouettes.map((s) => `- ${s}`),
    "",
    "## Do Not Copy",
    fingerprint.doNotCopy.length ? fingerprint.doNotCopy.map((d) => `- ${d}`).join("\n") : "- None recorded",
    "",
    "## Sources",
    "- CSS files:",
    ...fingerprint.sourceCssFiles.map((f) => `  - ${f}`),
    "",
    "> Generated automatically; adjust manually if something looks off."
  ].join("\n");
  await fs.writeFile(mdPath, md);

  console.log(`[fingerprint] wrote ${jsonPath}`);
  console.log(`[fingerprint] wrote ${mdPath}`);
}

main().catch((error) => {
  console.error("[fingerprint] failed", error);
  process.exitCode = 1;
});
