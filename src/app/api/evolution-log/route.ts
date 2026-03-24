import { NextResponse } from "next/server";
import { getOmegaState } from "@/lib/omega-state";

export const runtime = "nodejs";

export async function GET() {
  const state = getOmegaState();
  return NextResponse.json({
    currentVersion: state.currentVersion,
    totalInteractions: state.totalInteractions,
    averageScore: state.averageScore,
    lastEvolved: state.lastEvolved,
    evolutionLog: state.evolutionLog,
    currentSystemPrompt: state.systemPrompt,
  });
}
