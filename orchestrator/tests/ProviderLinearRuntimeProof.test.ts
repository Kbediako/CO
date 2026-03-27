import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveProviderLinearRuntimeProof } from '../src/cli/control/providerLinearRuntimeProof.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        force: true,
        recursive: true
      })
    )
  );
});

describe('resolveProviderLinearRuntimeProof', () => {
  it('reports explicit screenshot-only posture from the permit file', async () => {
    const repoRoot = await createRepoWithPermit({
      allowedSources: [
        {
          origin: 'https://app.example.com',
          runtime_proof: {
            allow_screenshot: true,
            allow_external_link: false,
            allow_video: false
          }
        }
      ]
    });

    const result = await resolveProviderLinearRuntimeProof({
      repoRoot,
      origin: 'https://app.example.com/path'
    });

    expect(result).toEqual({
      ok: true,
      policy: {
        origin: 'https://app.example.com',
        permit_path: join(repoRoot, 'compliance', 'permit.json'),
        permit_status: 'found',
        approval_id: null,
        approver: null,
        capabilities: {
          screenshot: true,
          external_link: false,
          video: false
        },
        allowed_kinds: ['screenshot'],
        blocked_kinds: ['external-link', 'video'],
        summary:
          'screenshot proof is permitted for https://app.example.com; external-link and video are blocked.'
      },
      proof: null,
      handoff: null
    });
  });

  it('generates workpad and pr markdown for an allowed screenshot proof link', async () => {
    const repoRoot = await createRepoWithPermit({
      allowedSources: [
        {
          origin: 'https://app.example.com',
          runtime_proof: {
            allow_screenshot: true,
            allow_external_link: false,
            allow_video: false
          }
        }
      ]
    });

    const result = await resolveProviderLinearRuntimeProof({
      repoRoot,
      origin: 'https://app.example.com/dashboard',
      kind: 'screenshot',
      proofUrl: 'https://review-assets.example.com/co-8-dashboard.png',
      title: 'Dashboard after launch-app validation',
      summary: 'Signed-in dashboard state used for review handoff.'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.proof).toEqual({
      kind: 'screenshot',
      reviewer_url: 'https://review-assets.example.com/co-8-dashboard.png',
      title: 'Dashboard after launch-app validation',
      summary: 'Signed-in dashboard state used for review handoff.'
    });
    expect(result.handoff?.workpad_markdown).toContain('Runtime proof (screenshot)');
    expect(result.handoff?.workpad_markdown).toContain('https://review-assets.example.com/co-8-dashboard.png');
    expect(result.handoff?.pr_markdown).toContain('### Runtime Proof');
    expect(result.handoff?.pr_markdown).toContain('Dashboard after launch-app validation');
  });

  it('fails closed when the requested proof kind is blocked by policy', async () => {
    const repoRoot = await createRepoWithPermit({
      allowedSources: [
        {
          origin: 'https://app.example.com',
          runtime_proof: {
            allow_screenshot: true,
            allow_external_link: false,
            allow_video: false
          }
        }
      ]
    });

    const result = await resolveProviderLinearRuntimeProof({
      repoRoot,
      origin: 'https://app.example.com',
      kind: 'video',
      proofUrl: 'https://review-assets.example.com/co-8-demo.mp4'
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_kind_not_permitted',
        status: 422
      },
      policy: {
        allowed_kinds: ['screenshot'],
        blocked_kinds: ['external-link', 'video']
      }
    });
  });

  it('fails closed when only a local file path is available', async () => {
    const repoRoot = await createRepoWithPermit({
      allowedSources: [
        {
          origin: 'https://app.example.com',
          runtime_proof: {
            allow_screenshot: true,
            allow_external_link: false,
            allow_video: false
          }
        }
      ]
    });

    const result = await resolveProviderLinearRuntimeProof({
      repoRoot,
      origin: 'https://app.example.com',
      kind: 'screenshot',
      proofUrl: '/tmp/local-only.png'
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_url_missing',
        status: 422
      }
    });
  });

  it.each([
    'http://localhost:3000/proof.png',
    'http://127.0.0.2/proof.png',
    'http://[::ffff:127.0.0.2]/proof.png',
    'http://foo.localhost/proof.png'
  ])('fails closed when the proof url is a loopback-only address (%s)', async (proofUrl) => {
    const repoRoot = await createRepoWithPermit({
      allowedSources: [
        {
          origin: 'https://app.example.com',
          runtime_proof: {
            allow_screenshot: true,
            allow_external_link: false,
            allow_video: false
          }
        }
      ]
    });

    const result = await resolveProviderLinearRuntimeProof({
      repoRoot,
      origin: 'https://app.example.com',
      kind: 'screenshot',
      proofUrl
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_url_missing',
        status: 422
      }
    });
  });

  it('inherits legacy video permission when runtime-proof video is unspecified', async () => {
    const repoRoot = await createRepoWithPermit({
      allowedSources: [
        {
          origin: 'https://app.example.com',
          allow_video_capture: true,
          runtime_proof: {
            allow_screenshot: false,
            allow_external_link: false
          }
        }
      ]
    });

    const result = await resolveProviderLinearRuntimeProof({
      repoRoot,
      origin: 'https://app.example.com'
    });

    expect(result).toMatchObject({
      ok: true,
      policy: {
        capabilities: {
          screenshot: false,
          external_link: false,
          video: true
        },
        allowed_kinds: ['video']
      }
    });
  });
});

async function createRepoWithPermit(permit: Record<string, unknown>): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), 'provider-linear-runtime-proof-'));
  tempDirs.push(repoRoot);
  await mkdir(join(repoRoot, 'compliance'), { recursive: true });
  await writeFile(join(repoRoot, 'compliance', 'permit.json'), JSON.stringify(permit, null, 2), 'utf8');
  return repoRoot;
}
