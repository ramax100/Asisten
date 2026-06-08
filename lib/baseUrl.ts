import type { NextRequest } from 'next/server'

/**
 * Resolve the public base URL of this deployment.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_BASE_URL env (explicit override - useful for custom domains
 *      that differ from the request host, or for local dev with a tunnel).
 *   2. The current request's own origin (request.url is always absolute in
 *      Next.js Route Handlers).
 *   3. x-forwarded-host / host headers as a last resort.
 *
 * This means after a domain change (e.g. re-importing the project on Vercel
 * to a new asisten-XXXX.vercel.app URL) the webhook URL automatically tracks
 * whichever domain is currently calling the API, without requiring the user
 * to update an env var first.
 */
export function getBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (envUrl) return envUrl.replace(/\/+$/, '')

  try {
    return new URL(request.url).origin
  } catch {
    /* fall through */
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    ''
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  return host ? `${proto}://${host}` : ''
}
