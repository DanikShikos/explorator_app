import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LearningPath, type PathGateStatus } from "@/components/book/LearningPath";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { checkAndRegenHearts } from "@/lib/hearts-store";
import { getCurrentUserId } from "@/lib/current-user";
import { getBookStudy, getLearningPath, isDatabaseConfigured } from "@/lib/data";
import { isPathRecordId, summarizePath } from "@/lib/learning-path";

function readPathStatus(book: Record<string, unknown>): PathGateStatus | undefined {
  const raw = book.pathStatus ?? book.path_status;
  if (raw === "pending" || raw === "approved" || raw === "rejected") {
    return raw;
  }
  return undefined;
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  const { id } = await params;
  if (!isPathRecordId(id)) {
    notFound();
  }
  const study = await getBookStudy(id);
  if (!study) {
    notFound();
  }

  // FE-006: read-only open — no ensureFullLearningPath / AI on SSR.
  const userId = await getCurrentUserId();
  const [path, hearts] = await Promise.all([
    getLearningPath(study.book.id),
    checkAndRegenHearts(userId),
  ]);
  const pathStatus = readPathStatus(study.book as Record<string, unknown>);
  const gate = pathStatus ?? (path.length > 0 ? "approved" : "pending");
  const playable = gate === "approved" ? path : [];
  const progress = summarizePath(playable);
  const chaptersOnPath =
    playable.length > 0
      ? new Set(playable.map((node) => node.chapterTitle)).size
      : 0;
  const totalChapters = study.chapters.length;
  const headerChapterLine =
    gate !== "approved"
      ? `${totalChapters} глав · тропа не готова`
      : playable.length === 0
        ? `${totalChapters} глав`
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
        {gate !== "approved" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {gate === "rejected"
              ? "Тропа не прошла контроль — собери её ниже, когда будешь готов."
              : "Тропа ещё не собрана. Один явный запуск ниже — без автосборки при каждом заходе."}
          </p>
        ) : progress.total === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Собери тропу ниже — главы станут теорией и закреплением.</p>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-background/70" aria-hidden>
              <div className="h-full rounded-full bg-path" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="text-sm text-path-ink">
              {progress.done} из {progress.total} шагов
              {progress.nextTitle ? ` · следующий: ${progress.nextTitle}` : " · тропа пройдена"}
            </p>
          </div>
        )}
      </header>
      <LearningPath
        bookId={study.book.id}
        nodes={path}
        hearts={hearts.hearts}
        pathStatus={pathStatus}
      />
    </div>
  );
}
