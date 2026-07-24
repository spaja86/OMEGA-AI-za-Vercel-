/**
 * DIAJOLOGIJA – safety / rate-limit helpers
 *
 * Simple in-memory rate limiter.  Replace with Upstash Rate Limit
 * or similar edge-compatible store for production multi-instance usage.
 */

const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // per IP per window

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let record = requests.get(ip);

  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + WINDOW_MS };
    requests.set(ip, record);
  }

  record.count += 1;

  const allowed = record.count <= MAX_REQUESTS;
  const remaining = Math.max(0, MAX_REQUESTS - record.count);

  return { allowed, remaining, resetAt: record.resetAt };
}

/** Build a standardised 429 Response */
export function rateLimitedResponse(resetAt: number): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests – slow down.",
      code: "RATE_LIMITED",
      status: 429,
      resetAt,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    }
  );
}

/** Extract best-effort IP from request headers (Vercel forwards X-Forwarded-For) */
export function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
