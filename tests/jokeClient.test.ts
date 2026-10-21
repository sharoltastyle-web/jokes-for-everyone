import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJoke } from "@/lib/jokeClient";

function stubFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestJoke", () => {
  it("posts the topic and returns the joke", async () => {
    const fetchMock = stubFetch(async () => Response.json({ joke: "בדיחה" }));

    await expect(requestJoke("חתולים")).resolves.toBe("בדיחה");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/joke");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ topic: "חתולים" }));
  });

  it.each([
    [
      "a network failure",
      async () => Promise.reject(new TypeError("Failed to fetch")),
    ],
    [
      "a non-JSON error page",
      async () =>
        new Response("<html>Bad gateway</html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        }),
    ],
    [
      "a WAF 429",
      async () => new Response("Too Many Requests", { status: 429 }),
    ],
    [
      "a non-JSON 200",
      async () => new Response("<html></html>", { status: 200 }),
    ],
    ["JSON without a joke", async () => Response.json({ other: 1 })],
    ["an empty joke", async () => Response.json({ joke: "  " })],
    [
      "an API error",
      async () => Response.json({ error: { code: "X" } }, { status: 502 }),
    ],
  ])("throws on %s", async (_name, impl) => {
    stubFetch(impl);
    await expect(requestJoke("")).rejects.toThrow();
  });
});
