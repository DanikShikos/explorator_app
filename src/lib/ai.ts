import { createOpenAI } from "@ai-sdk/openai";

const apiKey = process.env.OPENROUTER_API_KEY;

export const openrouter = createOpenAI({
  apiKey,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Explorator",
  },
});
