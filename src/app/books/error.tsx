"use client";

import { PathNotice } from "@/components/book/PathNotice";
import { Button } from "@/components/ui/button";

export default function BooksError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PathNotice
      mood="wrong"
      tone="alert"
      caption="Что-то сломалось"
      title="Библиотека не открылась"
      description="Котик не смог достать книги. Обнови страницу — если ошибка повторится, база ещё не готова."
    >
      <Button
        className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
        type="button"
        onClick={() => reset()}
      >
        Попробовать снова
      </Button>
    </PathNotice>
  );
}
