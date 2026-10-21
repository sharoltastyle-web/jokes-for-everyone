import "server-only";
import OpenAI from "openai";

export class ConfigError extends Error {}

// Approved model (ADR-1); OPENAI_MODEL may override it without a code change.
const DEFAULT_MODEL = "gpt-5.6-luna";

let client: OpenAI | null = null;

// Reads server configuration; the key never leaves this module.
// Timeouts are set per request by the joke service, within its time budget.
export function getOpenAI(): { client: OpenAI; model: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  if (!apiKey) {
    throw new ConfigError("Missing OpenAI configuration");
  }
  client ??= new OpenAI({ apiKey, maxRetries: 0 });
  return { client, model };
}
