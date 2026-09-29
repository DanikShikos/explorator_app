import { PathNotice } from "@/components/book/PathNotice";

export default function LessonLoading() {
  return (
    <PathNotice
      mood="idle"
      caption="Готовлю карточки"
      title="Собираю задания урока"
      description="Секунда — котик раскладывает теорию и упражнения по этому шагу."
    />
  );
}
