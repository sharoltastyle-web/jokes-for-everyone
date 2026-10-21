import "server-only";
import OpenAI from "openai";

export class ConfigError extends Error {}

const GENERATION_TIMEOUT_MS = 10_000;

let client: OpenAI | null = null;

// Reads server configuration; the key never leaves this module.
export function getOpenAI(): { client: OpenAI; model: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    throw new ConfigError("Missing OpenAI configuration");
  }
  client ??= new OpenAI({
    apiKey,
    maxRetries: 0,
    timeout: GENERATION_TIMEOUT_MS,
  });
  return { client, model };
}
