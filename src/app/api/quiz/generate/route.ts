import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { openrouter } from "@/lib/ai";
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

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY не задан. Добавьте ключ в .env.local." },
      { status: 501 },
    );
  }

  try {
    const { object } = await generateObject({
      model: openrouter("openai/gpt-4o"),
      schema: generatedQuizSchema,
      maxOutputTokens: 3500,
      prompt: [
        "Сгенерируй вопросы викторины по заметке.",
        "Смешай вопросы с множественным выбором и открытые.",
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
        { error: "У провайдера закончились кредиты. Проверьте баланс OpenRouter или замените OPENROUTER_API_KEY в .env.local." },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Не удалось сгенерировать вопросы." }, { status: 502 });
  }
}
