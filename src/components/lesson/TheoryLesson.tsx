"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { completeLessonNode } from "@/app/actions/lessons";
import { PathNotice } from "@/components/book/PathNotice";
import { BookCat } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
import { playCorrect, playWin } from "@/lib/sounds";

export function TheoryLesson({
  title,
  chapterTitle,
  cards,
  bookId,
  nodeId,
  xpReward,
}: {
  title: string;
  chapterTitle: string;
  cards: string[];
  bookId: string;
  nodeId: string;
  xpReward: number;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function finish() {
    playCorrect();
    startTransition(async () => {
      await completeLessonNode(nodeId, 100);
      playWin();
      setDone(true);
    });
  }

  if (cards.length === 0) {
    return (
      <PathNotice
        mood="idle"
        caption="Пустая глава"
        title="Пока нет карточек теории"
        description="Суть главы ещё не собралась. Вернись на тропу и открой шаг позже."
      >
        <Button
          className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
          type="button"
          onClick={() => router.push(`/books/${bookId}`)}
        >
          К тропе
        </Button>
      </PathNotice>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <p className="text-sm text-muted-foreground">
        <Link href={`/books/${bookId}`} className="hover:underline">
          К тропе
        </Link>
      </p>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{chapterTitle}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-path-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Сначала коротко прочитай суть — без потери жизней</p>
        </div>
        <BookCat mood={done ? "cheer" : "idle"} size={88} />
      </div>

      <div className="space-y-3">
        {cards.map((card, index) => (
          <motion.article
            key={`${index}-${card.slice(0, 24)}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 320, damping: 24 }}
            className="rounded-3xl border bg-accent px-5 py-4 shadow-sm"
          >
            <p className="text-[15px] leading-relaxed text-accent-foreground">{card}</p>
          </motion.article>
        ))}
      </div>

      {done ? (
        <div className="rounded-3xl border bg-path-soft p-5 text-center">
          <p className="text-lg font-semibold text-path-ink">Отлично! Теория засчитана</p>
          <p className="mt-1 text-sm text-muted-foreground">+{xpReward} очков. Дальше — практика на тропе.</p>
          <Button
            className="mt-4 h-12 rounded-2xl bg-path px-6 font-semibold text-path-foreground hover:bg-path/90"
            type="button"
            onClick={() => router.push(`/books/${bookId}`)}
          >
            К тропе
          </Button>
        </div>
      ) : (
        <Button
          className="h-12 w-full rounded-2xl bg-path text-base font-semibold text-path-foreground hover:bg-path/90"
          type="button"
          disabled={pending || cards.length === 0}
          onClick={finish}
        >
          {pending ? "Сохраняю…" : "Понятно"}
        </Button>
      )}
    </div>
  );
}
