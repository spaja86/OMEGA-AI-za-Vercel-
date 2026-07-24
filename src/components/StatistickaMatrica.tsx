"use client";

import Link from "next/link";
import type { StatsSnapshot } from "@/lib/types";

interface Props {
  snapshot: StatsSnapshot;
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function pct(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${(ratio * 100).toFixed(1)} %`;
}

export function StatistickaMatrica({ snapshot }: Props) {
  const totalFeedback = snapshot.feedbackUp + snapshot.feedbackDown;
  const totalConv = snapshot.totalConversations;

  const modelEntries = Object.entries(snapshot.modelBreakdown).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            Ω
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">OMEGA AI</h1>
            <p className="text-xs text-gray-500">STATISTIČKA MATRICA · Analytics</p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          ← Chat
        </Link>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Section A – Summary cards */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pregled
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Conversations" value={fmt(totalConv)} />
            <SummaryCard label="Messages" value={fmt(snapshot.totalMessages)} />
            <SummaryCard label="Tokens used" value={fmt(snapshot.totalTokens)} />
            <SummaryCard
              label="Positive feedback"
              value={pct(snapshot.feedbackRatio)}
            />
          </div>
        </section>

        {/* Section B – Statistical matrix */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Statistička Matrica
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-1/2">
                    Metric
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">
                    Total
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">
                    24 h
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">
                    7 d
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <MatrixRow
                  label="Conversations"
                  value={fmt(totalConv)}
                  v24={fmt(snapshot.conversationsLast24h)}
                  v7d={fmt(snapshot.conversationsLast7d)}
                />
                <MatrixRow
                  label="Messages"
                  value={fmt(snapshot.totalMessages)}
                />
                <MatrixRow
                  label="Avg msgs / conversation"
                  value={fmt(snapshot.averageMessagesPerConversation, 1)}
                />
                <MatrixRow
                  label="Avg tokens / reply"
                  value={fmt(snapshot.averageTokensPerReply, 1)}
                />
                <MatrixRow
                  label="👍 Feedback"
                  value={`${fmt(snapshot.feedbackUp)} / ${fmt(totalFeedback)}`}
                />
                <MatrixRow
                  label="👎 Feedback"
                  value={`${fmt(snapshot.feedbackDown)} / ${fmt(totalFeedback)}`}
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* Section C – Model breakdown */}
        {modelEntries.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Model breakdown
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {modelEntries.map(([model, count]) => {
                const share = totalConv > 0 ? count / totalConv : 0;
                return (
                  <div key={model} className="px-4 py-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800">{model}</span>
                      <span className="text-gray-500">
                        {count} conv · {(share * 100).toFixed(1)} %
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${share * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section D – Top conversations */}
        {snapshot.topConversationsByLength.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Top conversations by length
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {snapshot.topConversationsByLength.map((conv, i) => (
                <div key={conv.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-gray-400 w-4">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {conv.model} · {conv.messageCount} messages
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center pb-2">
          Generated at {new Date(snapshot.generatedAt).toLocaleString()}
        </p>
      </main>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-blue-600">{value}</p>
    </div>
  );
}

function MatrixRow({
  label,
  value,
  v24 = "—",
  v7d = "—",
}: {
  label: string;
  value: string;
  v24?: string;
  v7d?: string;
}) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-gray-700">{label}</td>
      <td className="px-4 py-2.5 text-right font-medium text-gray-900">
        {value}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-500">{v24}</td>
      <td className="px-4 py-2.5 text-right text-gray-500">{v7d}</td>
    </tr>
  );
}
