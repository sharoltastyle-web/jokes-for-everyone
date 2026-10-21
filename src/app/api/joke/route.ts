import { APIConnectionTimeoutError } from "openai";
import { generateJoke } from "@/lib/jokeService";
import { ConfigError } from "@/lib/openai";

export const maxDuration = 30;

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function error(code: string, status: number) {
  return json({ error: { code } }, status);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("INVALID_JSON", 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return error("INVALID_INPUT", 400);
  }

  const rawTopic = (body as { topic?: unknown }).topic;
  if (rawTopic !== undefined && typeof rawTopic !== "string") {
    return error("INVALID_INPUT", 400);
  }
  const topic = (rawTopic ?? "").trim();

  const started = Date.now();
  try {
    const joke = await generateJoke(topic);
    console.info(`joke ok status=200 ms=${Date.now() - started}`);
    return json({ joke }, 200);
  } catch (err) {
    // Log only the error class, never the topic, output or key.
    const kind = err instanceof Error ? err.constructor.name : "Unknown";
    if (err instanceof ConfigError) {
      console.error(`joke failed status=503 kind=${kind}`);
      return error("SERVICE_UNAVAILABLE", 503);
    }
    if (err instanceof APIConnectionTimeoutError) {
      console.error(`joke failed status=504 kind=${kind}`);
      return error("TIMEOUT", 504);
    }
    console.error(`joke failed status=502 kind=${kind}`);
    return error("GENERATION_FAILED", 502);
  }
}
