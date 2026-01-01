import { execFile } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function runPack() {
  const { stdout } = await execFileAsync(
    'npm',
    ['pack', '--json', '--ignore-scripts'],
    {
      env: { ...process.env, npm_config_ignore_scripts: 'true' },
      maxBuffer: 10 * 1024 * 1024
    }
  );
  const trimmed = String(stdout ?? '').trim();
  if (!trimmed) {
    throw new Error('npm pack produced no output');
  }
  const parsed = JSON.parse(trimmed);
  const record = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!record || typeof record !== 'object') {
    throw new Error('npm pack output did not include a record');
  }
  return record;
}
