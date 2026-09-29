import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObjectWithCredits, hasAiProvider } from "@/lib/ai";
import { AI_PROMPT_CLIP, clipAiPromptText } from "@/lib/ai/prompt-clip";
import { getOptionalUser } from "@/lib/current-user";
import { generatedQuizSchema, sanitizeGeneratedQuiz } from "@/lib/quiz-schema";
import { QUIZ_GENERATION_LIMIT, consumeRateLimit } from "@/lib/security/rate-limit";
import { isCrossOrigin } from "@/lib/security/request-guards";
import { removeNullBytes } from "@/lib/utils";

const requestSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(8).max(AI_PROMPT_CLIP.bookSummaryChapter),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (isCrossOrigin(origin, host)) {
    return NextResponse.json({ error: "Чужой origin" }, { status: 403 });
  }

  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ error: "Нужен вход" }, { status: 401 });
  }

  const limit = await consumeRateLimit(
    "quiz-ai",
    user.id,
    QUIZ_GENERATION_LIMIT.limit,
    QUIZ_GENERATION_LIMIT.windowSec,
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.error },
      {
        status: limit.status,
        headers: limit.status === 429 ? { "Retry-After": String(QUIZ_GENERATION_LIMIT.windowSec) } : undefined,
      },
    );
  }

  const requestBody = await request.json();
  const sanitizedBody = requestBody !== null && typeof requestBody === "object" && !Array.isArray(requestBody)
    ? Object.fromEntries(Object.entries(requestBody).map(([key, value]) => [
        key,
        typeof value === "string" ? removeNullBytes(value) : value,
      ]))
    : requestBody;
  const parsed = requestSchema.safeParse(sanitizedBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Нужны title и content заметки" }, { status: 400 });
  }

  if (!hasAiProvider()) {
    return NextResponse.json(
      { error: "Нет ключа Gemini, Groq или OpenRouter в .env.local." },
      { status: 501 },
    );
  }

  try {
    const clippedContent = clipAiPromptText(
      parsed.data.content,
      AI_PROMPT_CLIP.bookSummaryChapter,
    );
    const { object } = await generateObjectWithCredits({
      schema: generatedQuizSchema,
      maxOutputTokens: 3500,
      prompt: [
        "Сгенерируй вопросы викторины по заметке.",
        "Смешай вопросы с выбором варианта и короткие открытые.",
        "Открытый ответ — одно–три слова: термин, число или короткая формула, не предложение.",
        "Для open_ended укажи options: null; если объяснение не нужно, укажи explanation: null.",
        `Заголовок: ${parsed.data.title}`,
        `Содержание:\n${clippedContent}`,
      ].join("\n\n"),
    });

    const cleanQuiz = sanitizeGeneratedQuiz(object);
    if (!cleanQuiz) {
      return NextResponse.json({ error: "Не удалось сгенерировать вопросы." }, { status: 502 });
    }
    return NextResponse.json(cleanQuiz);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes("no credits") || message.includes("credits") || message.includes("billing") || message.includes("quota")) {
      return NextResponse.json(
        { error: "У Gemini, Groq и OpenRouter сейчас нет доступного лимита." },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Не удалось сгенерировать вопросы." }, { status: 502 });
  }
}
