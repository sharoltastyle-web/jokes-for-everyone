import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APIConnectionTimeoutError, RateLimitError } from "openai";

const generateJoke = vi.fn();

vi.mock("@/lib/jokeService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  generateJoke,
}));

const { POST, GET, PUT, PATCH, DELETE } = await import("@/app/api/joke/route");
const { BudgetExceededError, ContentRejectedError } = await import(
  "@/lib/jokeService"
);
const { ConfigError } = await import("@/lib/openai");

const ORIGIN = "https://jokes.example";

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/joke", {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body,
  });
}

async function errorCode(res: Response) {
  return ((await res.json()) as { error: { code: string } }).error.code;
}

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", ORIGIN);
  generateJoke.mockReset();
  generateJoke.mockResolvedValue({
    joke: "בדיחה",
    tokens: 1,
    fallbackUsed: false,
  });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/joke", () => {
  it("returns the joke with no-store", async () => {
    const res = await POST(post(JSON.stringify({ topic: " חתולים " })));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ joke: "בדיחה" });
    expect(generateJoke).toHaveBeenCalledWith("חתולים");
  });

  it.each([["{}"], ['{"topic":""}'], ['{"topic":"   "}']])(
    "treats %s as a general joke",
    async (body) => {
      const res = await POST(post(body));

      expect(res.status).toBe(200);
      expect(generateJoke).toHaveBeenCalledWith("");
    },
  );

  it("accepts a charset in the Content-Type", async () => {
    const res = await POST(
      post("{}", { "content-type": "application/json; charset=utf-8" }),
    );
    expect(res.status).toBe(200);
  });

  it.each([
    ["malformed JSON", "{topic:", 400, "INVALID_JSON"],
    ["numeric topic", '{"topic":5}', 400, "INVALID_INPUT"],
    ["null topic", '{"topic":null}', 400, "INVALID_INPUT"],
    ["array body", "[]", 400, "INVALID_INPUT"],
    ["string body", '"x"', 400, "INVALID_INPUT"],
    [
      "body over 8 KiB",
      JSON.stringify({ topic: "א".repeat(4200) }),
      413,
      "PAYLOAD_TOO_LARGE",
    ],
  ])("rejects %s", async (_name, body, status, code) => {
    const res = await POST(post(body));

    expect(res.status).toBe(status);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorCode(res)).toBe(code);
    expect(generateJoke).not.toHaveBeenCalled();
  });

  it("rejects a declared Content-Length over 8 KiB", async () => {
    const res = await POST(post("{}", { "content-length": "9000" }));
    expect(res.status).toBe(413);
  });

  it("rejects an unsupported Content-Type", async () => {
    const res = await POST(post("{}", { "content-type": "text/plain" }));

    expect(res.status).toBe(415);
    expect(await errorCode(res)).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it.each([["https://evil.example"], ["null"]])(
    "rejects the foreign origin %s",
    async (origin) => {
      const res = await POST(post("{}", { origin }));

      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe("FORBIDDEN_ORIGIN");
      expect(generateJoke).not.toHaveBeenCalled();
    },
  );

  it("rejects a request without an Origin", async () => {
    const req = new Request("http://localhost/api/joke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect((await POST(req)).status).toBe(403);
  });

  it("accepts the Vercel preview URL", async () => {
    vi.stubEnv("APP_ORIGIN", "");
    vi.stubEnv("VERCEL_BRANCH_URL", "app-git-feature.vercel.app");

    const res = await POST(
      post("{}", { origin: "https://app-git-feature.vercel.app" }),
    );
    expect(res.status).toBe(200);
  });

  it("accepts localhost only in development", async () => {
    vi.stubEnv("APP_ORIGIN", "");
    const local = { origin: "http://localhost:3000" };

    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(post("{}", local))).status).toBe(403);

    vi.stubEnv("NODE_ENV", "development");
    expect((await POST(post("{}", local))).status).toBe(200);
  });

  it.each([
    ["config", new ConfigError("x"), 503, "SERVICE_UNAVAILABLE"],
    ["timeout", new APIConnectionTimeoutError(), 504, "TIMEOUT"],
    ["budget", new BudgetExceededError("x"), 504, "TIMEOUT"],
    [
      "rate limit",
      new RateLimitError(429, undefined, "secret provider text", new Headers()),
      429,
      "RATE_LIMITED",
    ],
    ["content", new ContentRejectedError("x"), 502, "GENERATION_FAILED"],
    ["unknown", new Error("secret provider text"), 502, "GENERATION_FAILED"],
  ])("maps a %s failure", async (_name, err, status, code) => {
    generateJoke.mockRejectedValue(err);

    const res = await POST(post("{}"));
    const text = await res.text();

    expect(res.status).toBe(status);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(text)).toEqual({ error: { code } });
    expect(text).not.toContain("secret");
  });

  it("never logs the topic or the joke", async () => {
    const logs: unknown[] = [];
    const capture = (...args: unknown[]) => void logs.push(...args);
    vi.spyOn(console, "info").mockImplementation(capture);
    vi.spyOn(console, "error").mockImplementation(capture);
    vi.spyOn(console, "log").mockImplementation(capture);

    await POST(post(JSON.stringify({ topic: "נושא-סודי" })));
    generateJoke.mockRejectedValueOnce(new Error("נושא-סודי"));
    await POST(post(JSON.stringify({ topic: "נושא-סודי" })));

    expect(logs).toHaveLength(2);
    const joined = logs.join("\n");
    expect(joined).not.toContain("נושא-סודי");
    expect(joined).not.toContain("בדיחה");
  });
});

describe("other methods", () => {
  it.each([
    ["GET", GET],
    ["PUT", PUT],
    ["PATCH", PATCH],
    ["DELETE", DELETE],
  ])("%s returns 405", async (_name, handler) => {
    const res = handler();

    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorCode(res)).toBe("METHOD_NOT_ALLOWED");
  });
});
