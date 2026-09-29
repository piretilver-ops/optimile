import type { NextConfig } from "next";

/**
 * Security headers are set per-request in `middleware.ts`, because the CSP needs
 * a fresh nonce on every response — a static header here cannot do that.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
