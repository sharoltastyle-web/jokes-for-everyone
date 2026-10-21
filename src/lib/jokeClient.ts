const CLIENT_TIMEOUT_MS = 30_000;

// Any failure (network, timeout, non-OK status, non-JSON body, missing joke) throws.
export async function requestJoke(topic: string): Promise<string> {
  const res = await fetch("/api/joke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  const joke = (data as { joke?: unknown } | null)?.joke;
  if (typeof joke !== "string" || !joke.trim()) throw new Error("No joke");
  return joke;
}
