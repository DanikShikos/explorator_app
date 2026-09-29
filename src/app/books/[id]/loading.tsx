import { PathNotice } from "@/components/book/PathNotice";

export default function BookLoading() {
  return (
    <PathNotice
      mood="idle"
      caption="Открываю"
      title="Открываю книгу"
      description="Секунда — котик листает страницы. Тропа не собирается заново при каждом заходе."
    />
  );
}
