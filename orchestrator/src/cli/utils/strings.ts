import { slugify as sharedSlugify } from '../../../../packages/shared/utils/strings.js';

export function slugify(value: string, fallback = 'command'): string {
  return sharedSlugify(value, {
    fallback,
    maxLength: 80,
    lowercase: false,
    pattern: /[^a-zA-Z0-9]+/g,
    collapseDashes: true
  });
}
