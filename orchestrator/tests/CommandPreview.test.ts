import { describe, expect, it } from 'vitest';

import { buildCommandPreview, quoteCommandPreviewToken } from '../src/cli/utils/commandPreview.js';

describe('command preview formatting', () => {
  it('leaves safe tokens unquoted', () => {
    expect(quoteCommandPreviewToken('/tmp/repo')).toBe('/tmp/repo');
    expect(buildCommandPreview('codex-orchestrator', ['delegation', 'setup', '--yes'])).toBe(
      'codex-orchestrator delegation setup --yes'
    );
  });

  it('quotes shell-sensitive tokens with shell-safe single quotes', () => {
    const preview = buildCommandPreview('codex-orchestrator', [
      'delegation',
      'setup',
      '--repo',
      '/tmp/repo;quoted name'
    ]);
    expect(preview).toContain("--repo '/tmp/repo;quoted name'");
  });

  it('escapes single quotes and prevents interpolation tokens', () => {
    expect(quoteCommandPreviewToken("/tmp/o'malley")).toBe("'/tmp/o'\\''malley'");
    expect(quoteCommandPreviewToken('/tmp/$HOME $(touch pwn) `id`')).toBe("'/tmp/$HOME $(touch pwn) `id`'");
  });
});
