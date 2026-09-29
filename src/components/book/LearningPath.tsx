"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Check, Crown, LockKeyhole, Repeat, Sparkles, Star, Swords, Zap } from "lucide-react";
import { buildLearningPath } from "@/app/actions/lessons";
import { PathNotice } from "@/components/book/PathNotice";
import { BookCat } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
import { PATH_DESIRE, pathDesirePathLines } from "@/lib/path-desire-copy";
import { isPathDone, summarizePath } from "@/lib/learning-path";
import { cn } from "@/lib/utils";

export type PathNode = {
  id: string;
  chapterTitle: string;
  title: string;
  description: string;
  nodeType: string;
  orderIndex: number;
  xpReward: number;
  status: "locked" | "available" | "completed" | "mastered";
  score: number | null;
};

/** Book-level gate from Backend (BE-006/007) — not a PathNode field. */
export type PathGateStatus = "pending" | "approved" | "rejected";

const labels: Record<string, string> = {
  summary_read: "Теория",
  quiz_sprint: "Спринт",
  flashcard_review: "Пары",
  boss_challenge: "Босс",
  practice_review: "Практика",
};

const icons: Record<string, typeof BookOpen> = {
  summary_read: BookOpen,
  quiz_sprint: Zap,
  flashcard_review: Sparkles,
  boss_challenge: Swords,
  practice_review: Repeat,
};

function isTheory(nodeType: string) {
  return nodeType === "summary_read";
}

/**
 * Empty pending/rejected notices only when there are no nodes.
 * Stored nodes → always show the snake (`path-gate-ready`), even if backend says pending.
 */
function resolveGateStatus(
  pathStatus: PathGateStatus | undefined,
  nodes: PathNode[],
): PathGateStatus {
  if (nodes.length > 0) return "approved";
  if (pathStatus === "rejected") return "rejected";
  if (pathStatus === "approved") return "approved";
  return "pending";
}

/** Zigzag offsets: center → right → center → left → … */
function snakeOffset(indexInChapter: number) {
  const pattern = ["translate-x-0", "translate-x-14", "translate-x-0", "-translate-x-14"] as const;
  return pattern[indexInChapter % pattern.length];
}

