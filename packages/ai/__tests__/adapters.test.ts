import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdapterMessage, AdapterOptions } from "../src/types";
import { OpenAIAdapter } from "../src/adapters/OpenAIAdapter";
import { GeminiAdapter } from "../src/adapters/GeminiAdapter";
import { ClaudeAdapter } from "../src/adapters/ClaudeAdapter";
import { OpenRouterAdapter } from "../src/adapters/OpenRouterAdapter";
import { ChatGPTOAuthAdapter } from "../src/adapters/ChatGPTOAuthAdapter";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_KEY = "test-api-key-123";

const DEFAULT_OPTIONS: AdapterOptions = {
  model: "test-model",
  temperature: 0.2,
  maxTokens: 512,
};

const MESSAGES: AdapterMessage[] = [
  { role: "system", content: "You are a helper." },
  { role: "user", content: "Hello" },
];

function mockFetchResponse(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── OpenAI Adapter ──────────────────────────────────────────────────────────

describe("OpenAIAdapter", () => {
  it("sends correct request and parses response", async () => {
    const mockResponse = {
      choices: [{ message: { content: "Hi there!" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const adapter = new OpenAIAdapter();
    const result = await adapter.complete(MESSAGES, API_KEY, DEFAULT_OPTIONS);

    expect(result.content).toBe("Hi there!");
    expect(result.tokensUsed).toBe(15);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("https://api.openai.com/v1/chat/completions");
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${API_KEY}`);
  });

  it("throws on HTTP error", async () => {
    globalThis.fetch = mockFetchResponse({ error: "bad key" }, 401);
    const adapter = new OpenAIAdapter();
    await expect(
      adapter.complete(MESSAGES, API_KEY, DEFAULT_OPTIONS),
    ).rejects.toThrow("OpenAI HTTP 401");
  });
});

// ─── Gemini Adapter ──────────────────────────────────────────────────────────

describe("GeminiAdapter", () => {
  it("sends correct request and parses response", async () => {
    const mockResponse = {
      candidates: [
        {
          content: { parts: [{ text: "Gemini says hi" }] },
          finishReason: "STOP",
        },
      ],
      usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 4,
        totalTokenCount: 12,
      },
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const adapter = new GeminiAdapter();
    const result = await adapter.complete(MESSAGES, API_KEY, DEFAULT_OPTIONS);

    expect(result.content).toBe("Gemini says hi");
    expect(result.tokensUsed).toBe(12);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const url = call[0] as string;
    expect(url).toContain("generativelanguage.googleapis.com/v1beta");
    expect(url).toContain(`key=${API_KEY}`);

    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.safetySettings).toBeDefined();
    expect(body.systemInstruction).toBeDefined();
  });

  it("throws when candidates is empty (content blocked)", async () => {
    const mockResponse = {
      candidates: [],
      promptFeedback: { blockReason: "SAFETY" },
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const adapter = new GeminiAdapter();
    await expect(
      adapter.complete(MESSAGES, API_KEY, DEFAULT_OPTIONS),
    ).rejects.toThrow("bloqueou a requisicao");
  });

  it("throws when finishReason is SAFETY", async () => {
    const mockResponse = {
      candidates: [
        {
          content: { parts: [{ text: "" }] },
          finishReason: "SAFETY",
        },
      ],
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const adapter = new GeminiAdapter();
    await expect(
      adapter.complete(MESSAGES, API_KEY, DEFAULT_OPTIONS),
    ).rejects.toThrow("filtrou a resposta");
  });
});

// ─── Claude Adapter ──────────────────────────────────────────────────────────

describe("ClaudeAdapter", () => {
  it("sends correct request with required headers", async () => {
    const mockResponse = {
      content: [{ type: "text", text: "Claude says hi" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const adapter = new ClaudeAdapter();
    const result = await adapter.complete(MESSAGES, API_KEY, DEFAULT_OPTIONS);

    expect(result.content).toBe("Claude says hi");
    expect(result.tokensUsed).toBe(15);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("https://api.anthropic.com/v1/messages");
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe(API_KEY);
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
  });

  it("merges consecutive same-role messages", async () => {
    const mockResponse = {
      content: [{ type: "text", text: "ok" }],
      usage: { input_tokens: 5, output_tokens: 2 },
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const messages: AdapterMessage[] = [
      { role: "user", content: "Part 1" },
      { role: "user", content: "Part 2" },
    ];

    const adapter = new ClaudeAdapter();
    await adapter.complete(messages, API_KEY, DEFAULT_OPTIONS);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].content).toContain("Part 1");
    expect(body.messages[0].content).toContain("Part 2");
  });
});

// ─── OpenRouter Adapter ──────────────────────────────────────────────────────

describe("OpenRouterAdapter", () => {
  it("sends correct request with extra headers", async () => {
    const mockResponse = {
      choices: [{ message: { content: "Router says hi" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const adapter = new OpenRouterAdapter();
    const result = await adapter.complete(MESSAGES, API_KEY, {
      ...DEFAULT_OPTIONS,
      model: "google/gemini-2.5-flash",
    });

    expect(result.content).toBe("Router says hi");
    expect(result.tokensUsed).toBe(12);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("https://openrouter.ai/api/v1/chat/completions");
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${API_KEY}`);
    expect(headers["HTTP-Referer"]).toBe("https://domus.app");
    expect(headers["X-OpenRouter-Title"]).toBe("DOMUS");

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("google/gemini-2.5-flash");
  });

  it("throws on HTTP 429 rate limit", async () => {
    globalThis.fetch = mockFetchResponse({ error: "rate limited" }, 429);
    const adapter = new OpenRouterAdapter();
    await expect(
      adapter.complete(MESSAGES, API_KEY, DEFAULT_OPTIONS),
    ).rejects.toThrow("OpenRouter HTTP 429");
  });
});

// ─── ChatGPT OAuth Adapter (Responses API + SSE Streaming) ──────────────────

/** Helper: builds a mock SSE stream Response from a series of SSE events */
function mockSSEResponse(events: string[], status = 200) {
  const sseText = events.map((e) => `data: ${e}\n\n`).join("");
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseText));
      controller.close();
    },
  });
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body: stream,
    text: () => Promise.resolve(sseText),
  } as unknown as Response);
}

