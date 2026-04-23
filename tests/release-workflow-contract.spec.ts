import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

async function readText(path: string): Promise<string> {
  return await readFile(path, 'utf8');
}

describe('release workflow contract', () => {
  it('keeps the promoted release-note sections aligned with the docs', async () => {
    const workflowText = await readText('.github/workflows/release.yml');
    const addendumText = await readText('docs/release-notes-template-addendum.md');
    const readmeText = await readText('docs/README.md');
    const sopText = await readText('.agent/SOPs/release.md');

    expect(workflowText).toContain("let overview = extractSection(body, 'Overview')");
    expect(workflowText).toContain("const bugFixes = extractSection(body, 'Bug Fixes')");
    expect(addendumText).toContain('Use **Overview** as the canonical top-section home');
    expect(addendumText).toContain('**Full Changelog**');
    expect(readmeText).toContain('only `Overview` and `Bug Fixes`');
    expect(sopText).toContain('only `Overview` and `Bug Fixes`');
  });

  it('uses the signed annotated tag body as the one-shot overview override source', async () => {
    const workflowText = await readText('.github/workflows/release.yml');
    const readmeText = await readText('docs/README.md');
    const sopText = await readText('.agent/SOPs/release.md');

    expect(workflowText).toContain("RELEASE_TAG: ${{ steps.meta.outputs.tag }}");
    expect(workflowText).toContain("['for-each-ref', `refs/tags/${process.env.RELEASE_TAG}`, '--format=%(contents:body)']");
    expect(workflowText).not.toContain("const overridePath = '.github/release-overview.md';");
    expect(readmeText).toContain('signed annotated tag body');
    expect(readmeText).toContain('override text after a blank line');
    expect(sopText).toContain('signed annotated tag body');
    expect(sopText).toContain('blank line');
    expect(sopText).toContain('not the tag subject');
  });

  it('documents generic prerelease dist-tag derivation including the next fallback', async () => {
    const workflowText = await readText('.github/workflows/release.yml');
    const readmeText = await readText('docs/README.md');
    const sopText = await readText('.agent/SOPs/release.md');

    expect(workflowText).toContain("description: 'Existing release tag to publish (vX.Y.Z or vX.Y.Z-<prerelease>)'");
    expect(workflowText).toContain('DIST_TAG_RAW="${PRERELEASE_LABEL%%[.-]*}"');
    expect(workflowText).toContain('DIST_TAG="next"');
    expect(readmeText).toContain('fall back to `next`');
    expect(sopText).toContain('fall back to `next`');
  });
});
