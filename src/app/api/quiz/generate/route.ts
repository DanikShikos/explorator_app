import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObjectWithCredits, hasAiProvider } from "@/lib/ai";
import { generatedQuizSchema, sanitizeGeneratedQuiz } from "@/lib/quiz-schema";
import { removeNullBytes } from "@/lib/utils";

const requestSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(8),
});

export async function POST(request: Request) {
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
    const { object } = await generateObjectWithCredits({
      schema: generatedQuizSchema,
      maxOutputTokens: 3500,
      prompt: [
        "Сгенерируй вопросы викторины по заметке.",
        "Смешай вопросы с выбором варианта и короткие открытые.",
        "Открытый ответ — одно–три слова: термин, число или короткая формула, не предложение.",
        "Для open_ended укажи options: null; если объяснение не нужно, укажи explanation: null.",
        `Заголовок: ${parsed.data.title}`,
        `Содержание:\n${parsed.data.content}`,
      ].join("\n\n"),
    });

    return NextResponse.json(sanitizeGeneratedQuiz(object));
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
