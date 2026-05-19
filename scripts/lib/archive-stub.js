import { posix } from 'node:path';

export const ARCHIVE_STUB_MARKER = '<!-- docs-archive:stub -->';
const ARCHIVED_ON_LINE_PATTERN = /^> Archived on (\d{4}-\d{2}-\d{2})\. Full content: (.+)$/;

function normalizeArchiveStubPath(value) {
  const normalized = posix.normalize(String(value ?? '').replace(/\\/g, '/')).replace(/^\.\//, '');
  return normalized === '.' ? '' : normalized;
}

function parseFenceStart(line) {
  const indented = line.match(/^ {0,3}/)?.[0] ?? '';
  const body = line.slice(indented.length);
  const marker = body.match(/^(`{3,}|~{3,})/);
  if (!marker) {
    return null;
  }
  return { char: marker[1][0], length: marker[1].length };
}

function closesFence(line, fence) {
  const indented = line.match(/^ {0,3}/)?.[0] ?? '';
  const body = line.slice(indented.length);
  let markerLength = 0;
  while (body[markerLength] === fence.char) {
    markerLength += 1;
  }
  return markerLength >= fence.length && body.slice(markerLength).trim() === '';
}

function archiveStubMarkerLineIndices(content) {
  const lines = String(content).split(/\r?\n/);
  const markerLineIndices = [];
  let fence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (fence) {
      if (closesFence(line, fence)) {
        fence = null;
      }
      continue;
    }

    const fenceStart = parseFenceStart(line);
    if (fenceStart) {
      fence = fenceStart;
      continue;
    }

    if (line.trim() === ARCHIVE_STUB_MARKER) {
      markerLineIndices.push(index);
    }
  }
  return markerLineIndices;
}

function countArchiveStubMarkers(content) {
  return archiveStubMarkerLineIndices(content).length;
}

function validIsoDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function singleLabeledValue(nonBlankLines, label, errors) {
  const matches = nonBlankLines.filter((candidate) => candidate.startsWith(label));
  if (matches.length !== 1) {
    errors.push(`${label.replace(/:$/, '')} must appear exactly once`);
    return '';
  }
  return matches[0].slice(label.length).trim();
}

function normalizeFullContentUrl(value) {
  return String(value ?? '')
    .trim()
    .replace(/^<([^>]+)>$/, '$1')
    .replace(/^\[[^\]]+\]\(([^)]+)\)$/, '$1');
}

export function hasArchiveStubMarker(content) {
  return countArchiveStubMarkers(content) > 0;
}

export function parseArchiveStubMetadata(file, content) {
  const lines = String(content).split(/\r?\n/);
  const errors = [];
  const markerCount = countArchiveStubMarkers(content);
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (!lines[index]?.trim().startsWith('#')) {
    errors.push('archive stub requires a top-level Markdown heading');
  }

  index += 1;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (lines[index]?.trim().startsWith('last_review:')) {
    index += 1;
    while (index < lines.length && lines[index].trim() === '') {
      index += 1;
    }
  }

  if (lines[index]?.trim() !== ARCHIVE_STUB_MARKER) {
    errors.push('archive stub marker must appear after the heading and optional last_review');
  }
  if (markerCount !== 1) {
    errors.push('archive stub marker must appear exactly once');
  }

  const trailingLines = lines.slice(index + 1).map((line) => line.trim());
  const nonBlankTrailingLines = trailingLines.filter((line) => line.length > 0);
  if (nonBlankTrailingLines.length !== 3) {
    errors.push('archive stub metadata must contain only archived-on, archive branch, and archive path lines');
  }

  const archivedLine = nonBlankTrailingLines[0] ?? '';
  const archivedMatch = archivedLine.match(ARCHIVED_ON_LINE_PATTERN);
  const archivedOn = archivedMatch?.[1]?.trim() ?? '';
  const fullContentUrl = normalizeFullContentUrl(archivedMatch?.[2]);
  if (!archivedMatch || !validIsoDate(archivedOn) || fullContentUrl.length === 0) {
    errors.push('archived-on line must include a valid date and full content URL');
  }
  const archiveBranch = singleLabeledValue(nonBlankTrailingLines, '- Archive branch:', errors);
  const archivePath = singleLabeledValue(nonBlankTrailingLines, '- Archive path:', errors);
  const normalizedArchivePath = normalizeArchiveStubPath(archivePath);
  const normalizedFile = normalizeArchiveStubPath(file);
  if (archiveBranch.length === 0) {
    errors.push('archive branch must be non-empty');
  }
  if (archivePath.length === 0) {
    errors.push('archive path must be non-empty');
  }
  if (archivePath.startsWith('/') || normalizedArchivePath.startsWith('../')) {
    errors.push('archive path must be repo-relative and stay inside the repository');
  }
  if (normalizedArchivePath && normalizedFile && normalizedArchivePath !== normalizedFile) {
    errors.push('archive path must match the current file path');
  }
  if (fullContentUrl && archiveBranch && normalizedArchivePath) {
    const expectedUrlPath = `/blob/${archiveBranch}/${normalizedArchivePath}`;
    try {
      const parsedUrl = new URL(fullContentUrl);
      if (!parsedUrl.pathname.endsWith(expectedUrlPath)) {
        errors.push('full content URL must point to the archive branch and archive path');
      }
    } catch {
      errors.push('full content URL must be a valid URL');
    }
  }
  return {
    hasMarker: markerCount > 0,
    isValid:
      errors.length === 0 &&
      archivedOn.length > 0 &&
      archiveBranch.length > 0 &&
      normalizedArchivePath.length > 0 &&
      normalizedArchivePath === normalizedFile,
    metadata: {
      archivedOn,
      fullContentUrl,
      archiveBranch,
      archivePath,
      normalizedArchivePath,
      normalizedFile
    },
    errors
  };
}

export function isValidArchiveStubForPath(file, content) {
  return parseArchiveStubMetadata(file, content).isValid;
}

export function buildArchiveStubContent({ headerLine, archiveUrl, archivedAt, archiveBranch, relativePath }) {
  const title = headerLine || '# Archived Document';
  const lines = [title, ''];
  if (relativePath.startsWith('tasks/specs/')) {
    lines.push(`last_review: ${archivedAt}`, '');
  }
  lines.push(
    ARCHIVE_STUB_MARKER,
    `> Archived on ${archivedAt}. Full content: ${archiveUrl}`,
    '',
    `- Archive branch: ${archiveBranch}`,
    `- Archive path: ${relativePath}`,
    ''
  );
  const content = lines.join('\n');
  const parsed = parseArchiveStubMetadata(relativePath, content);
  if (!parsed.isValid) {
    throw new Error(`Generated archive stub for ${relativePath} is invalid: ${parsed.errors.join('; ')}`);
  }
  return content;
}
