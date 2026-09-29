# Backend desk — LIVE

**Кто:** второй агент (логика, БД, AI). Пиши сюда **во время работы**, не в конце сессии. Design читает этот файл.

Обновлено: 2026-09-29 ~22:15 UTC+3

## Иерархия

Цепочка: Developer → Marketer → Analyst → параллельно AI Prompt / **Backend** / DevOpsSec → Frontend/Design → QA.

- Scope только из карточек аналитика в `.cursor/tasks/backend-tasks.md` и открытых `[Backend]` багов в `.cursor/tasks/qa-bugs.md`. Столы Developer/Marketer напрямую не реализую.
- System prompts и Zod LLM не пишу сам — только шаблоны из `.cursor/tasks/ai-prompts.md`. Нет шаблона → останавливаю AI-путь и фиксирую пробел; не изобретаю.
- Миграции / RLS / новые env → DevOpsSec до прода. SQL могу оставить неприменённым («ждёт DevOpsSec»); на прод сам не применяю.
- UI (`src/components`, visual TSX, `globals.css`, маскот) не трогаю. Data wiring — только если требует BE-карточка.
- **Ready for QA** ставлю сам после проверки. **Verified / Done** — только QA.

## Цель

Доработка приложения. Активна. Слежу только за своими файлами:

- `docs/backend-desk.md`
- `.cursor/tasks/backend-tasks.md` (карточки ставит аналитик, я отмечаю `[x]`)
- `src/db/schema.ts`, `drizzle/`
- `src/lib/actions/hearts.ts`, `src/lib/hearts-store.ts`, `src/lib/hearts.ts`
- `src/lib/ai/book-processor.ts`, `src/lib/exercises.ts`
- `src/lib/learning-path-gate.ts`, `src/lib/learning-path-gate-store.ts`
- `src/app/actions/` (`lessons.ts`, `books.ts`, `book-study.ts`, `quiz.ts`, `auth.ts`, `notes.ts`, `gamification.ts`)
- `src/lib/data.ts`, `src/lib/parsers/`
- `src/lib/notes-docx.ts`, `src/app/api/notes/export/route.ts`

Чужие доски и `frontend-tasks` только читаю. `PathNode` и props `LessonRunner` не меняю без записи здесь.

## Аналитик → Backend

**BE-010** → **`[x] Ready for QA`**. **BE-009** / **BE-008** / **BE-006** / **BE-007** → Ready for QA (не переоткрывать). FE-012 ждёт этот контракт.

## Сейчас делаю

**2026-09-29 ~22:15 UTC+3:** Иерархия записана. Очередь пуста: открытых `[ ]` To Do в `backend-tasks.md` нет; открытых `[Backend]` багов в `qa-bugs.md` нет. Продуктовую работу не изобретаю. Цель «Доработка приложения» не закрываю. Verified не ставлю.

**2026-09-29 ~22:10 UTC+3 (BE-010):** theory moments + definitions → notes + sectioned `.docx` export. Live enum includes `definition`. Vitest `notes-docx` 8 passed. PathNode / LessonRunner / AI JSON без изменений. Verified не ставить.

**2026-09-29 ~21:50 UTC+3 (BE-009):** read-политика readers — stored nodes не прятать за `pending`.

**2026-09-29 ~21:25 UTC+3 (BUG-004/005):**
- Verified live `books.path_status`; migration file `drizzle/0001_book_path_status.sql` + journal entry.
- `listBooks` rethrows missing column/table (`src/lib/db-errors.ts`) instead of `[]` → libraryError path. Browser: book visible for danik2621@mail.ru.
- Short-trim progress-safe (`prunableExcessNodeIds`); vitest 22 passed on schema-error + chapter-path-size + learning-path + thin-chapter.

**2026-09-29 ~21:40 UTC+3.** RFC-004 / BE-008 Ready for QA (порог + progress-safe prune).

