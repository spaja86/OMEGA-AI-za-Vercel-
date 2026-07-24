/**
 * GET /api/stats – returns a STATISTIČKA MATRICA snapshot
 *
 * Aggregates all in-memory conversation data into a single statistics object.
 * Protected by the same rate-limit guards used across the rest of the API.
 * Returns 403 when the `DIAJOLOGIJA_STATS_ENABLED` feature flag is off.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/store";
import { getFlags } from "@/lib/flags";
import { checkRateLimit, rateLimitedResponse, getIp } from "@/lib/safety";

export async function GET(request: NextRequest) {
  const { allowed, remaining, resetAt } = checkRateLimit(getIp(request));
  if (!allowed) return rateLimitedResponse(resetAt);

  const flags = getFlags();
  if (!flags.statsEnabled) {
    return NextResponse.json(
      { error: "Stats dashboard is disabled.", status: 403 },
      { status: 403 }
    );
  }

  try {
    const snapshot = await getStats();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  } catch (err) {
    console.error("[GET /api/stats]", err);
    return NextResponse.json(
      { error: "Failed to generate stats snapshot", status: 500 },
      { status: 500 }
    );
  }
}
