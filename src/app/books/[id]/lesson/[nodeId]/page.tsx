import Link from "next/link";
import { notFound } from "next/navigation";
import { PathNotice } from "@/components/book/PathNotice";
import { LessonRunner } from "@/components/lesson/LessonRunner";
import { OutOfHeartsModal } from "@/components/lesson/OutOfHeartsModal";
import { TheoryLesson } from "@/components/lesson/TheoryLesson";
import { Button } from "@/components/ui/button";
import { generateLessonContentOnFly } from "@/lib/ai/book-processor";
import { checkAndRegenHearts } from "@/lib/hearts-store";
import { getCurrentUserId } from "@/lib/current-user";
import { isPathRecordId } from "@/lib/learning-path";

export default async function LessonPage({ params }: { params: Promise<{ id: string; nodeId: string }> }) {
  const { id, nodeId } = await params;
  if (!isPathRecordId(id) || !isPathRecordId(nodeId)) {
    notFound();
  }
  const userId = await getCurrentUserId();
  const hearts = await checkAndRegenHearts(userId);
  const lesson = await generateLessonContentOnFly(nodeId);
  if (!lesson.ok) {
    if (lesson.error === "Урок ещё закрыт") {
      return (
        <PathNotice
          mood="idle"
          caption="Ещё рано"
          title="Урок ещё закрыт"
          description="Сначала пройди предыдущий шаг на тропе. Котик подождёт у открытого кружка."
        >
          <Button
            className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
            asChild
          >
            <Link href={`/books/${id}`}>К тропе</Link>
          </Button>
        </PathNotice>
      );
    }
    notFound();
  }

  if (lesson.node.nodeType === "summary_read") {
    return (
      <TheoryLesson
        title={lesson.node.title}
        chapterTitle={lesson.chapterTitle}
        cards={lesson.theoryCards}
        bookId={id}
        nodeId={nodeId}
        xpReward={lesson.node.xpReward}
      />
    );
  }

  if (hearts.hearts < 1) {
    return <OutOfHeartsModal open nextHeartAt={hearts.nextHeartAt} returnHref={`/books/${id}`} />;
  }

  return (
    <LessonRunner
      title={lesson.node.title}
      description={lesson.node.description}
      cards={lesson.cards}
      heartStatus={hearts}
      userId={userId}
      mode="lesson"
      bookId={id}
      nodeId={nodeId}
    />
  );
}