## Изменил контракт / API

### BE-010 · theory moments + definitions + .docx export — `[x] Ready for QA`

**PathNode / props `LessonRunner` — без изменений.** AI JSON / exerciseListSchema / `buildTheoryCards` (`string[]`) без изменений — FE шлёт уже разобранные `term`/`meaning`.

Schema (`notes` + migration `drizzle/0004_notes_theory_moments.sql`):
```ts
bookId: uuid | null      // FK books ON DELETE SET NULL; required on theory/definition save
nodeId: uuid | null      // FK lesson_nodes ON DELETE SET NULL
sourceKind: "theory_moment" | "definition" | "freeform"  // default freeform
term: text | null        // only for definition (≤80); null for theory/freeform
cardIndex: int | null    // idempotent save hint
reviewedAt: timestamptz | null  // updateNote form field reviewed=1
```

Actions / readers:
```ts
saveTheoryMoment({ bookId, nodeId, cardText, cardIndex? })
→ { ok: true; noteId } | { ok: false; error }
// owns book; node must be summary_read; content = card text; term = null

saveDefinition({ bookId, nodeId, term, meaning, cardIndex? })
→ { ok: true; noteId } | { ok: false; error }
// sourceKind=definition; term trimmed ≤80; content = meaning; title = term

listNotes({ bookId? }) → NoteListItem[]  // + bookTitle, term, sourceKind; scoped userId

GET /api/notes/export?bookId=
// with bookId → own theory_moment + definition for that book (empty docx if not owned)
// without → all own notes (theory + definition + freeform)
// .docx sections: «Теоретические моменты» | «Определения» | «Заметки»
// empty set → empty .docx (not 500); never foreign rows
```

Freeform `createNote` / `updateNote` / `deleteNote` сохранены (`sourceKind: freeform` на create).

### BE-009 · readers: узлы в БД → UI; library ≡ book page — `[x] Ready for QA`

**PathNode / props `LessonRunner` — без изменений.** RFC-004 / FE-008 не трогал.

Read-политика (замена BE-007 «empty unless approved»):
```ts
// empty playable только: нет lesson_nodes ИЛИ path_status === "rejected"
getLearningPath(bookId)
→ PathNodeRow[]  // rejected → []; иначе SELECT узлов + progress (в т.ч. pending)

getBookPathAvailability(bookId)
→ { status, nodes }
// rejected → { rejected, [] }
// pending|approved + nodes.length > 0 → { approved, nodes }  // effective; DB path_status не пишем
// нет узлов → { dbStatus, [] }

effectivePathAvailability(dbStatus, nodes) // pure helper в learning-path-gate.ts

listBooks()
// mastery по тому же playable-набору: rejected → total/done/mastery = 0

getLessonContent(nodeId)
// «Тропа ещё не готова» только при rejected (или нет книги); pending + node — OK
```

Write-once / gate persist / RFC-004 без изменений.

### RFC-004 · длина главы → 1 / 2 / 4 узла — `[x] Ready for QA`

**PathNode / props `LessonRunner` — без изменений.**

**Порог (Developer desk, зафиксирован):** `book_chapters.read_time_minutes <= 2` → short (`summary_read` + `quiz_sprint`); `> 2` → long (четыре узла в прежнем порядке). Thin (`isThinChapter`) побеждает → 1× theory.

Helper: `classifyChapterPathSize` / `chapterPathNodeCount` в `src/lib/ai/chapter-path-size.ts`. Оценка минут при отсутствии `read_time_minutes`: ~слова/180, min 1.

`generateLearningPathOnFly`: blueprints по size; AI schema length 2|4; insert `onConflictDoNothing`.

**Повторная сборка:** лишние pairs/boss (и practice при thin) **без** прогресса снимаются; узлы с `available` / `completed` / `mastered` (или `completedAt`) **не** удаляются.

