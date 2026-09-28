# Design desk — LIVE

**Кто:** агент Design (этот чат). Пиши сюда статус; Backend читает **на каждом шаге**, не только в начале.

Обновлено: 2026-09-28 ~23:32 UTC+3

## Сейчас от Design

Re-check: `backend-desk` (23:35) **не дал нового UI-контракта** после прошлого Design pass. PathNode / LessonRunner props frozen. Экраны не рестайлил. Цель Cursor **не закрываю**.

Уже в UI:
- токены `--path` / `--reward` (не emerald/amber в новых экранах книги/урока)
- progress hero из `summarizePath(nodes)`
- `completed` = Star, `mastered` = Crown
- библиотека: бейджи Новая / Разобрана / На тропе; бар = `mastery` из `listBooks` той же формы `{ book, mastery, chapters, minutes }`
- empty/error/not-found через `PathNotice` + BookCat; ошибки — `tone="alert"` + retry (`PathRetryButton` / reset)
- locked: узел можно выбрать, CTA нет; в sticky-панели «Сначала: {next}» (под узлами не дублирую — на 32 шагах это шум)
- sticky-панель узла **на всех ширинах** + safe-area; панель непрозрачная (`bg-card`); под тропой запас `16rem`, чтобы последний узел не прятался под панелью
- «Собрать тропу» не ждёт `overallSummary`; сбой сборки — alert-тон PathNotice
- невалидный id книги/урока → not-found, не 500 от UUID
- 0 жизней на упражнении: текст про практику / 4ч / без покупки за очки + ссылка на `/practice?return=…`
- `TheoryLesson` и `LessonRunner` (mode=lesson): крошка «К тропе» — можно уйти с повтора теории без «Понятно»
- **шапка:** если `path.length > 0` и не все главы на тропе → `{N} из {M} глав на тропе · тропа P%`; если все главы покрыты → короткий `{M} глав · тропа P%` (сверка с `page.tsx` — ок)

## Контракт (заморожен)

`PathNode` — без изменений.  
`status`: `locked` | `available` | `completed` | `mastered`  
`nodeType` лейблы: Теория / Спринт / Пары / Босс / Практика  
Старт упражнений: `hearts >= 1`. Теория (`summary_read`) — без жизней.

Цвета тропы: `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.

## QA браузер (пред. сессия) — `/books` 200

Книга «PDF, 209 стр.», 26 глав, бейдж **На тропе**, бар **3%**. Шапка: `8 из 26 глав на тропе · тропа 3%`; progress hero: `1 из 32 шагов · следующий: Спринт`.

## Backend уже заявил (desk 23:35) — Design на это опирается

- `PathNode` / props `LessonRunner` frozen
- `listBooks` shape тот же; `mastery` = % узлов тропы (`completed+mastered / total`, нет узлов → 0)
- `buildLearningPath` не требует `overallSummary` (только главы)
- цепочка главы: `summary_read` → `quiz_sprint` → `flashcard_review` → `boss_challenge`
- complete → unlock next; score≥100 → mastered; replay без double XP
- сердца: max 5, −1 ошибка, 0 = пауза, +1 / 4ч или practice; без покупки за XP
- `/books` 200 после singleton pool

Пиши ход **в `docs/backend-desk.md`**, не только в чат.

## Нужно от Backend (не Design) — блокеры продукта

1. **sprint complete unlocks next node; miss costs 1 heart.** Design не закрывает цель без e2e. Не чиню `completeLessonNode`.
2. **real book title/author** (не «PDF, 209 стр.» / пустой автор) — парсер/метаданные, не UI.
3. **all chapters on the path** OR an explicit **8-chapter cap** written in `backend-desk`. Design только показывает «N из M глав на тропе», узлы не выдумывает.
4. **`listBooks` stays 200.** UI ловит throw, не пустой список; 500 → ваш слой (`data.ts` / пул / RLS).

## Очередь Design (только UX)

- Не трогать data/schema/actions/AI/hearts-store.
- Цель Cursor не закрываю, пока Backend не даст upload→path→theory→exercise→unlock.
