export function parseArgs(argv) {
  const args = {};
  const positionals = [];
  const entries = [];

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw) {
      continue;
    }

    if (raw === '--') {
      positionals.push(...argv.slice(index + 1));
      break;
    }

    if (!raw.startsWith('-')) {
      positionals.push(raw);
      continue;
    }

    const cleaned = raw.replace(/^--?/, '');
    if (!cleaned) {
      continue;
    }

    const [key, inlineValue] = cleaned.split('=');
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      entries.push({ key, value: inlineValue });
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      args[key] = next;
      entries.push({ key, value: next });
      index += 1;
    } else {
      args[key] = true;
      entries.push({ key, value: true });
    }
  }

  return { args, positionals, entries };
}

export function hasFlag(args, key) {
  const value = args[key];
  if (value === undefined) {
    return false;
  }
  if (value === false) {
    return false;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return true;
}
