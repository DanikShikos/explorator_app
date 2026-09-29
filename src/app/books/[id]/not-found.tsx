import Link from "next/link";
import { PathNotice } from "@/components/book/PathNotice";
import { Button } from "@/components/ui/button";

export default function BookNotFound() {
  return (
    <PathNotice
      mood="idle"
      caption="Пустая полка"
      title="Такой книги нет"
      description="Её нет в библиотеке или ссылка устарела. Выбери другую книгу и собери тропу заново."
    >
      <Button
        className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
        asChild
      >
        <Link href="/books">К библиотеке</Link>
      </Button>
    </PathNotice>
  );
}