describe("ChatGPTOAuthAdapter", () => {
  // Build a fake JWT with an account_id claim for testing
  const fakePayload = JSON.stringify({
    "https://api.openai.com/auth": { account_id: "acct_test_123" },
    sub: "user-abc",
  });
  const b64Payload = btoa(fakePayload).replace(/=/g, "");
  const FAKE_JWT = `eyJhbGciOiJSUzI1NiJ9.${b64Payload}.fakesig`;

  it("sends SSE streaming request and collects text deltas", async () => {
    const events = [
      JSON.stringify({ type: "response.created", response: { id: "resp_123" } }),
      JSON.stringify({ type: "response.output_text.delta", delta: "Hello " }),
      JSON.stringify({ type: "response.output_text.delta", delta: "from ChatGPT!" }),
      JSON.stringify({
        type: "response.completed",
        response: { usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } },
      }),
      "[DONE]",
    ];
    globalThis.fetch = mockSSEResponse(events);

    const adapter = new ChatGPTOAuthAdapter();
    const result = await adapter.complete(MESSAGES, FAKE_JWT, DEFAULT_OPTIONS);

    expect(result.content).toBe("Hello from ChatGPT!");
    expect(result.tokensUsed).toBe(15);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("https://chatgpt.com/backend-api/codex/responses");
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${FAKE_JWT}`);
    expect(headers["ChatGPT-Account-ID"]).toBe("acct_test_123");
    expect(headers["Accept"]).toBe("text/event-stream");

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.instructions).toBe("You are a helper.");
    expect(body.input).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.stream).toBe(true);
    expect(body.store).toBe(true);
    expect(body.temperature).toBeUndefined();
    expect(body.max_output_tokens).toBeUndefined();
  });

  it("throws on response.failed SSE event", async () => {
    const events = [
      JSON.stringify({ type: "response.created", response: { id: "resp_err" } }),
      JSON.stringify({
        type: "response.failed",
        response: { error: { message: "Model not found", code: "model_not_found" } },
      }),
    ];
    globalThis.fetch = mockSSEResponse(events);

    const adapter = new ChatGPTOAuthAdapter();
    await expect(
      adapter.complete(MESSAGES, FAKE_JWT, DEFAULT_OPTIONS),
    ).rejects.toThrow("Model not found");
  });

  it("throws on HTTP error", async () => {
    globalThis.fetch = mockFetchResponse({ error: "unauthorized" }, 401);
    const adapter = new ChatGPTOAuthAdapter();
    await expect(
      adapter.complete(MESSAGES, FAKE_JWT, DEFAULT_OPTIONS),
    ).rejects.toThrow("ChatGPT HTTP 401");
  });
});
