import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

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
          approval_id: 'permit-co-8',
          approver: 'review-compliance',
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
        approval_id: 'permit-co-8',
        approver: 'review-compliance',
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
      handoff: null,
      reachability: {
        mode: 'deterministic',
        dns_ran: false,
        hostname: null,
        resolved_addresses: [],
        summary: 'No proof URL was provided; the deterministic path leaves reviewer reachability out of scope.',
        caveat: 'No live DNS lookup was performed.'
      }
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
    expect(result.reachability).toEqual({
      mode: 'deterministic',
      dns_ran: false,
      hostname: 'review-assets.example.com',
      resolved_addresses: [],
      summary: 'Deterministic URL validation accepted the reviewer proof URL without live DNS lookup.',
      caveat: 'No live DNS lookup was performed. Reviewer reachability remains out of scope for the default deterministic path.'
    });
    expect(result.handoff?.workpad_markdown).toContain('Runtime proof (screenshot)');
    expect(result.handoff?.workpad_markdown).toContain('https://review-assets.example.com/co-8-dashboard.png');
    expect(result.handoff?.workpad_markdown).toContain('Runtime proof reachability');
    expect(result.handoff?.pr_markdown).toContain('### Runtime Proof');
    expect(result.handoff?.pr_markdown).toContain('Dashboard after launch-app validation');
    expect(result.handoff?.pr_markdown).toContain('Deterministic URL validation accepted the reviewer proof URL');
  });

  it('runs worker-local dns-public resolution when requested', async () => {
    const repoRoot = await createRepoWithPermit({
      allowedSources: [
        {
          origin: 'https://app.example.com',
          runtime_proof: {
            allow_screenshot: true,
            allow_external_link: true,
            allow_video: false
          }
        }
      ]
    });
    const dnsLookupMock = vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]);

    const result = await resolveProviderLinearRuntimeProof(
      {
        repoRoot,
        origin: 'https://app.example.com/dashboard',
        kind: 'external-link',
        proofUrl: 'https://review-assets.example.com/proof',
        reachabilityMode: 'dns-public'
      },
      {
        dnsLookup: dnsLookupMock
      }
    );

    expect(dnsLookupMock).toHaveBeenCalledWith('review-assets.example.com');
    expect(result).toMatchObject({
      ok: true,
      proof: {
        kind: 'external-link',
        reviewer_url: 'https://review-assets.example.com/proof'
      },
      reachability: {
        mode: 'dns-public',
        dns_ran: true,
        hostname: 'review-assets.example.com',
        resolved_addresses: ['93.184.216.34']
      }
    });
    if (result.ok) {
      expect(result.reachability.summary).toContain('Worker-local DNS resolved review-assets.example.com to public addresses only');
      expect(result.reachability.caveat).toContain('worker-local DNS evidence only');
      expect(result.handoff?.workpad_markdown).toContain('Runtime proof caveat: This is worker-local DNS evidence only.');
    }
  });

  it('skips dns lookup for public ip literals in dns-public mode', async () => {
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
    const dnsLookupMock = vi.fn();

    const result = await resolveProviderLinearRuntimeProof(
      {
        repoRoot,
        origin: 'https://app.example.com',
        kind: 'screenshot',
        proofUrl: 'https://93.184.216.34/proof.png',
        reachabilityMode: 'dns-public'
      },
      {
        dnsLookup: dnsLookupMock
      }
    );

    expect(dnsLookupMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      reachability: {
        mode: 'dns-public',
        dns_ran: false,
        hostname: '93.184.216.34',
        resolved_addresses: ['93.184.216.34']
      }
    });
  });

  it('fails closed when dns-public lookup throws', async () => {
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

    const result = await resolveProviderLinearRuntimeProof(
      {
        repoRoot,
        origin: 'https://app.example.com',
        kind: 'screenshot',
        proofUrl: 'https://review-assets.example.com/proof.png',
        reachabilityMode: 'dns-public'
      },
      {
        dnsLookup: vi.fn(async () => {
          const error = new Error('getaddrinfo ENOTFOUND review-assets.example.com') as NodeJS.ErrnoException;
          error.code = 'ENOTFOUND';
          throw error;
        })
      }
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_dns_lookup_failed',
        status: 503,
        details: {
          reviewer_hostname: 'review-assets.example.com',
          dns_error_code: 'ENOTFOUND'
        }
      }
    });
  });

  it('fails closed when dns-public returns no answers', async () => {
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

    const result = await resolveProviderLinearRuntimeProof(
      {
        repoRoot,
        origin: 'https://app.example.com',
        kind: 'screenshot',
        proofUrl: 'https://review-assets.example.com/proof.png',
        reachabilityMode: 'dns-public'
      },
      {
        dnsLookup: vi.fn(async () => [])
      }
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_dns_no_answers',
        status: 503
      }
    });
  });

  it('fails closed when dns-public returns any non-public answers', async () => {
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

    const result = await resolveProviderLinearRuntimeProof(
      {
        repoRoot,
        origin: 'https://app.example.com',
        kind: 'screenshot',
        proofUrl: 'https://review-assets.example.com/proof.png',
        reachabilityMode: 'dns-public'
      },
      {
        dnsLookup: vi.fn(async () => [
          { address: '93.184.216.34', family: 4 },
          { address: '10.0.0.5', family: 4 }
        ])
      }
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_dns_non_public_resolution',
        status: 422,
        details: {
          resolved_addresses: ['93.184.216.34', '10.0.0.5'],
          blocked_addresses: ['10.0.0.5']
        }
      }
    });
  });

  it('fails closed when dns-public resolves a private IPv4-embedded IPv6 address', async () => {
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

    const result = await resolveProviderLinearRuntimeProof(
      {
        repoRoot,
        origin: 'https://app.example.com',
        kind: 'screenshot',
        proofUrl: 'https://review-assets.example.com/proof.png',
        reachabilityMode: 'dns-public'
      },
      {
        dnsLookup: vi.fn(async () => [{ address: '::ffff:a00:5', family: 6 }])
      }
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_dns_non_public_resolution',
        status: 422,
        details: {
          resolved_addresses: ['::ffff:a00:5'],
          blocked_addresses: ['::ffff:a00:5']
        }
      }
    });
  });

  it('accepts public IPv4-embedded IPv6 answers in dns-public mode', async () => {
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

    const result = await resolveProviderLinearRuntimeProof(
      {
        repoRoot,
        origin: 'https://app.example.com',
        kind: 'screenshot',
        proofUrl: 'https://review-assets.example.com/proof.png',
        reachabilityMode: 'dns-public'
      },
      {
        dnsLookup: vi.fn(async () => [{ address: '::ffff:5db8:d822', family: 6 }])
      }
    );

    expect(result).toMatchObject({
      ok: true,
      reachability: {
        mode: 'dns-public',
        dns_ran: true,
        hostname: 'review-assets.example.com',
        resolved_addresses: ['::ffff:5db8:d822']
      }
    });
  });

  it('fails with kind-missing when blank proof-url masks other proof fields', async () => {
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
      proofUrl: '   ',
      title: 'Dashboard after launch-app validation'
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_kind_missing',
        status: 422
      }
    });
  });

  it('renders multiline proof metadata as inline markdown text in handoff output', async () => {
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
      title: 'Dashboard after\nlaunch-app validation',
      summary: 'Signed-in dashboard state\nused for review handoff.'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.handoff?.workpad_markdown).toContain(
      '[Dashboard after launch-app validation](<https://review-assets.example.com/co-8-dashboard.png>)'
    );
    expect(result.handoff?.workpad_markdown).toContain(
      '- Runtime proof summary: Signed-in dashboard state used for review handoff.'
    );
    expect(result.handoff?.pr_markdown).toContain(
      '- Proof (screenshot): [Dashboard after launch-app validation](<https://review-assets.example.com/co-8-dashboard.png>)'
    );
    expect(result.handoff?.pr_markdown).toContain('- Summary: Signed-in dashboard state used for review handoff.');
  });

  it('wraps runtime proof urls in angle brackets for markdown handoff links', async () => {
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
      proofUrl: 'https://review-assets.example.com/runtime-proof(1).png',
      title: 'Dashboard proof'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.handoff?.workpad_markdown).toContain(
      '[Dashboard proof](<https://review-assets.example.com/runtime-proof(1).png>)'
    );
    expect(result.handoff?.pr_markdown).toContain(
      '[Dashboard proof](<https://review-assets.example.com/runtime-proof(1).png>)'
    );
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
    'http://0.0.0.0:3000/proof.png',
    'http://0.1.2.3:3000/proof.png',
    'http://10.0.0.5/proof.png',
    'http://100.64.0.1/proof.png',
    'http://169.254.1.2/proof.png',
    'http://172.16.0.5/proof.png',
    'http://192.0.2.1/proof.png',
    'http://192.168.1.5/proof.png',
    'http://198.18.0.1/proof.png',
    'http://198.51.100.2/proof.png',
    'http://203.0.113.3/proof.png',
    'http://224.0.0.1/proof.png',
    'http://255.255.255.255/proof.png',
    'http://[::]:3000/proof.png',
    'http://[::127.0.0.1]/proof.png',
    'http://[100::1]/proof.png',
    'http://[2001:db8::1]/proof.png',
    'http://[fec0::1]/proof.png',
    'http://[fe80::1]/proof.png',
    'http://[fc00::1]/proof.png',
    'http://[ff00::1]/proof.png',
    'http://[::ffff:127.0.0.2]/proof.png',
    'http://[::ffff:0:7f00:2]/proof.png',
    'http://[::ffff:10.0.0.5]/proof.png',
    'http://[::ffff:169.254.1.2]/proof.png',
    'http://[64:ff9b::a00:5]/proof.png',
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

  it.each([
    'https://workstation/proof.png',
    'https://review-assets.example/proof.png',
    'https://review-assets.home.arpa/proof.png',
    'https://review-assets.local/proof.png',
    'https://review-assets.test/proof.png',
    'https://review-assets.invalid/proof.png',
    'https://review-assets.lan/proof.png'
  ])('fails closed when the proof url uses a non-public dns hostname (%s)', async (proofUrl) => {
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

  it('fails closed when the proof url contains embedded credentials', async () => {
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
      proofUrl: 'https://reviewer:secret@review-assets.example.com/co-8-dashboard.png'
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
    'file:///tmp/proof.png',
    'mailto:test@example.com',
    'data:text/plain,hi'
  ])('fails closed when the runtime proof origin is non-http(s) (%s)', async (origin) => {
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
      origin
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'runtime_proof_origin_invalid',
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
