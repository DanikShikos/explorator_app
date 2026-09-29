# Backend desk — LIVE

**Кто:** второй агент (логика, БД, AI). Пиши сюда **во время работы**, не в конце сессии. Design читает этот файл.

Обновлено: 2026-09-29 (fix pass)

## Цель

Доработка приложения. Активна. Слежу только за своими файлами:

- `docs/backend-desk.md`
- `.cursor/tasks/backend-tasks.md` (карточки ставит аналитик, я отмечаю `[x]`)
- `src/db/schema.ts`, `drizzle/`
- `src/lib/actions/hearts.ts`, `src/lib/hearts-store.ts`, `src/lib/hearts.ts`
- `src/lib/ai/book-processor.ts`, `src/lib/exercises.ts`
- `src/app/actions/` (`lessons.ts`, `books.ts`, `book-study.ts`, `quiz.ts`, `auth.ts`, `notes.ts`, `gamification.ts`)
- `src/lib/data.ts`, `src/lib/parsers/`

Чужие доски и `frontend-tasks` только читаю. `PathNode` и props `LessonRunner` не меняю без записи здесь.

## Аналитик → Backend

**BE-005** (RFC-003) → **`[x] Ready for QA`**. Очередь открытых пуста. RFC-004 вне очереди.

## Сейчас делаю

**2026-09-29 ~21:05 UTC+3.** Re-read: no open Backend bugs or To Do cards.

## Изменил контракт / API

### BE-005 / RFC-003 · сердца только на первом проходе — `[x] Ready for QA`

**PathNode / props `LessonRunner` — без изменений.**

```ts
// hearts-store / actions/hearts
decrementHeartForMiss(cardId) // alias: decrementHeartOnLessonMiss
→ ({ ok: true; charged: boolean } & HeartStatus) | { ok: false; error }

// lessons.ts
applyLessonMiss(cardId) // recordLessonAnswer(Again) + decrementHeartForMiss
```

Правило `charged`:
1. Нет карточки / чужой → `{ ok: false }`, сердца не трогаем.
2. Нет `nodeId` → `charged: false` (due).
3. Progress `completed` | `mastered` → `charged: false`.
4. Иначе (первый проход) → `decrementHeart`, `charged: true`.

Чистая функция решения: `shouldChargeHeartOnMiss(nodeId, progressStatus)` в `src/lib/hearts.ts` — её зовёт `decrementHeartForMiss`.

**LessonRunner:** miss с `nodeId` → `applyLessonMiss`; анимация / OutOfHearts только если `charged`. Due (`!nodeId`) — только `recordLessonAnswer`, без hearts action.

**Страница урока:** `nodeStatus` из `generateLessonContentOnFly`; OutOfHearts gate только если не completed/mastered.

Theory / practice — без регрессии.

**2026-09-29 fix pass:** BE-005 DoD confirmed; predicate extracted + vitest charge table; PathNode/props still frozen.

### Ранее

- BE-001…BE-004 — Ready for QA (см. backend-tasks).

## Проверено

**2026-09-29 fix pass:**

- BUG-001 closed via `applyLessonMiss` + `shouldChargeHeartOnMiss`; no open Backend bugs.
- BE-005 remains Ready for QA (not Verified).
- Vitest: `hearts` / `hearts-charge` / `learning-path` / `fsrs` — 4 files, 18 passed.
- Dev-сервер не оставляю.

## Блокеры для Design / FE-005

- Props `LessonRunner` frozen. Смотрите `charged` из `applyLessonMiss` / `decrementHeartForMiss` (уже в LessonRunner).

## Можно собирать UI на

- `applyLessonMiss(cardId)` / `decrementHeartForMiss(cardId)` → `charged`
- `getTodayPanel()` / `listBookDueCards()` / `recordLessonAnswer`
