/**
 * DIAJOLOGIJA – feature flags
 *
 * Simple env-var-backed flags.  Swap this for LaunchDarkly / GrowthBook etc
 * when a full experimentation platform is needed.
 */

export interface Flags {
  /** Enable OpenAI streaming responses */
  streamingEnabled: boolean;
  /** Fall back to a canned echo response when no API key is configured */
  fallbackModeEnabled: boolean;
  /** Enable basic input/output moderation via the OpenAI moderation endpoint */
  moderationEnabled: boolean;
  /** Show model selector in the UI */
  modelSelectorVisible: boolean;
  /** Log token usage to the console (server-side) */
  usageLoggingEnabled: boolean;
  /** Enable the STATISTIČKA MATRICA analytics dashboard */
  statsEnabled: boolean;
}

export function getFlags(): Flags {
  return {
    streamingEnabled: env("DIAJOLOGIJA_STREAMING", "true"),
    fallbackModeEnabled: !process.env.OPENAI_API_KEY,
    moderationEnabled: env("DIAJOLOGIJA_MODERATION", "false"),
    modelSelectorVisible: env("DIAJOLOGIJA_MODEL_SELECTOR", "false"),
    usageLoggingEnabled: env("DIAJOLOGIJA_USAGE_LOGGING", "true"),
    statsEnabled: env("DIAJOLOGIJA_STATS_ENABLED", "true"),
  };
}

function env(key: string, defaultVal: string): boolean {
  return (process.env[key] ?? defaultVal).toLowerCase() === "true";
}
