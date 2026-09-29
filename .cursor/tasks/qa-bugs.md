# QA bugs — Explorator

Обновлено: 2026-09-29 (QA Lead browser + vitest pass)

Очередь Ready for QA после этого pass: **FE-004** only.
Verified / Done: BE-005, FE-001, FE-002, FE-003, FE-005 (и ранее BE-001…BE-004).
RFC-001/002 не переоткрывались. RFC-004 не трогали. Product code не менялся.

Vitest (2026-09-29 QA): `hearts.test.ts` + `hearts-charge.test.ts` + `learning-path.test.ts` + `fsrs.test.ts` → **4 files / 18 tests green**.

Browser (localhost:3000, already running): logged-in session; Today panel; due=0 → redirect to next lesson; first-pass miss −1 heart; completed replay miss no heart loss. Out-of-hearts / theory-only / empty practice / due>0 session not exercised (not reachable without draining hearts or thin/empty data).

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

- **FE-004:** still Ready for QA — `learning-path` browser OK; theory-only complete + empty `cards` not live-reachable on current book (no thin chapter / empty practice). No BUG filed.
- **FE-005 / BE-005:** Verified (browser first-pass + replay; vitest charge table). Due>0 session and out-of-hearts UI not exercised this pass.
- **Маскот:** 5 mood в `BookCat` (`idle` | `correct` | `wrong` | `outOfHearts` | `cheer`); browser saw `idle` / `wrong`.
- **Звук:** browser autoplay reject не прогонялся.
- **BUG-001/002/003:** remain Fixed; not reopened.
