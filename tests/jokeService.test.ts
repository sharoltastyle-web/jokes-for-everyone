import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APIConnectionTimeoutError, InternalServerError } from "openai";

const responsesCreate = vi.fn();
const moderationsCreate = vi.fn();

vi.mock("@/lib/openai", () => ({
  ConfigError: class ConfigError extends Error {},
  getOpenAI: () => ({
    client: {
      responses: { create: responsesCreate },
      moderations: { create: moderationsCreate },
    },
    model: "test-model",
  }),
}));

const {
  generateJoke,
  BudgetExceededError,
  ContentRejectedError,
  GenerationError,
} = await import("@/lib/jokeService");

function completed(text: string) {
  return {
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text }] }],
    output_text: text,
    usage: { total_tokens: 100 },
  };
}

const refusal = {
  status: "completed",
  output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }],
  output_text: "",
};

const clean = { results: [{ flagged: false }] };
const flagged = { results: [{ flagged: true }] };

beforeEach(() => {
  responsesCreate.mockReset();
  moderationsCreate.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("generateJoke", () => {
  it("returns a joke that passed moderation", async () => {
    responsesCreate.mockResolvedValue(completed("בדיחה"));
    moderationsCreate.mockResolvedValue(clean);

    const result = await generateJoke("חתולים");

    expect(result).toEqual({ joke: "בדיחה", tokens: 100, fallbackUsed: false });
    expect(responsesCreate).toHaveBeenCalledTimes(1);
    expect(responsesCreate.mock.calls[0][0]).toMatchObject({
      model: "test-model",
      store: false,
      max_output_tokens: 1024,
    });
    expect(responsesCreate.mock.calls[0][0].input).toContain("חתולים");
    expect(moderationsCreate.mock.calls[0][0]).toEqual({
      model: "omni-moderation-latest",
      input: "בדיחה",
    });
  });

  it("never returns flagged output and uses one general-joke fallback", async () => {
    responsesCreate
      .mockResolvedValueOnce(completed("רעה"))
      .mockResolvedValueOnce(completed("נקייה"));
    moderationsCreate.mockResolvedValueOnce(flagged).mockResolvedValueOnce(clean);

    const result = await generateJoke("משהו");

    expect(result.joke).toBe("נקייה");
    expect(result.fallbackUsed).toBe(true);
    expect(responsesCreate).toHaveBeenCalledTimes(2);
    // The fallback is a general joke, without the original topic.
    expect(responsesCreate.mock.calls[1][0].input).not.toContain("משהו");
  });

  it("fails when the fallback is flagged too, with no third attempt", async () => {
    responsesCreate.mockResolvedValue(completed("רעה"));
    moderationsCreate.mockResolvedValue(flagged);

    await expect(generateJoke("משהו")).rejects.toBeInstanceOf(
      ContentRejectedError,
    );
    expect(responsesCreate).toHaveBeenCalledTimes(2);
  });

  it("uses the fallback once after a refusal", async () => {
    responsesCreate
      .mockResolvedValueOnce(refusal)
      .mockResolvedValueOnce(completed("נקייה"));
    moderationsCreate.mockResolvedValue(clean);

    const result = await generateJoke("משהו");

    expect(result).toMatchObject({ joke: "נקייה", fallbackUsed: true });
    expect(moderationsCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["incomplete", { status: "incomplete", output: [], output_text: "חצי" }],
    ["empty", completed("   ")],
  ])("fails on %s output without a fallback", async (_name, response) => {
    responsesCreate.mockResolvedValue(response);

    await expect(generateJoke("")).rejects.toBeInstanceOf(GenerationError);
    expect(responsesCreate).toHaveBeenCalledTimes(1);
    expect(moderationsCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["timeout", new APIConnectionTimeoutError()],
    ["provider error", new InternalServerError(500, undefined, "x", new Headers())],
  ])("fails on a generation %s without a fallback", async (_name, err) => {
    responsesCreate.mockRejectedValue(err);

    await expect(generateJoke("")).rejects.toBe(err);
    expect(responsesCreate).toHaveBeenCalledTimes(1);
  });

  it("does not expose output when moderation fails", async () => {
    responsesCreate.mockResolvedValue(completed("לא נבדקה"));
    const err = new APIConnectionTimeoutError();
    moderationsCreate.mockRejectedValue(err);

    await expect(generateJoke("")).rejects.toBe(err);
    expect(responsesCreate).toHaveBeenCalledTimes(1);
  });

  it("caps each call timeout by its limit and the remaining budget", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    // The first attempt takes 20s in total, leaving 5s of the 25s budget.
    responsesCreate
      .mockImplementationOnce(async () => {
        vi.setSystemTime(18_000);
        return completed("רעה");
      })
      .mockImplementationOnce(async () => completed("נקייה"));
    moderationsCreate
      .mockImplementationOnce(async () => {
        vi.setSystemTime(20_000);
        return flagged;
      })
      .mockImplementationOnce(async () => clean);

    await generateJoke("");

    expect(responsesCreate.mock.calls[0][1]).toEqual({ timeout: 10_000 });
    expect(moderationsCreate.mock.calls[0][1]).toEqual({ timeout: 4_000 });
    expect(responsesCreate.mock.calls[1][1]).toEqual({ timeout: 5_000 });
    expect(moderationsCreate.mock.calls[1][1]).toEqual({ timeout: 4_000 });
  });

  it("stops when the time budget is exhausted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    responsesCreate.mockImplementationOnce(async () => {
      vi.setSystemTime(26_000);
      return completed("בדיחה");
    });

    await expect(generateJoke("")).rejects.toBeInstanceOf(BudgetExceededError);
    expect(moderationsCreate).not.toHaveBeenCalled();
  });
});
