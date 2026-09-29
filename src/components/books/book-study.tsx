"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearBookQuiz, generateBookMaterials, submitBookQuiz } from "@/app/actions/book-study";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BookChapter, Flashcard, QuizQuestion } from "@/db/schema";

type StudyProps = {
  bookId: string;
  summary: string | null;
  chapters: BookChapter[];
  cards: Flashcard[];
  quizId: string | null;
  questions: QuizQuestion[];
};

type QuizResult = {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  xpEarned: number;
  streakCount: number;
  explanations: { correctAnswerIndex: number; explanation: string }[];
};

const tabs = [
  ["summary", "Суть"],
  ["chapters", "Главы"],
  ["quiz", "Тест"],
  ["cards", "Карточки"],
] as const;

function splitSummary(summary: string | null) {
  if (!summary) return null;
  const [idea, rulesBlock] = summary.split(/\n+Практические правила:\n/);
  const rules = rulesBlock
    ?.split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean) ?? [];
  return { idea: idea.trim(), rules };
}

export function BookStudy({ bookId, summary, chapters, cards, quizId, questions }: StudyProps) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number][0]>(summary ? "summary" : "chapters");
  const [message, setMessage] = useState<string | null>(null);
  const [openChapter, setOpenChapter] = useState<string | null>(chapters[0]?.id ?? null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  const parsed = splitSummary(summary);
  const currentQuestion = questions[questionIndex];
  const currentCard = cards[cardIndex];

  useEffect(() => {
    setAnswers(questions.map(() => -1));
    setQuestionIndex(0);
    setResult(null);
  }, [quizId, questions]);

  function generate() {
    setMessage(null);
    startTransition(async () => {
      const response = await generateBookMaterials(bookId);
      if (!response.ok) {
        setMessage(response.error);
        return;
      }
      setMessage(`Готово: ${response.questions} вопросов. Можно сразу пройти тест.`);
      setTab("summary");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{summary ? "Разбор готов" : "Книга ещё не разобрана"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary
              ? "Суть, главы и тест уже на месте. Разбор можно собрать заново."
              : "Мы выделим главную идею, правила по главам и вопросы на применение."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={generate} disabled={pending}>
            {pending ? "Разбираю книгу…" : summary ? "Обновить разбор" : "Собрать суть и тест"}
          </Button>
          {quizId ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const response = await clearBookQuiz(bookId);
                  if (!response.ok) {
                    setMessage(response.error);
                    return;
                  }
                  setResult(null);
                  setMessage("Тест удалён.");
                  setTab("summary");
                  router.refresh();
                });
              }}
            >
              Очистить тест
            </Button>
          ) : null}
        </div>
      </section>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm transition-colors",
              tab === id ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        parsed ? (
          <div className="space-y-4">
            <article className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Главная идея</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{parsed.idea}</p>
            </article>
            {parsed.rules.length > 0 ? (
              <article className="rounded-2xl border bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Что применить</p>
                <ol className="mt-3 space-y-3">
                  {parsed.rules.map((rule, index) => (
                    <li key={`${index}-${rule}`} className="flex gap-3 text-sm leading-6">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ) : null}
          </div>
        ) : (
          <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            Нажмите «Собрать суть и тест» — здесь появится короткая выжимка, а не весь текст книги.
          </p>
        )
      ) : null}

      {tab === "chapters" ? (
        <div className="space-y-2">
          {chapters.map((chapter, index) => {
            const open = openChapter === chapter.id;
            return (
              <article key={chapter.id} className="rounded-2xl border bg-card">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
                  onClick={() => setOpenChapter(open ? null : chapter.id)}
                >
                  <span>
                    <span className="text-xs text-muted-foreground">Глава {index + 1}</span>
                    <span className="mt-1 block font-medium">{chapter.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{chapter.readTimeMinutes} мин</span>
                </button>
                {open ? (
                  <p className="border-t px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {chapter.contentSummary || chapter.content.slice(0, 500)}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {tab === "quiz" ? (
        !quizId || !currentQuestion ? (
          <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            Тест появится после разбора книги. Вопросы проверяют, можете ли вы применить идею, а не вспомнить дату.
          </p>
        ) : result ? (
          <div className="space-y-4">
            <article className="rounded-2xl border bg-card p-5">
              <p className="text-4xl font-semibold">{result.score}%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.correctAnswers} из {result.totalQuestions} · +{result.xpEarned} XP · серия {result.streakCount} дн.
              </p>
            </article>
            <div className="space-y-3">
              {questions.map((question, index) => {
                const picked = answers[index];
                const correct = result.explanations[index]?.correctAnswerIndex;
                const right = picked === correct;
                return (
                  <article key={question.id} className="rounded-2xl border bg-card p-4">
                    <p className="text-sm font-medium">{question.question}</p>
                    <p className={cn("mt-2 text-sm", right ? "text-primary" : "text-destructive")}>
                      {right ? "Верно" : `Нужный ответ: ${question.options[correct ?? 0]}`}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.explanations[index]?.explanation}</p>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const response = await submitBookQuiz(quizId, answers);
                if (!response.ok) {
                  setMessage(response.error);
                  return;
                }
                setResult(response);
              });
            }}
          >
            <p className="text-sm text-muted-foreground">
              Вопрос {questionIndex + 1} из {questions.length}
            </p>
            <article className="rounded-2xl border bg-card p-5">
              <h2 className="text-lg font-medium leading-snug">{currentQuestion.question}</h2>
              <div className="mt-4 grid gap-2">
                {currentQuestion.options.map((option, optionIndex) => {
                  const selected = answers[questionIndex] === optionIndex;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setAnswers((current) => {
                          const next = [...current];
                          next[questionIndex] = optionIndex;
                          return next;
                        });
                      }}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                        selected ? "border-primary bg-primary/10" : "hover:bg-accent",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </article>
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={questionIndex === 0}
                onClick={() => setQuestionIndex((index) => index - 1)}
              >
                Назад
              </Button>
              {questionIndex < questions.length - 1 ? (
                <Button
                  type="button"
                  disabled={answers[questionIndex] < 0}
                  onClick={() => setQuestionIndex((index) => index + 1)}
                >
                  Дальше
                </Button>
              ) : (
                <Button type="submit" disabled={pending || answers.some((answer) => answer < 0)}>
                  {pending ? "Считаю…" : "Завершить тест"}
                </Button>
              )}
            </div>
          </form>
        )
      ) : null}

      {tab === "cards" ? (
        !currentCard ? (
          <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            Карточки появятся вместе с правилами книги. Сначала показывается формулировка, ответ — по кнопке.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Карточка {cardIndex + 1} из {cards.length}
            </p>
            <article className="rounded-2xl border bg-card p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{revealed ? "Суть" : "Идея"}</p>
              <p className="mt-3 text-lg leading-7">{revealed ? currentCard.back : currentCard.front}</p>
            </article>
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={cardIndex === 0}
                onClick={() => {
                  setCardIndex((index) => index - 1);
                  setRevealed(false);
                }}
              >
                Предыдущая
              </Button>
              <Button type="button" variant="secondary" onClick={() => setRevealed((value) => !value)}>
                {revealed ? "Скрыть ответ" : "Показать ответ"}
              </Button>
              <Button
                type="button"
                disabled={cardIndex >= cards.length - 1}
                onClick={() => {
                  setCardIndex((index) => index + 1);
                  setRevealed(false);
                }}
              >
                Следующая
              </Button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
