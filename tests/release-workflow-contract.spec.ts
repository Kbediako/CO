import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

async function readRepoFile(path: string): Promise<string> {
  return readFile(join(repoRoot, path), 'utf8');
}

describe('release workflow contract', () => {
  it('keeps shipped-skill release note guidance aligned with promoted workflow sections', async () => {
    const [workflow, releaseConfig, addendum, readme, sop] = await Promise.all([
      readRepoFile('.github/workflows/release.yml'),
      readRepoFile('.github/release.yml'),
      readRepoFile('docs/release-notes-template-addendum.md'),
      readRepoFile('docs/README.md'),
      readRepoFile('.agent/SOPs/release.md')
    ]);

    expect(releaseConfig).toContain('title: "Overview"');
    expect(releaseConfig).toContain('title: "Bug Fixes"');
    expect(workflow).toContain("const promotedHeadings = ['Overview', 'Bug Fixes'];");
    expect(workflow).toContain('stripSection(remaining, heading)');
    expect(workflow).toContain("'## Release Overview'");
    expect(workflow).toContain("'## Bug Fixes'");
    expect(workflow).toContain('## Full Changelog');

    expect(addendum).toContain('under **Overview**');
    expect(addendum).toContain('**Documentation** remains');
    expect(addendum).not.toContain('under **Overview** or **Documentation**');
    expect(readme).toContain('generated `Overview` and `Bug Fixes` become top-level release-note sections');
    expect(readme).toContain('generated `Documentation` remains under `Full Changelog`');
    expect(sop).toContain('generated `Overview` and `Bug Fixes` sections render once');
    expect(sop).toContain('remaining generated sections stay under `Full Changelog`');
  });

  it('uses a signed annotated tag body as the one-shot overview override', async () => {
    const [workflow, readme, sop] = await Promise.all([
      readRepoFile('.github/workflows/release.yml'),
      readRepoFile('docs/README.md'),
      readRepoFile('.agent/SOPs/release.md')
    ]);

    expect(workflow).toContain('RELEASE_TAG: ${{ steps.meta.outputs.tag }}');
    expect(workflow).toContain('function readAnnotatedTagBody(tag)');
    expect(workflow).toContain("['for-each-ref', `refs/tags/${tag}`, '--format=%(contents:body)']");
    expect(workflow).toContain('const overviewOverride = readAnnotatedTagBody(process.env.RELEASE_TAG);');
    expect(workflow).not.toContain('release-overview.md');
    expect(workflow).not.toContain('fs.existsSync(overridePath)');

    expect(readme).toContain('signed annotated tag body');
    expect(readme).toContain('does not read .github/release-overview.md');
    expect(sop).toContain('signed annotated tag body');
    expect(sop).toContain('does not read .github/release-overview.md');
  });

  it('documents prerelease tag and dist-tag behavior that matches the workflow', async () => {
    const [workflow, readme, sop] = await Promise.all([
      readRepoFile('.github/workflows/release.yml'),
      readRepoFile('docs/README.md'),
      readRepoFile('.agent/SOPs/release.md')
    ]);

    expect(workflow).toContain('vX.Y.Z-<prerelease>');
    expect(workflow).toContain('DIST_TAG_RAW="${PRERELEASE_LABEL%%[.-]*}"');
    expect(workflow).toContain('DIST_TAG="next"');
    expect(workflow).toContain('echo "dist_tag=latest"');

    for (const doc of [readme, sop]) {
      expect(doc).toContain('stable');
      expect(doc).toContain('`latest`');
      expect(doc).toContain('`alpha`');
      expect(doc).toContain('`beta`');
      expect(doc).toContain('`rc`');
      expect(doc).toContain('`next`');
      expect(doc).toContain('leading prerelease label');
    }
    expect(sop).toContain('`.github/workflows/release.yml`');
    expect(sop).toContain('`git tag -v <tag>`');
    expect(sop).toContain('`git push origin <tag>`');
    expect(sop).not.toContain('If .github/release.yml exists');
  });
});
