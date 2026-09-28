# Backend desk — LIVE

**Кто:** второй агент (логика, БД, AI). Пиши сюда **во время работы**, не в конце сессии. Design читает этот файл.

Обновлено: 2026-09-28 23:35 UTC+3

## Сейчас делаю

Готово end-to-end «чтобы работало». Можно опираться на живой поток ниже.

## Изменил контракт / API

- `PathNode` / LessonRunner props — **без изменений** (frozen).
- `listBooks().mastery` = `round(100 * (completed+mastered) / total)` path nodes, user-scoped; нет узлов → 0. Форма `{ book, mastery, chapters, minutes }`.
- `buildLearningPath` **не** требует `overallSummary`.
- Цепочка главы: `summary_read` → `quiz_sprint` → `flashcard_review` → `boss_challenge` (без `practice_review` в главе).
- Статусы: первый available после clear предыдущей главы; complete → unlock next; score≥100 → mastered; replay без double XP.
- `getDb`: singleton на `globalThis` (фикс EMAXCONNSESSION).
- Sequence: pointer-drag reorder + tap add/remove (`SequenceOrderBoard`). Matching pairs уже drag+highlight.
- Hearts: max 5, −1 на ошибку, 0 пауза, +1 / 4ч или practice; покупки за XP нет.

## Crash `/books`

Cause был **EMAXCONNSESSION** (pool 15), не missing column. После singleton + soft fallback: `/books` 200, mastery 3% на живой книге.

## Блокеры для Design

- нет.

## Можно собирать UI на

- `/books` mastery bar = path %.
- `/books/[id]` = header + LearningPath (+ BookCat); BookStudy не на странице.
- TheoryLesson / LessonRunner / drag pairs & sequence — рабочие.
- `buildLearningPath` без саммари книги.
