"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ConversationMessage, EvolutionEntry, OmegaState } from "@/types/evolution";

interface ApiEvolutionLog extends Omit<OmegaState, "evolutionLog"> {
  evolutionLog: EvolutionEntry[];
  currentSystemPrompt: string;
}

export default function HomePage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "evolution">("chat");
  const [evolutionData, setEvolutionData] = useState<ApiEvolutionLog | null>(null);
  const [version, setVersion] = useState(1);
  const [feedbackScore, setFeedbackScore] = useState<number | null>(null);
  const [autoEvolve, setAutoEvolve] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoEvolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEvolutionLog = useCallback(async () => {
    try {
      const res = await fetch("/api/evolution-log");
      if (res.ok) {
        const data = await res.json();
        setEvolutionData(data);
        setVersion(data.currentVersion);
      }
    } catch {
      // silently fail on fetch errors
    }
  }, []);

  useEffect(() => {
    fetchEvolutionLog();
  }, [fetchEvolutionLog]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEvolve = useCallback(async (trigger: EvolutionEntry["trigger"] = "user_feedback") => {
    if (evolving) return;
    setEvolving(true);
    try {
      const res = await fetch("/api/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger }),
      });
      const data = await res.json();
      if (res.ok) {
        setVersion(data.entry.version);
        await fetchEvolutionLog();
        setActiveTab("evolution");
      } else {
        alert(`Evolution failed: ${data.error}`);
      }
    } catch {
      alert("Evolution request failed. Check network.");
    } finally {
      setEvolving(false);
    }
  }, [evolving, fetchEvolutionLog]);

  // Auto-evolve every 2 minutes when enabled
  useEffect(() => {
    if (autoEvolve) {
      autoEvolveTimerRef.current = setTimeout(() => {
        handleEvolve("auto_cycle");
      }, 120_000);
    }
    return () => {
      if (autoEvolveTimerRef.current) {
        clearTimeout(autoEvolveTimerRef.current);
      }
    };
  }, [autoEvolve, version, handleEvolve]); // re-schedule after each evolution

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ConversationMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          feedbackScore: feedbackScore ?? undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
        setVersion(data.version);
        setFeedbackScore(null);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error: ${data.error ?? "Unknown error"}`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-sm font-bold">
              Ω
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">OMEGA AI</h1>
              <p className="text-xs text-gray-400">Infinite Evolution Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-mono">v{version}</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoEvolve}
                onChange={(e) => setAutoEvolve(e.target.checked)}
                className="accent-purple-500"
              />
              Auto-Evolve
            </label>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {(["chat", "evolution"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "evolution") fetchEvolutionLog();
              }}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab === "chat" ? "💬 Chat" : "🧬 Evolution"}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {activeTab === "chat" && (
          <div className="flex flex-col h-full gap-4">
            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto min-h-0 max-h-[60vh] pr-1">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500 gap-3">
                  <div className="text-5xl">Ω</div>
                  <p className="text-lg font-medium text-gray-400">OMEGA AI is ready</p>
                  <p className="text-sm">Ask anything. Every interaction helps the AI evolve.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-sm"
                        : "bg-gray-800 text-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1 mb-1 text-xs text-purple-400 font-mono">
                        Ω v{version}
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-400">
                    <span className="animate-pulse">OMEGA AI is thinking…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Feedback row */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Rate previous response:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setFeedbackScore(score)}
                  className={`w-6 h-6 rounded text-xs transition-colors ${
                    feedbackScore === score
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-400"
                  }`}
                >
                  {score}
                </button>
              ))}
              {feedbackScore && (
                <span className="text-purple-400 ml-1">({feedbackScore}/10 selected)</span>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-3 items-end">
              <textarea
                className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors min-h-[48px] max-h-40"
                placeholder="Ask OMEGA AI anything… (Enter to send, Shift+Enter for new line)"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                Send
              </button>
            </div>

            {/* Evolve button */}
            <div className="flex justify-center">
              <button
                onClick={() => handleEvolve("user_feedback")}
                disabled={evolving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-700 to-cyan-700 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-purple-900/30"
              >
                {evolving ? (
                  <>
                    <span className="animate-spin">⟳</span> Evolving…
                  </>
                ) : (
                  <>🧬 Trigger Evolution Now</>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "evolution" && (
          <div className="space-y-6">
            {/* Stats */}
            {evolutionData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Current Version", value: `v${evolutionData.currentVersion}`, color: "text-purple-400" },
                  { label: "Total Interactions", value: evolutionData.totalInteractions, color: "text-cyan-400" },
                  { label: "Avg. Score", value: `${evolutionData.averageScore.toFixed(1)}/10`, color: "text-emerald-400" },
                  { label: "Evolutions", value: evolutionData.evolutionLog.length, color: "text-amber-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Current prompt */}
            {evolutionData && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <span className="text-purple-400">Ω</span> Current System Prompt (v{evolutionData.currentVersion})
                </h3>
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                  {evolutionData.currentSystemPrompt}
                </pre>
              </div>
            )}

            {/* Trigger manual evolution */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => handleEvolve("user_feedback")}
                disabled={evolving}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {evolving ? "Evolving…" : "🧬 Evolve (User Feedback)"}
              </button>
              <button
                onClick={() => handleEvolve("performance_review")}
                disabled={evolving}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-800 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
              >
                📊 Evolve (Performance Review)
              </button>
            </div>

            {/* Evolution log */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Evolution History</h3>
              {!evolutionData || evolutionData.evolutionLog.length === 0 ? (
                <div className="text-center text-gray-600 py-12 bg-gray-900 border border-gray-800 rounded-xl">
                  <div className="text-4xl mb-3">🧬</div>
                  <p>No evolutions yet. Trigger the first one!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evolutionData.evolutionLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-purple-400 font-bold">v{entry.version}</span>
                          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">
                            {entry.trigger}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Score: <span className="text-emerald-400">{entry.performanceScore}/100</span></span>
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 italic">{entry.changeReason}</p>
                      {entry.improvements.length > 0 && (
                        <ul className="space-y-1">
                          {entry.improvements.map((imp, i) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5">✓</span>
                              {imp}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
