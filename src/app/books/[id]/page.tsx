import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LearningPath } from "@/components/book/LearningPath";
import { PathPersonalCard } from "@/components/book/PathPersonalCard";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { reconcileStoredLearningPathGate } from "@/lib/ai/book-processor";
import { checkAndRegenHearts } from "@/lib/hearts-store";
import { getCurrentUserId } from "@/lib/current-user";
import {
  getBookPathAvailability,
  getBookStudy,
  getPathPersonalStats,
  isDatabaseConfigured,
} from "@/lib/data";
import { PATH_DESIRE } from "@/lib/path-desire-copy";
import { isPathRecordId, summarizePath } from "@/lib/learning-path";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  const { id } = await params;
  if (!isPathRecordId(id)) {
    notFound();
  }
  const userId = await getCurrentUserId();
  // Gate first so path reflects advancePastEmpty; then one availability read (no double path load).
  // Shared RLS connection serializes anyway — parallel only helped when availability ran twice.
  const [study, gate, hearts, personal] = await Promise.all([
    getBookStudy(id),
    reconcileStoredLearningPathGate(id),
    checkAndRegenHearts(userId),
    getPathPersonalStats(),
  ]);
  if (!study) {
    notFound();
  }
  // Prefer gate.status when reconcile wrote path_status; study.pathStatus may be a parallel snapshot.
  const knownStatus =
    gate.ok && "status" in gate && gate.status ? gate.status : study.pathStatus;
  const availability = await getBookPathAvailability(study.book.id, knownStatus);
  const pathStatus = availability.status;
  const path = availability.nodes;
  // FE-009: draw what arrived — nodes.length > 0 → progress + map; never zero for gate≠approved.
  const hasNodes = path.length > 0;
  const progress = summarizePath(path);
  const chaptersOnPath = hasNodes
    ? new Set(path.map((node) => node.chapterTitle)).size
    : 0;
  const totalChapters = study.chapterCount;
  const headerChapterLine = !hasNodes
    ? `${totalChapters} глав · тропа не готова`
    : chaptersOnPath >= totalChapters
      ? `${totalChapters} глав · тропа ${progress.percent}%`
      : `${chaptersOnPath} из ${totalChapters} глав на тропе · тропа ${progress.percent}%`;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/books" className="hover:underline">
          Библиотека
        </Link>
      </p>
      <header className="rounded-3xl border bg-path-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{study.book.format.toUpperCase()}</Badge>
          <span className="text-sm text-muted-foreground">{headerChapterLine}</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-path-ink">{study.book.title}</h1>
        <p className="mt-1 text-muted-foreground">{study.book.author || "Автор не указан"}</p>
        {hasNodes ? (
          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-background/70" aria-hidden>
              <div className="h-full rounded-full bg-path" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="text-sm text-path-ink">
              {progress.done} из {progress.total} шагов
              {progress.nextTitle ? ` · следующий: ${progress.nextTitle}` : " · тропа пройдена"}
            </p>
          </div>
        ) : pathStatus === "rejected" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Тропа не прошла контроль — собери её ниже, когда будешь готов.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{PATH_DESIRE.emptyPath}</p>
        )}
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15.5rem] lg:items-start">
        <LearningPath
          bookId={study.book.id}
          nodes={path}
          hearts={hearts.hearts}
          pathStatus={pathStatus}
        />
        <PathPersonalCard
          streakCount={personal.streakCount}
          todayXp={personal.todayXp}
          dailyGoalXp={personal.dailyGoalXp}
        />
      </div>
    </div>
  );
}
