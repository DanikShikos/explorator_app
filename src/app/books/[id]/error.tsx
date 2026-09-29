"use client";

import Link from "next/link";
import { PathNotice } from "@/components/book/PathNotice";
import { Button } from "@/components/ui/button";

export default function BookError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PathNotice
      mood="wrong"
      tone="alert"
      caption="Страница книги"
      title="Не получилось открыть книгу"
      description="Тропа не загрузилась. Можно вернуться в библиотеку или попробовать ещё раз."
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
          <Link href="/books">К библиотеке</Link>
        </Button>
      </div>
    </PathNotice>
  );
}
