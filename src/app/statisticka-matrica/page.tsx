/**
 * STATISTIČKA MATRICA – server page
 *
 * Directly calls `getStats()` server-side (no HTTP round-trip) and passes
 * the snapshot to the client component for rendering.
 *
 * Returns a 403 page when the `statsEnabled` feature flag is off.
 */

import { notFound } from "next/navigation";
import { getStats } from "@/lib/store";
import { getFlags } from "@/lib/flags";
import { StatistickaMatrica } from "@/components/StatistickaMatrica";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "STATISTIČKA MATRICA – OMEGA AI",
  description: "Analytics dashboard for OMEGA AI conversation statistics.",
};

// Disable full-route caching so stats are always fresh
export const dynamic = "force-dynamic";

export default async function StatistickaMatricaPage() {
  const flags = getFlags();
  if (!flags.statsEnabled) {
    notFound();
  }

  const snapshot = await getStats();

  return <StatistickaMatrica snapshot={snapshot} />;
}
