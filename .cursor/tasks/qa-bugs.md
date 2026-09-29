# QA bugs — Explorator

Обновлено: 2026-09-29 (Backend BUG-L01–L03 fix)

## QA log · BUG-L01 / L02 / L03 (2026-09-29)

**Verdict → Fixed:** BUG-L01, BUG-L02, BUG-L03 (Backend). Overall LLM QA goal not marked complete.

**Fixes:**
- **BUG-L01:** `quizQuestionSchema` requires MC `answer ∈ options`; invalidate/drop on sanitize.
- **BUG-L02:** quiz generate + `generateQuestionsForNote` clip/reject at `AI_PROMPT_CLIP.bookSummaryChapter` (3500) via `clipAiPromptText`.
- **BUG-L03:** `sanitizeGeneratedQuiz` returns `null` (no throw); note action try/catch + null guard.

**Vitest:** quiz-schema + exercises + book-processor-llm-edge + grounding + quiz/generate/route → **5 files / 29 passed**.

**Files:** `src/lib/quiz-schema.ts`, `src/lib/quiz-schema.test.ts`, `src/app/api/quiz/generate/route.ts`, `src/app/api/quiz/generate/route.test.ts`, `src/app/actions/quiz.ts`.

---

## QA log · BE-010 (2026-09-29)

**Verdict → Verified / Done:** BE-010.

**DoD:** theory_moment / definition save; `listNotes` user-scoped + `term`/`sourceKind`; sectioned `.docx` export; empty → not 500; freeform create/update intact; PathNode / AI JSON frozen.

