export interface EvolutionEntry {
  id: string;
  version: number;
  timestamp: string;
  trigger: "user_feedback" | "auto_cycle" | "performance_review";
  previousPrompt: string;
  newPrompt: string;
  improvements: string[];
  performanceScore: number;
  changeReason: string;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatSession {
  id: string;
  messages: ConversationMessage[];
  feedbackScore?: number;
  createdAt: string;
}

export interface OmegaState {
  currentVersion: number;
  systemPrompt: string;
  evolutionLog: EvolutionEntry[];
  totalInteractions: number;
  averageScore: number;
  lastEvolved: string;
}
