/**
 * Crude request limiting for the public demo.
 *
 * The agent endpoint spends real money on every call (Claude tokens, web search,
 * seats.aero quota), and the deployment is unauthenticated so judges can try it.
 * This caps the damage. It is in-memory, so on a multi-instance deployment each
 * instance keeps its own counters and the real ceiling is higher than configured
 * — good enough to stop casual abuse, not a security control.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PER_IP_PER_HOUR = 8;
const GLOBAL_PER_DAY = 300;

const ipHits = new Map<string, number[]>();
let globalHits: number[] = [];

function prune(times: number[], window: number, now: number): number[] {
  return times.filter((t) => now - t < window);
}

export function checkRateLimit(ip: string): { ok: true } | { ok: false; reason: string } {
  const now = Date.now();

  globalHits = prune(globalHits, DAY_MS, now);
  if (globalHits.length >= GLOBAL_PER_DAY) {
    return {
      ok: false,
      reason: "This demo has hit its daily budget. Try again tomorrow, or run it locally — the repo is public.",
    };
  }

  const hits = prune(ipHits.get(ip) ?? [], HOUR_MS, now);
  if (hits.length >= PER_IP_PER_HOUR) {
    return {
      ok: false,
      reason: `Rate limit: ${PER_IP_PER_HOUR} questions per hour. Each one runs a live agent with real API calls.`,
    };
  }

  hits.push(now);
  ipHits.set(ip, hits);
  globalHits.push(now);

  // Keep the map from growing without bound on a long-lived instance.
  if (ipHits.size > 5000) {
    for (const [key, times] of ipHits) {
      if (prune(times, HOUR_MS, now).length === 0) ipHits.delete(key);
    }
  }

  return { ok: true };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