**Export auth (re-check after post-sec edit of `notes/export/route.ts`):** still fail-closed — `getCurrentUserId` + catch → **401**; both bookId and all-notes paths filter `eq(notes.userId, userId)`; foreign book → empty docx (no other users' notes). Owner-scoped: **yes**.

**Vitest:** `notes-docx` + `tenant-isolation` → **2 files / 20 passed** (added freeform section assert + stronger export auth source contract).

**New bugs:** none. BUG-001–005 stay Fixed. FE-012 left To Do. Product code not changed (tests only).

---

## QA log · FE-010 (2026-09-29)

**Verdict → Verified / Done:** FE-010.

**Vitest:** `path-personal-card` + `learning-path` + `learning-path-gate` → **3 files / 17 passed**.

**Browser (localhost:3000, danik2621@mail.ru):**
- `/books/7a317ea5-…` → `path-personal-card` in same grid as `learning-path` (right column desktop).
- Card exact strings: **«1 дн.»** · **«серия»** · **«XP сегодня»** · **«0 / 50»** · **«Серия жива — один спокойный шаг.»**
- testids: `path-personal-card`, `path-personal-streak`, `book-cat` (in card).
- No league / ranking / place / share / shop UI on book page. Tokens path/path-soft/path-ink (no hardcoded colors on card).

**New bugs:** none. BUG-001–005 stay Fixed. Product code not changed. FE-011 left To Do.

---

## QA log · BE-009 + FE-009 (2026-09-29)

**Verdicts → Verified / Done:** BE-009, FE-009.

**Vitest:** `effective-path-availability` + `data-schema-error` + `learning-path-gate` → **3 files / 16 passed**.

**Browser (localhost:3000, danik2621@mail.ru):**
- `/books` → badge **«На тропе»**; meta **«26 глав · 2%»**; «1 в библиотеке».
- `/books/7a317ea5-…` → header **«26 глав · тропа 2%»**; progress **«2 из 104 шагов · следующий: Закрепление»**; `learning-path` + `path-gate-ready`; **104** node buttons; `path-unit-banner`×26; no «тропа не готова»; no «Собрать тропу» / `build-path-button`.
- Library mastery 2% ≡ book 2/104 steps (same counts). Prior defect (library on-path + book empty/not-ready) closed.

**New bugs:** none. BUG-001–005 stay Fixed. Product code not changed. RFC-003/RFC-004 cards not reopened.

---

## QA log · BE-006/007/008 + FE-006/007/008 (2026-09-29)

**Verdicts → Verified / Done:** BE-006, BE-007, BE-008, FE-006, FE-007, FE-008.

**Vitest:** `data-schema-error` + `chapter-path-size` + `learning-path` + `thin-chapter` + `learning-path-gate` → **5 files / 30 passed**.

**Browser (localhost:3000, danik2621@mail.ru):**
- `/books` → **«1 в библиотеке»**, книга Туккеля видна (не false-empty). BUG-004 stays Fixed.
- `/books/7a317ea5-…` → `path_status=approved`; `learning-path` + `path-gate-ready`; **104** node buttons; progress **«2 из 104 шагов»**; labels Теория/Спринт/Пары/Босс; `path-unit-banner`×26; BookCat on `path-current-node`.
- Chapters all **10–14 min** → long/4 only; short (2-node) UI not expected — covered by unit tests. BUG-005 stays Fixed (progress-safe prune).

**New bugs:** none. Product code not changed.

---

## QA log · RFC-004 earlier pass (2026-09-29)

Superseded by pass above. Prior notes: BUG-004/005 filed then Fixed; cards were To Do at that time.

---

## Подтверждённые дефекты

### **[BUG-L01] Quiz schema accepts multiple_choice answer not in options**

- **Статус:** **Fixed** (2026-09-29) — `superRefine` requires `answer ∈ options`; sanitize drops invalid items. Files: `src/lib/quiz-schema.ts`, `src/lib/quiz-schema.test.ts`.
- **Назначен на:** Backend

### **[BUG-L02] Quiz generate request sends unbounded note content to the LLM**

- **Статус:** **Fixed** (2026-09-29) — request max + `clipAiPromptText(..., bookSummaryChapter)` in route and `generateQuestionsForNote`. Files: `src/app/api/quiz/generate/route.ts`, `src/app/actions/quiz.ts`, `src/app/api/quiz/generate/route.test.ts`.
- **Назначен на:** Backend

### **[BUG-L03] sanitizeGeneratedQuiz throws when null-byte-only text collapses to empty**

- **Статус:** **Fixed** (2026-09-29) — sanitize returns `null` via `safeParse`; note action try/catch + null guard. Files: `src/lib/quiz-schema.ts`, `src/app/actions/quiz.ts`, `src/app/api/quiz/generate/route.ts`.
- **Назначен на:** Backend

### **[BUG-004] `/books` показывает пустую библиотеку при живой книге — schema `path_status` нет в БД, ошибка глотается как `[]`**

- **Статус:** **Fixed** (2026-09-29) — column present; `listBooks` rethrows missing-object via `db-errors.ts`; browser `/books` shows 1 book for danik2621@mail.ru.
- **Назначен на:** Backend (стык BE-006 schema / `listBooks`)
- **Шаги для воспроизведения:**
  1. Войти как `danik2621@mail.ru` (сессия на localhost:3000).
  2. Открыть `http://localhost:3000/books`.
  3. Сверить UI с БД: в `books` есть строка `7a317ea5-…` (тот же `user_id`), 26 `book_chapters`, 104 `lesson_nodes`.
- **Ожидаемое поведение:** в библиотеке видна книга; при сбое схемы — баннер «Не получилось загрузить книги» (`libraryError`), не тихая «Полка пустая».
- **Фактическое поведение (было):** UI «0 в библиотеке» / «Полка пустая» / mood idle. Пользователь **залогинен**. В Drizzle-схеме есть `books.path_status` (+ enum `book_path_status`), в live Postgres колонки **нет**; миграции в `drizzle/` нет. `listBooks()` делает `select()` по всей таблице → Postgres: column does not exist → catch с `text.includes("does not exist")` возвращает `[]` (страница думает, что полка пустая, не error-path).
- **Исправление:** `drizzle/0001_book_path_status.sql` (+ journal); live column verified; `listBooks` no longer returns `[]` on missing relation/column. Files: `drizzle/0001_book_path_status.sql`, `src/lib/db-errors.ts`, `src/lib/data.ts`, `src/lib/data-schema-error.test.ts`.
- **Затронутые файлы:** `src/db/schema.ts` (`pathStatus`), `src/lib/data.ts`, `src/lib/db-errors.ts`, `drizzle/0001_book_path_status.sql`.

### **[BUG-005] RFC-004 short-trim удаляет pairs/boss без проверки user progress**

- **Статус:** **Fixed** (2026-09-29) — `prunableExcessNodeIds` keeps available/completed/mastered; vitest BUG-005 case green; `onConflictDoNothing` stays.
- **Назначен на:** Backend (`BE-008`)
- **Шаги для воспроизведения:**
  1. Глава substantive short (`read_time_minutes` ≤ 2), в БД уже 4 узла (`summary_read`…`boss_challenge`), у пользователя есть progress на pairs и/или boss (`completed`/`mastered`/`available`).
  2. Вызвать `generateLearningPathOnFly(chapterId)` при `existing.length > expectedCount` (ветка trim, без предварительного `clearBookLessonNodes`).
- **Ожидаемое поведение (Developer desk RFC-004):** лишние пары/босс **без** progress снять можно; узлы, по которым уже есть progress, **не** удалять; дублей не создавать.
- **Фактическое поведение (было):** `delete … where order_index >= expectedCount` без join/фильтра по `user_node_progress` → cascade снимает progress и quiz_cards на этих узлах.
- **Исправление:** `generateLearningPathOnFly` → `prunableExcessNodeIds` / `nodeHasLearningProgress`. Files: `src/lib/ai/book-processor.ts`, `src/lib/ai/chapter-path-size.ts`, `src/lib/ai/chapter-path-size.test.ts`.
- **Затронутые файлы:** `src/lib/ai/book-processor.ts`, `src/lib/ai/chapter-path-size.ts`, `src/lib/ai/chapter-path-size.test.ts`.

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

- **RFC-004:** code+vitest покрывают thin/short/long counts; browser path не проверен из‑за BUG-004. Единственная книга в БД — все главы long (10–14 мин) → UI short (2 узла) на ней всё равно не увидеть без другой книги.
- **FE-004:** Verified (2026-09-29) via vitest + code; browser theory-only not reachable (no thin/empty in DB). No BUG filed.
- **FE-005 / BE-005:** Verified (browser first-pass + replay; vitest charge table). Due>0 session and out-of-hearts UI not exercised this pass.
- **Маскот:** 5 mood в `BookCat` (`idle` | `correct` | `wrong` | `outOfHearts` | `cheer`); browser saw `idle` / `wrong`.
- **Звук:** browser autoplay reject не прогонялся.
- **BUG-001/002/003:** remain Fixed; not reopened.
