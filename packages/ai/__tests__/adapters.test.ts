import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdapterMessage, AdapterOptions } from "../src/types";
import { OpenAIAdapter } from "../src/adapters/OpenAIAdapter";
import { GeminiAdapter } from "../src/adapters/GeminiAdapter";
import { ClaudeAdapter } from "../src/adapters/ClaudeAdapter";
import { DeepSeekAdapter } from "../src/adapters/DeepSeekAdapter";
import { QwenAdapter } from "../src/adapters/QwenAdapter";

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

// ─── DeepSeek Adapter ────────────────────────────────────────────────────────

describe("DeepSeekAdapter", () => {
  it("sends correct request to DeepSeek API", async () => {
    const mockResponse = {
      choices: [{ message: { content: "DeepSeek says hi" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const adapter = new DeepSeekAdapter();
    const result = await adapter.complete(MESSAGES, API_KEY, {
      ...DEFAULT_OPTIONS,
      model: "deepseek-chat",
    });

    expect(result.content).toBe("DeepSeek says hi");
    expect(result.tokensUsed).toBe(12);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("https://api.deepseek.com/chat/completions");
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${API_KEY}`);
  });

  it("throws on HTTP 429 rate limit", async () => {
    globalThis.fetch = mockFetchResponse({ error: "rate limited" }, 429);
    const adapter = new DeepSeekAdapter();
    await expect(
      adapter.complete(MESSAGES, API_KEY, DEFAULT_OPTIONS),
    ).rejects.toThrow("DeepSeek HTTP 429");
  });
});

// ─── Qwen Adapter ────────────────────────────────────────────────────────────

describe("QwenAdapter", () => {
  it("sends correct request to DashScope API", async () => {
    const mockResponse = {
      choices: [{ message: { content: "Qwen says hi" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    globalThis.fetch = mockFetchResponse(mockResponse);

    const adapter = new QwenAdapter();
    const result = await adapter.complete(MESSAGES, API_KEY, {
      ...DEFAULT_OPTIONS,
      model: "qwen3.5-flash",
    });

    expect(result.content).toBe("Qwen says hi");
    expect(result.tokensUsed).toBe(15);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
  });
});
