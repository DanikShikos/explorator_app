# QA bugs — Explorator

Обновлено: 2026-09-29 (fix pass after re-read)

Очередь: карточки со статусом **Ready for QA** в `backend-tasks.md` / `frontend-tasks.md`
(`BE-001`…`BE-005`, `FE-001`…`FE-005`). Verified / Done — только после приёмки QA.
RFC-001/002 не переоткрывались.

Vitest (2026-09-29 fix pass): `hearts.test.ts` + `hearts-charge.test.ts` + `learning-path.test.ts` + `fsrs.test.ts` → **4 files / 18 tests green**. Charge predicate: `shouldChargeHeartOnMiss` in `src/lib/hearts.ts` (used by `decrementHeartForMiss`).

**Backend notice (2026-09-29 ~21:00):** BE-005 → Ready for QA. `applyLessonMiss` / `decrementHeartForMiss` + LessonRunner miss path (charged from server).

**Fix pass (2026-09-29):** Re-read confirmed BUG-001/002/003 already closed in UI/actions; shared charge helper + tests tightened; desks/cards updated.

---

## Подтверждённые дефекты

### **[BUG-001] LessonRunner miss path broken: `heartsCharged` undefined + `decrementHeart` not imported**

- **Статус:** **Fixed** (2026-09-29) — re-read confirmed prior Backend/FE fix; no rewrite needed.
- **Назначен на:** Frontend (стык с BE-005)
- **Шаги для воспроизведения:**
  1. Открыть practice-узел с `nodeId` (спринт/пары/босс), сердца ≥ 1.
  2. Дать неверный ответ и нажать проверку.
- **Ожидаемое поведение:** `recordLessonAnswer(false)` + при первом проходе списание сердца через `decrementHeartOnLessonMiss` (`charged: true`); при replay completed/mastered — Again без списания.
- **Фактическое поведение (было):** `LessonRunner` ссылался на необъявленный `heartsCharged`; вызывался несуществующий `decrementHeart`.
- **Исправление:** `LessonRunner` → `applyLessonMiss(cardId)`; crack / heart UI / `outOfHearts` только при `charged === true`; due (`!nodeId`) → только `recordLessonAnswer(false)`. Страница урока не передаёт `heartsCharged`. Файлы: `src/components/lesson/LessonRunner.tsx`, `src/app/actions/lessons.ts`, `src/lib/hearts-store.ts`, `src/lib/hearts.ts`, `src/app/books/[id]/lesson/[nodeId]/page.tsx`.
- **Затронутые файлы:** `src/components/lesson/LessonRunner.tsx`, `src/app/books/[id]/lesson/[nodeId]/page.tsx`, `src/lib/actions/hearts.ts`, `src/lib/hearts-store.ts`

### **[BUG-002] FE Ready-for-QA cards missing required `data-testid` from Acceptance Criteria**

- **Статус:** **Fixed** (2026-09-29) — DoD testids present; verified by grep/read.
- **Назначен на:** Frontend
- **Шаги для воспроизведения:**
  1. Сверить DoD FE-001 / FE-002 / FE-003 (`today-panel`, `today-continue-cta`, `today-due-count`, `book-cat`, `today-session`, `today-session-banner`, `lesson-runner`, `lesson-answer-correct`, `lesson-answer-wrong`, `lesson-miss-feedback`).
  2. Поиск `data-testid` в `TodayPanel`, `/today/session`, `LessonRunner`, `BookCat`.
- **Ожидаемое поведение:** стабильные testid из карточек на месте.
- **Фактическое поведение (было):** недостающие / неверные testid.
- **Исправление:** на месте: `today-panel`, `today-continue-cta`, `today-due-count`, `book-cat`, `today-session`, `today-session-banner`, `lesson-runner`, `lesson-answer-correct`, `lesson-answer-wrong`, `lesson-miss-feedback` (+ FE-005: `lesson-hearts`, `lesson-hearts-count`, `lesson-out-of-hearts`). Файлы: `TodayPanel.tsx`, `today/session/page.tsx`, `LessonRunner.tsx`, `BookCat.tsx`.
- **Затронутые файлы:** `src/components/today/TodayPanel.tsx`, `src/app/today/session/page.tsx`, `src/components/lesson/LessonRunner.tsx`, `src/components/mascot/BookCat.tsx`, `src/app/page.tsx`

### **[BUG-003] BookCat test id is `mascot`, DoD asks for `book-cat`**

- **Статус:** **Fixed** (2026-09-29) — `BookCat` root is `data-testid="book-cat"` (+ `data-mood`).
- **Назначен на:** Frontend
- **Шаги для воспроизведения:** открыть любой экран с `BookCat`; найти `data-testid`.
- **Ожидаемое поведение:** `data-testid="book-cat"` (FE-001/003 DoD).
- **Фактическое поведение (было):** `data-testid="mascot"`.
- **Исправление:** `src/components/mascot/BookCat.tsx` → `book-cat`.
- **Затронутые файлы:** `src/components/mascot/BookCat.tsx`

---

## Наблюдения (не баги Ready-for-QA / вне очереди)

- **FE-004 / FE-005 / BE-005:** Ready for QA (не Verified). FE-004 testids (`theory-complete-message`, `practice-empty-notice`, `learning-path`, `path-notice`) на месте.
- **Маскот:** реальный набор — 5 mood в `BookCat` (`idle` | `correct` | `wrong` | `outOfHearts` | `cheer`).
- **Звук:** `src/lib/sounds.ts` — browser autoplay reject не прогонялся в этом pass.
- **Grounding unit tests:** `src/lib/ai/grounding.ts` — экспорт зеркала private `filterGroundedExercises` из book-processor.
