import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, type LanguageModel } from "ai";
import type { z } from "zod";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Explorator",
  },
});

const gemini = createOpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const providers: { name: string; enabled: boolean; model: LanguageModel }[] = [
  { name: "Gemini", enabled: Boolean(process.env.GEMINI_API_KEY), model: gemini.chat("gemini-3.8-flash") },
  { name: "Groq", enabled: Boolean(process.env.GROQ_API_KEY), model: groq.chat("openai/gpt-oss-120b") },
  { name: "OpenRouter", enabled: Boolean(process.env.OPENROUTER_API_KEY), model: openrouter.chat("openai/gpt-4o-mini") },
];

function canTryNext(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as { statusCode?: number; name?: string };
    if (typeof record.statusCode === "number" && record.statusCode >= 400) return true;
    if (
      record.name === "AI_APICallError" ||
      record.name === "APICallError" ||
      record.name === "RetryError" ||
      record.name === "NoObjectGeneratedError"
    ) {
      return true;
    }
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("credit") ||
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("insufficient") ||
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("overloaded") ||
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("not found") ||
    message.includes("model") ||
    message.includes("429") ||
    message.includes("401") ||
    message.includes("402") ||
    message.includes("403")
  );
}

export function hasAiProvider() {
  return providers.some((provider) => provider.enabled);
}

type CreditGenerateOptions<T extends z.ZodType> = {
  schema: T;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  system?: string;
};

export async function generateObjectWithCredits<T extends z.ZodType>(options: CreditGenerateOptions<T>) {
  const available = providers.filter((provider) => provider.enabled);
  if (available.length === 0) {
    throw new Error("Нет ключей AI. Добавьте GEMINI_API_KEY, GROQ_API_KEY или OPENROUTER_API_KEY в .env.local.");
  }

  let lastError: unknown;
  for (const provider of available) {
    try {
      const result = await generateObject({
        model: provider.model,
        schema: options.schema,
        prompt: options.prompt,
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature,
        system: options.system,
        maxRetries: 1,
        providerOptions: {
          openai: { strictJsonSchema: false },
        },
      });
      console.info(`[ai] ${provider.name}`);
      return { object: result.object as z.infer<T> };
    } catch (error) {
      lastError = error;
      if (!canTryNext(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Ни у одного AI-провайдера не осталось лимита.");
}
