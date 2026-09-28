"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PathNotice } from "@/components/book/PathNotice";
import { Button } from "@/components/ui/button";

export default function LessonError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ id: string }>();
  const backHref = params.id ? `/books/${params.id}` : "/books";

  return (
    <PathNotice
      mood="wrong"
      tone="alert"
      caption="Урок"
      title="Урок не собрался"
      description="Задания не загрузились. Вернись на тропу и открой шаг ещё раз."
    >
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
          type="button"
          onClick={() => reset()}
        >
          Попробовать снова
        </Button>
        <Button className="h-12 rounded-2xl px-6" variant="outline" asChild>
          <Link href={backHref}>К тропе</Link>
        </Button>
      </div>
    </PathNotice>
  );
}
