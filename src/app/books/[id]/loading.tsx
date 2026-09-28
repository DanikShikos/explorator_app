import { PathNotice } from "@/components/book/PathNotice";

export default function BookLoading() {
  return (
    <PathNotice
      mood="idle"
      caption="Читаю книгу"
      title="Собираю тропу"
      description="Секунда — котик раскладывает главы в шаги."
    />
  );
}
