import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { EnvironmentPaths } from '../run/environment.js';
import type { TaskMetadataEntry } from '../types.js';

interface TasksIndex {
  items: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
}

export async function loadTaskMetadata(env: EnvironmentPaths): Promise<TaskMetadataEntry> {
  const tasksPath = join(env.repoRoot, 'tasks', 'index.json');
  try {
    const raw = await readFile(tasksPath, 'utf8');
    const data = JSON.parse(raw) as TasksIndex;
    const match = data.items.find((item) => item.id === env.taskId);
    if (match) {
      return { id: match.id, slug: match.slug, title: match.title };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  return { id: env.taskId, slug: env.taskId, title: `Task ${env.taskId}` };
}
