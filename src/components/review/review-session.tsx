"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { completeQuizAttempt, rateCard } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { QuizCard } from "@/db/schema";
import type { RatingKey } from "@/lib/fsrs";

export function ReviewSession({ cards }: { cards: QuizCard[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [reward, setReward] = useState<{ xpEarned: number; leveledUp: boolean; unlocked: { title: string }[] } | null>(null);
  const [done, setDone] = useState(cards.length === 0);
  const [pending, startTransition] = useTransition();

  if (done || index >= cards.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>На сегодня всё!</CardTitle>
          <CardDescription>Ты ответил на все вопросы. Возвращайся завтра, чтобы продолжить учёбу.</CardDescription>
        </CardHeader>
        <CardContent>
          {reward ? (
            <div className="mb-4 animate-bounce rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <p className="text-lg font-semibold">+{reward.xpEarned} очков</p>
              {reward.leveledUp ? <p className="font-medium">Уровень повышен!</p> : null}
              {reward.unlocked.map((achievement) => <p key={achievement.title} className="text-sm">Новое достижение: {achievement.title}</p>)}
            </div>
          ) : null}
          <Button asChild>
            <Link href="/">На панель</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const card = cards[index];
  const options = card.options ?? [];

  function normalizeAnswer(value: string) {
    return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function checkAnswer() {
    const userAnswer = card.type === "multiple_choice" ? selected : openAnswer;
    if (!userAnswer?.trim()) {
      return;
    }

    setIsCorrect(normalizeAnswer(userAnswer) === normalizeAnswer(card.answer));
    setChecked(true);
  }

  function onNext() {
    const ratingKey: RatingKey = isCorrect ? "good" : "again";
    startTransition(async () => {
      await rateCard(card.id, ratingKey);
      const nextIndex = index + 1;
      const nextCorrectAnswers = correctAnswers + (isCorrect ? 1 : 0);
      if (nextIndex >= cards.length) {
        const result = await completeQuizAttempt({
          noteId: card.noteId,
          totalQuestions: cards.length,
          correctAnswers: nextCorrectAnswers,
        });
        setReward({ xpEarned: result.xpEarned, leveledUp: result.leveledUp, unlocked: result.unlocked });
        setDone(true);
        return;
      }
      setIndex(nextIndex);
      setSelected(null);
      setOpenAnswer("");
      setChecked(false);
      setIsCorrect(false);
      setCorrectAnswers(nextCorrectAnswers);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Вопрос {index + 1} из {cards.length} ·{" "}
          {card.type === "multiple_choice" ? "выбор варианта" : "открытый вопрос"}
        </CardDescription>
        <CardTitle className="text-xl leading-relaxed">{card.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {card.type === "multiple_choice" ? (
          <div className="grid gap-2">
            {options.map((option) => (
              <Button
                key={option}
                type="button"
                variant={selected === option ? (checked ? (isCorrect ? "default" : "destructive") : "default") : "outline"}
                className={`h-auto justify-start py-3 whitespace-normal ${checked && selected === option && isCorrect ? "border-green-600 bg-green-600 text-white hover:bg-green-700" : ""}`}
                onClick={() => setSelected(option)}
                disabled={checked}
              >
                {option}
              </Button>
            ))}
          </div>
        ) : (
          <Textarea
            value={openAnswer}
            onChange={(event) => setOpenAnswer(event.target.value)}
            placeholder="Ваш ответ…"
            disabled={checked}
            className={checked ? (isCorrect ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50") : ""}
          />
        )}

        {!checked ? (
          <Button type="button" onClick={checkAnswer} disabled={pending || (card.type === "multiple_choice" ? !selected : !openAnswer.trim())}>
            Проверить ответ
          </Button>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-md border p-3 text-sm ${isCorrect ? "border-green-600 bg-green-50 text-green-950" : "border-red-600 bg-red-50 text-red-950"}`}>
              <p className="font-medium">{isCorrect ? "Правильно!" : "Неверно"}</p>
              {!isCorrect ? <p className="mt-1">Правильный ответ: {card.answer}</p> : null}
              {card.explanation ? <p className="mt-1">{card.explanation}</p> : null}
            </div>
            <Button type="button" onClick={onNext} disabled={pending}>
              Следующий вопрос
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
