import { NextRequest, NextResponse } from "next/server";

/**
 * Security headers.
 *
 * On `script-src`: Next.js 16 renders inline bootstrap scripts, and its nonce
 * plumbing did not stamp them under this build, so a nonce-only policy blocked
 * hydration outright. Rather than ship a broken page, `'unsafe-inline'` stays and
 * the XSS defence lives where it belongs — the markdown renderer in
 * `app/ask/page.tsx` escapes quotes and validates every URL before it reaches an
 * href, which is verified against attribute-breakout payloads.
 *
 * What this policy still buys, and why it is worth keeping: `connect-src 'self'`
 * and `img-src` without a wildcard close the usual exfiltration channels, so a
 * hypothetical injection could not beacon localStorage to another origin;
 * `object-src 'none'`, `base-uri 'self'` and `form-action 'self'` close the
 * plugin, base-tag and form-retarget tricks; `frame-ancestors 'none'` stops
 * clickjacking.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

export function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
