"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { completeLessonNode, finishPractice, registerMiss } from "@/app/actions/lessons";
import { decrementHeart } from "@/lib/actions/hearts";
import { PathNotice } from "@/components/book/PathNotice";
import { MatchingPairsBoard } from "@/components/lesson/MatchingPairsBoard";
import { OutOfHeartsModal } from "@/components/lesson/OutOfHeartsModal";
import { SequenceOrderBoard } from "@/components/lesson/SequenceOrderBoard";
import { BookCat, type BookCatMood } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canonicalAnswer, isExerciseCorrect, type Exercise, type ExerciseAttempt } from "@/lib/exercises";
import type { HeartStatus } from "@/lib/hearts";
import { playCorrect, playHeartLoss, playWin, playWrong } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export type LessonCard = { id: string; exercise: Exercise };

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function LessonRunner({
  title,
  description,
  cards,
  heartStatus,
  userId,
  mode,
  bookId,
  nodeId,
}: {
  title: string;
  description: string;
  cards: LessonCard[];
  heartStatus: HeartStatus;
  userId: string;
  mode: "lesson" | "practice";
  bookId?: string;
  nodeId?: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(heartStatus);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<{ left: string; right: string }[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [cracking, setCracking] = useState<number | null>(null);
  const [catMood, setCatMood] = useState<BookCatMood>("idle");
  const [finished, setFinished] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(heartStatus.hearts <= 0 && mode === "lesson");
  const [pending, startTransition] = useTransition();
  const [choiceOrder, setChoiceOrder] = useState<string[]>(() =>
    shuffle(cards[0]?.exercise.pairs?.map((pair) => pair.right) ?? []),
  );
  const [stepOrder, setStepOrder] = useState<string[]>(() => shuffle(cards[0]?.exercise.steps ?? []));

  const card = cards[index];
  const exercise = card?.exercise;
  const progress = cards.length === 0 ? 0 : Math.round((index / cards.length) * 100);
  const returnHref = bookId ? `/books/${bookId}` : "/books";

  useEffect(() => {
    if (outOfHearts) {
      setCatMood("outOfHearts");
    }
  }, [outOfHearts]);

  useEffect(() => {
    if (cracking == null) {
      return;
    }
    const timer = window.setTimeout(() => setCracking(null), 500);
    return () => window.clearTimeout(timer);
  }, [cracking]);

  useEffect(() => {
    if (!flash) {
      return;
    }
    const timer = window.setTimeout(() => {
      setFlash(null);
      if (!outOfHearts && !feedback) {
        setCatMood("idle");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [flash, feedback, outOfHearts]);

  function prepareCard(nextIndex: number) {
    const next = cards[nextIndex]?.exercise;
    setPicked(null);
    setText("");
    setMatches([]);
    setOrder([]);
    setFeedback(null);
    setFlash(null);
    setCatMood("idle");
    setChoiceOrder(shuffle(next?.pairs?.map((pair) => pair.right) ?? []));
    setStepOrder(shuffle(next?.steps ?? []));
  }

  function attempt(): ExerciseAttempt | null {
    if (!exercise) {
      return null;
    }
    if (exercise.type === "multiple_choice") {
      return picked == null ? null : { type: "multiple_choice", index: picked };
    }
    if (exercise.type === "fill_blank") {
      return text.trim() ? { type: "fill_blank", text } : null;
    }
    if (exercise.type === "matching_pairs") {
      if (matches.length !== (exercise.pairs?.length ?? 0)) {
        return null;
      }
      return { type: "matching_pairs", pairs: matches };
    }
    if (order.length !== (exercise.steps?.length ?? 0)) {
      return null;
    }
    return { type: "sequence_order", steps: order };
  }

  async function finish(correct: number) {
    setFinished(true);
    setCatMood("cheer");
    playWin();
    const confetti = (await import("canvas-confetti")).default;
    void confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 } });
    const score = cards.length === 0 ? 0 : Math.round((correct / cards.length) * 100);
    if (mode === "practice") {
      await finishPractice();
      return;
    }
    if (nodeId) {
      await completeLessonNode(nodeId, score);
    }
  }

  function submit() {
    if (!exercise || !card || feedback || finished) {
      return;
    }
    const answer = attempt();
    if (!answer) {
      return;
    }
    const correct = isExerciseCorrect(exercise, answer);
    if (correct) {
      playCorrect();
      setFlash("correct");
      setCatMood("correct");
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      window.setTimeout(() => {
        if (index + 1 >= cards.length) {
          startTransition(() => finish(nextCorrect));
          return;
        }
        setIndex((value) => value + 1);
        prepareCard(index + 1);
      }, 480);
      return;
    }

    playWrong();
    setFlash("wrong");
    setCatMood("wrong");
    setFeedback(exercise.explanation);
    if (mode === "practice") {
      return;
    }
    playHeartLoss();
    setCracking(Math.max(0, hearts.hearts - 1));
    startTransition(async () => {
      await registerMiss(card.id);
      const next = await decrementHeart(userId);
      setHearts(next);
      if (next.hearts <= 0) {
        setOutOfHearts(true);
        setCatMood("outOfHearts");
      }
    });
  }

  function continueAfterMistake() {
    if (index + 1 >= cards.length) {
      startTransition(() => finish(correctCount));
      return;
    }
    setIndex((value) => value + 1);
    prepareCard(index + 1);
  }

  if (!exercise) {
    return (
      <PathNotice
        mood="idle"
        caption="Пока тут пусто"
        title="В этом уроке пока нет заданий"
        description="Котик ещё не собрал упражнения. Вернись на тропу и открой шаг позже."
      >
        <Button
          className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
          type="button"
          onClick={() => router.push(returnHref)}
        >
          К тропе
        </Button>
      </PathNotice>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {bookId ? (
        <p className="text-sm text-muted-foreground">
          <Link href={`/books/${bookId}`} className="hover:underline">
            К тропе
          </Link>
        </p>
      ) : null}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-path"
              initial={false}
              animate={{ width: `${finished ? 100 : progress}%` }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
            />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: hearts.maxHearts }, (_, heartIndex) => {
              const filled = heartIndex < hearts.hearts;
              return (
                <motion.span
                  key={heartIndex}
                  animate={
                    cracking === heartIndex
                      ? { scale: [1, 1.4, 0.35], rotate: [0, -20, 18, 0], opacity: [1, 1, 0.35] }
                      : { scale: 1, rotate: 0, opacity: 1 }
                  }
                  transition={{ duration: 0.45 }}
                >
                  <Heart className={cn("size-6", filled ? "fill-rose-500 text-rose-500" : "text-rose-200")} />
                </motion.span>
              );
            })}
          </div>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-path-ink">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <BookCat mood={catMood} size={80} />
        </div>
      </div>

      {finished ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border bg-path-soft p-6 text-center"
        >
          <BookCat mood="cheer" size={110} caption="Ура!" />
          <p className="mt-3 text-2xl font-semibold text-path-ink">
            {mode === "practice" ? "Практика засчитана" : "Урок пройден"}
          </p>
          <p className="mt-2 text-muted-foreground">
            {mode === "practice" ? "Вы получили +1 сердце." : `Верных ответов: ${correctCount} из ${cards.length}.`}
          </p>
          <Button className="mt-4 h-12 rounded-2xl bg-path px-6 text-path-foreground hover:bg-path/90" type="button" onClick={() => router.push(returnHref)}>
            Дальше
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-3xl border-2 bg-card p-5 shadow-sm transition",
            flash === "correct" && "border-path ring-4 ring-path/20",
            flash === "wrong" && "border-destructive ring-4 ring-destructive/15",
            !flash && "border-border",
          )}
        >
          <p className="text-sm font-medium text-muted-foreground">
            Задание {index + 1} из {cards.length}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-path-ink">{exercise.prompt}</h2>
          <div className="mt-4 space-y-3">
            {exercise.type === "multiple_choice"
              ? exercise.options?.map((option, optionIndex) => (
                  <button
                    key={option}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() => setPicked(optionIndex)}
                    className={cn(
                      "block min-h-14 w-full rounded-2xl border-2 px-4 py-3.5 text-left text-base font-medium transition",
                      picked === optionIndex
                        ? "border-path bg-path-soft text-path-ink"
                        : "border-input bg-muted hover:border-path",
                    )}
                  >
                    {option}
                  </button>
                ))
              : null}
            {exercise.type === "fill_blank" ? (
              <>
                <p className="text-base leading-relaxed">{exercise.sentence}</p>
                <Input
                  value={text}
                  maxLength={40}
                  onChange={(event) => setText(event.target.value)}
                  disabled={Boolean(feedback)}
                  className="h-12 rounded-2xl text-base"
                />
              </>
            ) : null}
            {exercise.type === "matching_pairs" && exercise.pairs ? (
              <MatchingPairsBoard
                pairs={exercise.pairs}
                rights={choiceOrder}
                matches={matches}
                disabled={Boolean(feedback)}
                onChange={setMatches}
              />
            ) : null}
            {exercise.type === "sequence_order" ? (
              <SequenceOrderBoard
                steps={stepOrder}
                order={order}
                disabled={Boolean(feedback)}
                onChange={setOrder}
              />
            ) : null}
          </div>

          <AnimatePresence>
            {flash === "correct" ? (
              <motion.p
                key="ok"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-2xl bg-path-soft px-4 py-3 text-center font-semibold text-path-ink"
              >
                Верно! Так держать
              </motion.p>
            ) : null}
          </AnimatePresence>

          {feedback ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl bg-destructive/10 p-4 text-destructive"
            >
              <p className="font-medium">Правильный ответ: {canonicalAnswer(exercise)}</p>
              <p className="mt-1 text-sm">{feedback}</p>
              <Button className="mt-3 rounded-2xl" type="button" variant="outline" onClick={continueAfterMistake}>
                Дальше
              </Button>
            </motion.div>
          ) : (
            <Button
              className="mt-4 h-12 w-full rounded-2xl bg-path text-base font-semibold text-path-foreground hover:bg-path/90 disabled:bg-path/40"
              type="button"
              onClick={submit}
              disabled={pending || outOfHearts || !attempt() || Boolean(flash)}
            >
              Проверить
            </Button>
          )}
        </motion.div>
      )}
      <OutOfHeartsModal open={outOfHearts} nextHeartAt={hearts.nextHeartAt} returnHref={returnHref} />
    </div>
  );
}