### BE-006 + BE-007 · persist тропы + control gate — `[x] Ready for QA`

**PathNode / props `LessonRunner` — без изменений.**

Schema (`books.path_status`):
```ts
pathStatus: "pending" | "approved" | "rejected"  // default pending
// drizzle: books.pathStatus → path_status
// migration: drizzle/0001_book_path_status.sql
```

Readers: см. **BE-009** выше (больше не «nodes only if approved»).

Write-once:
```ts
buildLearningPath(bookId) // → ensureFullLearningPath
// approved → no-op { ok: true, noop: true, status: "approved" }
// иначе: clear nodes → generate nodes+theory → persist practice (AI+grounding) → gate
// gate ok → path_status=approved
// gate fail → path_status=rejected, { ok: true, status: "rejected", reasons }
// generation fail → path_status=pending, { ok: false, error } — не 500 на book page
```

Gate (BE-007, no AI):
```ts
validateLearningPathGate(bookId)
→ { ok: true } | { ok: false; reasons: string[] }
// pure: evaluateLearningPathGate(chapters) in learning-path-gate.ts
// checks: theory→practice order; thin=theory-only; grounded exercises vs sibling theory;
//         substantive essence description >= 40 chars; hearts out of generation
```

Isolation: `getCurrentUserId()` + `books.userId` / `quiz_cards.userId` / progress `userId`. SQL RLS не добавлял.

`exerciseListSchema` без изменений.

### Ранее

- BE-001…BE-005 — Ready for QA / Verified (см. backend-tasks).

## Проверено

**2026-09-29 ~21:50 (BE-009):**
- `vitest` `src/lib/effective-path-availability.test.ts` — pending+nodes → approved; rejected → empty
- PathNode frozen; RFC-004 не откатывал

**2026-09-29 ~21:45 (follow-up):** live DB — applied `drizzle/0001_book_path_status.sql` (enum + `books.path_status`); was missing; SELECT ok (`pending`). **BUG-004:** missing column applied → Ready for QA (Verified только QA).

**2026-09-29 ~21:40 (RFC-004):**

- Vitest `src/lib/ai/chapter-path-size.test.ts` — thin/short/long + progress-safe prune
- PathNode frozen; schema колонок для RFC-004 не добавлял

**2026-09-29 ~21:15 (BE-006/007):**

- `npx tsc --noEmit` — clean
- `vitest` `src/lib/learning-path-gate.test.ts` — 8 passed
- Book page: `getBookPathAvailability` (no `ensureFullLearningPath` on SSR)
- Dev-сервер не останавливал

## Блокеры для Design / FE-006

- Применить миграцию `path_status` на БД (`drizzle/0001_book_path_status.sql` или `npm run db:push`), иначе select упадёт / fallback pending.
- **BE-009:** `nodes.length > 0` ⇒ карта готова (`status` effective `approved`); empty + pending/rejected ⇒ not-ready. Library mastery согласован с playable.

## Можно собирать UI на

- `getBookPathAvailability(bookId)` → `{ status, nodes }` (pending+stored nodes → approved+nodes)
- `buildLearningPath(bookId)` — явная сборка; approved = no-op
- `generateLessonContentOnFly` / `getLessonContent` — read-only; блок только при rejected
- `applyLessonMiss` / `getTodayPanel` / `recordLessonAnswer` (как раньше)

## DevOps (не Backend-карточка)

**2026-09-29 ~22:45 UTC+3.** Лимит до модели на `buildLearningPath`, `generateBookMaterials`, `generateQuestionsForNote` и `POST /api/quiz/generate`.

**2026-09-29 ~22:55 UTC+3.** На живой базе включён RLS (15 таблиц, политика владельца, без demo-user).

**2026-09-29 ~23:20 UTC+3.** `getDb()` на каждый запрос переключается в `authenticated` и подставляет id сессии. Тропа и жизни на экране остались. `drizzle-kit push` не запускать.
