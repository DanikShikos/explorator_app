"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PathNotice } from "@/components/book/PathNotice";
import { Button } from "@/components/ui/button";

export default function LessonNotFound() {
  const params = useParams<{ id?: string }>();
  const backHref = params.id ? `/books/${params.id}` : "/books";

  return (
    <PathNotice
      mood="idle"
      caption="Шаг не найден"
      title="Этого урока нет"
      description="Узел тропы не найден или уже недоступен. Вернись к книге и открой актуальный шаг."
    >
      <Button
        className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
        asChild
      >
        <Link href={backHref}>{params.id ? "К тропе" : "К библиотеке"}</Link>
      </Button>
    </PathNotice>
  );
}
