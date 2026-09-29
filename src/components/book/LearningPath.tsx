"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Crown, LockKeyhole, Repeat, Sparkles, Star, Swords, Zap } from "lucide-react";
import { buildLearningPath } from "@/app/actions/lessons";
import { PathNotice } from "@/components/book/PathNotice";
import { BookCat } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
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

function resolveGateStatus(
  pathStatus: PathGateStatus | undefined,
  nodes: PathNode[],
): PathGateStatus {
  if (pathStatus) return pathStatus;
  return nodes.length > 0 ? "approved" : "pending";
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
              : "Пока нет готовой учебной тропы. Собери её один раз — без автозапуска при каждом заходе."
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
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-path-ink">Учебная тропа</h2>
          <p className="text-sm text-muted-foreground">Теория → практика → испытание. Без серых списков глав.</p>
          <p className="mt-2 text-sm font-medium text-path-ink">
            {progress.done} из {progress.total} шагов
            {progress.nextTitle ? ` · дальше: ${progress.nextTitle}` : ""}
          </p>
        </div>
        <BookCat mood={currentAvailable ? "cheer" : "idle"} size={72} caption={currentAvailable ? "Сюда!" : "Отдых"} />
      </div>

      <div className="relative mx-auto flex max-w-md flex-col items-center pb-[calc(16rem+env(safe-area-inset-bottom))]">
        {playable.map((node, index) => {
          const done = isPathDone(node.status);
          const locked = node.status === "locked";
          const available = node.status === "available";
          const mastered = node.status === "mastered";
          const theory = isTheory(node.nodeType);
          const Icon = icons[node.nodeType] ?? Star;
          const offset = index % 2 === 0 ? "translate-x-10" : "-translate-x-10";
          const typeLabel = labels[node.nodeType] ?? "Урок";
          const statusLabel = locked
            ? "закрыт"
            : available
              ? "доступен"
              : mastered
                ? "мастерство"
                : "пройден";

          return (
            <div key={node.id} className={cn("flex flex-col items-center", offset)}>
              {index > 0 ? (
                <div className={cn("h-7 w-1.5 rounded-full", done || available ? "bg-path" : "bg-border")} />
              ) : null}
              <motion.button
                type="button"
                aria-pressed={selected === node.id}
                aria-label={`${node.title}. ${typeLabel}, ${statusLabel}`}
                onClick={() => setSelected(node.id)}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  "relative flex flex-col items-center justify-center border-4 text-center font-semibold shadow-sm transition",
                  theory ? "h-16 w-[9.5rem] rounded-2xl px-2 text-xs" : "size-[4.75rem] rounded-full text-[11px]",
                  node.status === "completed" && "border-reward bg-accent text-reward-foreground",
                  mastered && "border-reward bg-reward text-reward-foreground",
                  available && "border-path bg-path-soft text-path-ink ring-4 ring-path/25",
                  locked && "border-border bg-muted text-muted-foreground",
                  selected === node.id && "ring-4 ring-ring/40",
                )}
              >
                {locked ? (
                  <LockKeyhole className="mb-0.5 size-4 opacity-60" />
                ) : mastered ? (
                  <Crown className="mb-0.5 size-4 fill-reward-foreground" />
                ) : done ? (
                  <Star className="mb-0.5 size-4 fill-reward text-reward-foreground" />
                ) : (
                  <Icon className="mb-0.5 size-4" />
                )}
                {typeLabel}
                {available ? <span className="absolute -right-1 -top-1 size-3 rounded-full bg-path shadow" /> : null}
              </motion.button>
              <p className="mt-2 max-w-36 text-center text-sm font-medium text-path-ink">{node.title}</p>
              {mastered ? <p className="max-w-36 text-center text-xs text-reward-foreground">Мастерство</p> : null}
            </div>
          );
        })}
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
                    Нужна хотя бы 1 жизнь. Практика вернёт сердце сразу, иначе одно сердце каждые 4 часа — без покупки за очки.
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
