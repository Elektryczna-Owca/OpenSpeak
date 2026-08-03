// NEXT_PUBLIC_BASE_PATH is inlined into both server and client bundles at
// build time and must match `basePath` in next.config.ts. Next.js only
// prefixes its own machinery (pages, <Link>, redirects, /_next assets) —
// hand-written URLs to API routes must go through apiPath().
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function apiPath(path: string) {
  return `${BASE_PATH}${path}`
}
