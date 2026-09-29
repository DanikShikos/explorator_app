import Link from "next/link";
import { PathNotice } from "@/components/book/PathNotice";
import { LessonRunner } from "@/components/lesson/LessonRunner";
import { Button } from "@/components/ui/button";
import { generatePracticeLesson } from "@/lib/ai/book-processor";
import { checkAndRegenHearts } from "@/lib/hearts-store";
import { getCurrentUserId } from "@/lib/current-user";

function safeReturn(value: string | undefined) {
  if (value && value.startsWith("/books/")) {
    return value;
  }
  return "/books";
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const params = await searchParams;
  const back = safeReturn(params.return);
  const userId = await getCurrentUserId();
  const [hearts, practice] = await Promise.all([
    checkAndRegenHearts(userId),
    generatePracticeLesson(userId),
  ]);

  if (!practice.ok) {
    return (
      <PathNotice
        mood="idle"
        caption="Практика"
        title="Пока не из чего тренироваться"
        description={practice.error}
      >
        <Button
          className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
          asChild
        >
          <Link href={back}>К тропе</Link>
        </Button>
      </PathNotice>
    );
  }

  return (
    <LessonRunner
      title="Практика за сердце"
      description="Ошибки здесь не снимают жизни. Дойдите до конца и получите +1 сердце."
      cards={practice.cards}
      heartStatus={hearts}
      userId={userId}
      mode="practice"
      bookId={back.startsWith("/books/") ? back.split("/")[2] : undefined}
    />
  );
}