export function LearningPath({
  bookId,
  nodes,
  hearts,
  pathStatus,
}: {
  bookId: string;
  nodes: PathNode[];
  hearts: number;
  /** Availability from Backend; omit → infer (nodes → approved, else pending). */
  pathStatus?: PathGateStatus;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const gate = resolveGateStatus(pathStatus, nodes);
  const playable = gate === "approved" ? nodes : [];
  const [selected, setSelected] = useState<string | null>(
    () =>
      playable.find((node) => node.status === "available")?.id ??
      playable.find((node) => node.status !== "locked")?.id ??
      null,
  );
  const [pending, startTransition] = useTransition();
  const active = playable.find((node) => node.id === selected) ?? null;
  const currentAvailable = playable.find((node) => node.status === "available");
  const progress = summarizePath(playable);

  function build() {
    if (gate === "approved") return;
    setMessage(null);
    startTransition(async () => {
      const result = await buildLearningPath(bookId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (gate === "pending" || gate === "rejected") {
    const failed = gate === "rejected" || Boolean(message);
    const gateTestId = gate === "rejected" ? "path-gate-rejected" : "path-gate-pending";
    return (
      <div data-testid={gateTestId}>
        <PathNotice
          mood={failed ? "wrong" : "idle"}
          caption={failed ? "Не собралось" : "Подождём"}
          title={gate === "rejected" ? "Тропа не прошла контроль" : "Тропа ещё не готова"}
          description={
            gate === "rejected"
              ? "Контроль обучения не пройден — шаги пока недоступны. Можно собрать тропу заново."
              : PATH_DESIRE.emptyPath
          }
          tone={failed ? "alert" : "path"}
        >
          <Button
            className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
            type="button"
            data-testid="build-path-button"
            onClick={build}
            disabled={pending}
          >
            {pending ? "Собираю тропу…" : "Собрать тропу"}
          </Button>
          {message ? <p className="mt-3 text-sm text-destructive">{message}</p> : null}
        </PathNotice>
      </div>
    );
  }

  const pathMeta = playable.map((node, index) => {
    const prev = playable[index - 1];
    const chapterChanged = !prev || prev.chapterTitle !== node.chapterTitle;
    let indexInChapter = 0;
    if (!chapterChanged) {
      for (let i = index - 1; i >= 0; i -= 1) {
        if (playable[i].chapterTitle !== node.chapterTitle) break;
        indexInChapter += 1;
      }
    }
    const chapterOrdinal = playable
      .slice(0, index + 1)
      .filter((n, i, arr) => i === 0 || n.chapterTitle !== arr[i - 1].chapterTitle).length - 1;
    return { chapterChanged, indexInChapter, chapterOrdinal };
  });

  return (
    <section
      id="learning-path"
      data-testid="learning-path"
      data-path-gate="ready"
      className="space-y-5"
    >
      <div data-testid="path-gate-ready" className="sr-only">
        Тропа доступна
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-path-ink">Учебная тропа</h2>
        {(() => {
          const desire = pathDesirePathLines(Boolean(currentAvailable));
          return (
            <div data-testid="path-desire-copy" className="mt-1 space-y-1">
              <p className="text-sm text-muted-foreground">{desire.promise}</p>
              {desire.currentStep ? (
                <p className="text-sm font-medium text-path-ink">{desire.currentStep}</p>
              ) : null}
            </div>
          );
        })()}
        <p className="mt-2 text-sm font-medium text-path-ink">
          {progress.done} из {progress.total} шагов
          {progress.nextTitle ? ` · дальше: ${progress.nextTitle}` : ""}
        </p>
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col items-center gap-0 px-4 pb-[calc(16rem+env(safe-area-inset-bottom))] sm:px-8">
        {playable.map((node, index) => {
          const { chapterChanged, indexInChapter, chapterOrdinal } = pathMeta[index];
          const done = isPathDone(node.status);
          const locked = node.status === "locked";
          const available = node.status === "available";
          const mastered = node.status === "mastered";
          const isCurrent = available && currentAvailable?.id === node.id;
          const Icon = icons[node.nodeType] ?? Star;
          const offset = snakeOffset(indexInChapter);
          const typeLabel = labels[node.nodeType] ?? "Урок";
          const statusLabel = locked
            ? "закрыт"
            : available
              ? "доступен"
              : mastered
                ? "мастерство"
                : "пройден";

          return (
            <div key={node.id} className="flex w-full flex-col items-center">
              {chapterChanged ? (
                <div
                  className={cn(
                    "mb-6 w-full",
                    chapterOrdinal > 0 && "mt-8 border-t border-border/70 pt-6",
                  )}
                >
                  <div
                    data-testid="path-unit-banner"
                    className="mx-auto flex max-w-sm items-center gap-3 px-1"
                  >
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <p className="shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {node.chapterTitle}
                    </p>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                  </div>
                </div>
              ) : null}

              {index > 0 && !chapterChanged ? (
                <div
                  className={cn(
                    "mb-1 h-8 w-1.5 rounded-full",
                    done || available ? "bg-path/80" : "bg-muted",
                  )}
                  aria-hidden
                />
              ) : null}

              <div
                className={cn(
                  "relative flex items-center justify-center",
                  offset,
                  isCurrent && "z-10",
                )}
                data-testid={isCurrent ? "path-current-node" : undefined}
              >
                <motion.button
                  type="button"
                  aria-pressed={selected === node.id}
                  aria-label={`${node.title}. ${typeLabel}, ${statusLabel}`}
                  onClick={() => setSelected(node.id)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-full border-[5px] text-center font-semibold shadow-sm transition",
                    isCurrent ? "size-[5.5rem] text-[11px]" : "size-[4.75rem] text-[11px]",
                    node.status === "completed" &&
                      "border-path bg-path text-path-foreground",
                    mastered && "border-reward bg-reward text-reward-foreground",
                    available &&
                      "border-path bg-path-soft text-path-ink ring-4 ring-path/30",
                    locked && "border-border bg-muted text-muted-foreground",
                    selected === node.id && !available && "ring-4 ring-ring/35",
                  )}
                >
                  {locked ? (
                    <LockKeyhole className="size-5 opacity-55" strokeWidth={2.25} />
                  ) : mastered ? (
                    <Crown className="size-5 fill-reward-foreground" />
                  ) : done ? (
                    <Check className="size-6 stroke-[3]" />
                  ) : (
                    <>
                      <Icon className="mb-0.5 size-5" />
                      <span className="leading-none">{typeLabel}</span>
                    </>
                  )}
                </motion.button>

                {isCurrent ? (
                  <div className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 sm:-right-20">
                    <BookCat mood="cheer" size={72} caption="Сюда!" />
                  </div>
                ) : null}
              </div>

              <p
                className={cn(
                  "mt-2 max-w-[10rem] text-center text-sm font-medium",
                  locked ? "text-muted-foreground" : "text-path-ink",
                  offset,
                )}
              >
                {done || mastered ? typeLabel : node.title}
              </p>
              {mastered ? (
                <p className={cn("max-w-[10rem] text-center text-xs text-reward-foreground", offset)}>
                  Мастерство
                </p>
              ) : null}
            </div>
          );
        })}

        {playable.length === 0 ? (
          <PathNotice
            mood="idle"
            caption="Пусто"
            title="На тропе пока нет шагов"
            description={PATH_DESIRE.emptyPath}
            tone="path"
          />
        ) : null}

        {!currentAvailable && playable.length > 0 ? (
          <div className="mt-10 flex justify-center">
            <BookCat mood="idle" size={64} caption="Отдых" />
          </div>
        ) : null}
      </div>

      {active ? (
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-3xl border bg-card p-5 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <BookCat mood={active.status === "locked" ? "idle" : "cheer"} size={64} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{active.chapterTitle}</p>
              <h3 className="mt-1 text-lg font-semibold text-path-ink">{active.title}</h3>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{active.description}</p>
              <p className="mt-2 text-sm font-medium text-reward-foreground">+{active.xpReward} очков</p>
              {active.status === "locked" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Этот шаг ещё закрыт.
                  {currentAvailable
                    ? ` Сначала: ${currentAvailable.title}.`
                    : " Сначала пройди предыдущий шаг — котик подождёт."}
                </p>
              ) : isTheory(active.nodeType) ? (
                <Button className="mt-3 h-11 rounded-2xl bg-path px-5 font-semibold text-path-foreground hover:bg-path/90" asChild>
                  <Link href={`/books/${bookId}/lesson/${active.id}`} data-testid="start-lesson-button">
                    {isPathDone(active.status) ? "Повторить теорию" : "Читать теорию"}
                  </Link>
                </Button>
              ) : hearts < 1 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {PATH_DESIRE.outOfHearts.title}. {PATH_DESIRE.outOfHearts.description}
                  </p>
                  <Button className="h-11 rounded-2xl bg-path px-5 font-semibold text-path-foreground hover:bg-path/90" asChild>
                    <Link
                      href={`/practice?return=${encodeURIComponent(`/books/${bookId}`)}`}
                      data-testid="practice-button"
                    >
                      Пройти практику
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button className="mt-3 h-11 rounded-2xl bg-path px-5 font-semibold text-path-foreground hover:bg-path/90" asChild>
                  <Link href={`/books/${bookId}/lesson/${active.id}`} data-testid="start-lesson-button">
                    {isPathDone(active.status) ? "Повторить урок" : "Начать урок"}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}
