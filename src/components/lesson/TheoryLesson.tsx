"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { completeLessonNode } from "@/app/actions/lessons";
import { saveDefinition, saveTheoryMoment } from "@/app/actions/notes";
import { PathNotice } from "@/components/book/PathNotice";
import { ChapterShareCard } from "@/components/lesson/ChapterShareCard";
import { BookCat } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
import { playCorrect, playWin } from "@/lib/sounds";
import { segmentTheoryCard } from "@/lib/theory-definitions";
import { theoryCompleteCopy } from "@/lib/theory-practice-ui";

export function TheoryLesson({
  title,
  chapterTitle,
  cards,
  bookId,
  nodeId,
  xpReward,
  hasPracticeAhead = true,
}: {
  title: string;
  chapterTitle: string;
  cards: string[];
  bookId: string;
  nodeId: string;
  xpReward: number;
  /** False for thin/theory-only chapters — no practice CTA after complete. */
  hasPracticeAhead?: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [savingCardIndex, setSavingCardIndex] = useState<number | null>(null);
  const [savingDefKey, setSavingDefKey] = useState<string | null>(null);
  const [savedCardIndexes, setSavedCardIndexes] = useState<Set<number>>(() => new Set());
  const [savedDefKeys, setSavedDefKeys] = useState<Set<string>>(() => new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const completeCopy = theoryCompleteCopy(hasPracticeAhead, xpReward);

  function finish() {
    playCorrect();
    startTransition(async () => {
      await completeLessonNode(nodeId, 100);
      playWin();
      setDone(true);
    });
  }

  function saveCard(cardText: string, cardIndex: number) {
    setSaveError(null);
    setSavingCardIndex(cardIndex);
    startTransition(async () => {
      const result = await saveTheoryMoment({
        bookId,
        nodeId,
        cardText,
        cardIndex,
      });
      setSavingCardIndex(null);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setSavedCardIndexes((prev) => new Set(prev).add(cardIndex));
    });
  }

  function saveDefinitionLine(
    term: string,
    meaning: string,
    cardIndex: number,
    defKey: string,
  ) {
    setSaveError(null);
    setSavingDefKey(defKey);
    startTransition(async () => {
      const result = await saveDefinition({
        bookId,
        nodeId,
        term,
        meaning,
        cardIndex,
      });
      setSavingDefKey(null);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setSavedDefKeys((prev) => new Set(prev).add(defKey));
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
          data-testid="back-to-path-button"
          onClick={() => router.push(`/books/${bookId}`)}
        >
          К тропе
        </Button>
      </PathNotice>
    );
  }

  const busySaving = savingCardIndex !== null || savingDefKey !== null;

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
        {cards.map((card, index) => {
          const isSaved = savedCardIndexes.has(index);
          const isSaving = savingCardIndex === index;
          const segments = segmentTheoryCard(card);
          return (
            <motion.article
              key={`${index}-${card.slice(0, 24)}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, type: "spring", stiffness: 320, damping: 24 }}
              className="rounded-3xl border bg-accent px-5 py-4 shadow-sm"
            >
              <div className="space-y-2 text-[15px] leading-relaxed text-accent-foreground">
                {segments.map((segment, segIndex) => {
                  if (segment.kind === "text") {
                    return (
                      <p key={`t-${segIndex}`} className="whitespace-pre-wrap">
                        {segment.text}
                      </p>
                    );
                  }
                  const defKey = `${index}:${segIndex}:${segment.term}`;
                  const defSaved = savedDefKeys.has(defKey);
                  const defSaving = savingDefKey === defKey;
                  return (
                    <div
                      key={defKey}
                      className="flex flex-wrap items-center gap-2 rounded-2xl bg-path-soft px-3 py-2 text-path-ink"
                      data-testid="definition-highlight"
                    >
                      <p className="min-w-0 flex-1 text-[15px] leading-relaxed">
                        <span className="font-semibold">{segment.term}</span>
                        {" — "}
                        {segment.meaning}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 gap-1 rounded-xl border-path/30 bg-background/60 text-path-ink hover:bg-path/15"
                        data-testid="save-definition-button"
                        disabled={pending || defSaving || defSaved}
                        onClick={() =>
                          saveDefinitionLine(segment.term, segment.meaning, index, defKey)
                        }
                      >
                        <Bookmark className="size-3.5" aria-hidden />
                        {defSaved ? "В заметках" : defSaving ? "…" : "Определение"}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl border-path/30 bg-path-soft text-path-ink hover:bg-path/15"
                  data-testid="save-theory-button"
                  disabled={pending || isSaving || isSaved}
                  onClick={() => saveCard(card, index)}
                >
                  <Bookmark className="size-3.5" aria-hidden />
                  {isSaved ? "В заметках" : isSaving ? "Сохраняю…" : "В заметки"}
                </Button>
              </div>
            </motion.article>
          );
        })}
      </div>

      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}

      {done ? (
        <div className="space-y-4">
          <div
            className="rounded-3xl border bg-path-soft p-5 text-center"
            data-testid="theory-complete-message"
          >
            <p className="text-lg font-semibold text-path-ink">{completeCopy.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">{completeCopy.body}</p>
            <Button
              className="mt-4 h-12 rounded-2xl bg-path px-6 font-semibold text-path-foreground hover:bg-path/90"
              type="button"
              data-testid="back-to-path-button"
              onClick={() => router.push(`/books/${bookId}`)}
            >
              К тропе
            </Button>
          </div>
          <ChapterShareCard bookId={bookId} nodeId={nodeId} />
        </div>
      ) : (
        <Button
          className="h-12 w-full rounded-2xl bg-path text-base font-semibold text-path-foreground hover:bg-path/90"
          type="button"
          data-testid="got-it-button"
          disabled={pending || cards.length === 0}
          onClick={finish}
        >
          {pending && !busySaving ? "Сохраняю…" : "Понятно"}
        </Button>
      )}
    </div>
  );
}
