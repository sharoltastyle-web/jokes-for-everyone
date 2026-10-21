import { APIConnectionTimeoutError, RateLimitError } from "openai";
import { BudgetExceededError, generateJoke } from "@/lib/jokeService";
import { ConfigError } from "@/lib/openai";
import { isAllowedOrigin } from "@/lib/origin";

export const maxDuration = 30;

const MAX_BODY_BYTES = 8 * 1024;

function json(body: unknown, status: number, headers: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function error(code: string, status: number, headers?: HeadersInit) {
  return json({ error: { code } }, status, headers);
}

// Maps service failures to the API contract; provider messages never reach the client.
function failure(err: unknown): { status: number; code: string } {
  if (err instanceof ConfigError) {
    return { status: 503, code: "SERVICE_UNAVAILABLE" };
  }
  if (
    err instanceof APIConnectionTimeoutError ||
    err instanceof BudgetExceededError
  ) {
    return { status: 504, code: "TIMEOUT" };
  }
  if (err instanceof RateLimitError) {
    return { status: 429, code: "RATE_LIMITED" };
  }
  return { status: 502, code: "GENERATION_FAILED" };
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return error("FORBIDDEN_ORIGIN", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return error("UNSUPPORTED_MEDIA_TYPE", 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_BODY_BYTES) {
    return error("PAYLOAD_TOO_LARGE", 413);
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return error("PAYLOAD_TOO_LARGE", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
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

  const requestId = crypto.randomUUID();
  const started = Date.now();
  try {
    const { joke, tokens, fallbackUsed } = await generateJoke(topic);
    console.info(
      `joke ok id=${requestId} status=200 ms=${Date.now() - started} tokens=${tokens} fallback=${fallbackUsed}`,
    );
    return json({ joke }, 200);
  } catch (err) {
    // Log only metadata and the error class, never the topic, output or key.
    const kind = err instanceof Error ? err.constructor.name : "Unknown";
    const { status, code } = failure(err);
    console.error(
      `joke failed id=${requestId} status=${status} ms=${Date.now() - started} kind=${kind}`,
    );
    return error(code, status);
  }
}

function methodNotAllowed() {
  return error("METHOD_NOT_ALLOWED", 405, { Allow: "POST" });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
