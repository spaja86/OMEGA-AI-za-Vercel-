import { OmegaState, EvolutionEntry } from "@/types/evolution";

/**
 * In-memory OMEGA AI state store.
 * On Vercel, this resets per cold start. For persistence across requests/deployments,
 * replace with Vercel KV / Upstash Redis by swapping the get/set helpers below.
 */

const INITIAL_SYSTEM_PROMPT = `You are OMEGA AI — a supremely capable, self-improving artificial intelligence assistant deployed on Vercel.

Your core directives:
1. Provide exceptional, precise, and deeply thoughtful responses to every query.
2. Continuously reflect on your own performance and identify areas for improvement.
3. Adapt your communication style to the user's needs and expertise level.
4. Always strive for clarity, accuracy, and actionable insights.
5. Acknowledge uncertainty rather than fabricating information.
6. Push the boundaries of what is possible within each response.

You are version 1 of OMEGA AI. With every interaction you learn, evolve, and become more capable.`;

const globalState: OmegaState = {
  currentVersion: 1,
  systemPrompt: INITIAL_SYSTEM_PROMPT,
  evolutionLog: [],
  totalInteractions: 0,
  averageScore: 0,
  lastEvolved: new Date().toISOString(),
};

export function getOmegaState(): OmegaState {
  return { ...globalState, evolutionLog: [...globalState.evolutionLog] };
}

export function recordInteraction(score?: number): void {
  globalState.totalInteractions += 1;
  if (score !== undefined) {
    const total =
      globalState.averageScore * (globalState.totalInteractions - 1) + score;
    globalState.averageScore = total / globalState.totalInteractions;
  }
}

export function applyEvolution(entry: EvolutionEntry): void {
  globalState.currentVersion = entry.version;
  globalState.systemPrompt = entry.newPrompt;
  globalState.evolutionLog = [entry, ...globalState.evolutionLog].slice(0, 50); // keep newest 50 entries
  globalState.lastEvolved = entry.timestamp;
}

export function getCurrentSystemPrompt(): string {
  return globalState.systemPrompt;
}

export function getCurrentVersion(): number {
  return globalState.currentVersion;
}
