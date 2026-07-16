/**
 * GitHub Pages serves this app under a /sana-cpms subpath (see next.config.ts
 * basePath). next/image and next/link account for that automatically, but a
 * plain `<img src="/foo.png">` does not — this prepends it for the handful
 * of call sites using a raw <img> instead.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function withBasePath(path: string): string {
  if (!BASE_PATH || /^https?:\/\//i.test(path)) return path;
  return `${BASE_PATH}${path.startsWith('/') ? '' : '/'}${path}`;
}
