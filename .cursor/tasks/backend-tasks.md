# Backend tasks

**Кто пишет:** аналитик. **Кто делает:** Backend. Файл не переписывать целиком — отмечать статусы на карточке и дописывать заметку под задачей.

Обновлено: 2026-09-29 21:05 UTC+3

**Статусы карточки (три состояния):**
- `[ ]` **To Do** — ещё не сделано / в работе у Backend.
- `[x]` **Ready for QA** — выставляет **Backend** после своей проверки DoD (не аналитик «на глаз»).
- `[x]` **Verified / Done** — выставляет **только QA**. Аналитик это поле не трогает.

Чекбокс в заголовке `### [ ]` / `### [x]` = текущая стадия (To Do vs Ready for QA и далее). Под заголовком всегда три строки статусов. `Verified / Done` не отмечать без QA.

Цель: **BE-006** + **BE-007** (persist тропы + control gate) → To Do. **BE-005** (RFC-003) → Ready for QA. BE-003/BE-004 compose, не дублировать. RFC-004 в backlog, не карточить. RFC-001/002 не переоткрывать.

Правило карточки: критичность `P0` / `P1` / `P2`, ссылки на файлы. В каждой задаче: schema, сигнатура action/route, JSON для AI, RLS, ошибки, **Acceptance Criteria (DoD)** чекбоксами.

## Открытые

### [ ] BE-006 · P0 · Persist тропы + read-only open (без AI на чтении)

- [ ] To Do
- [ ] Ready for QA
- [ ] Verified / Done
- [ ] **Критичность:** P0 (customer 2026-09-29 ~21:04)
- **Зачем:** тропа не должна собираться заново при каждом заходе на книгу. Один раз (обработка книги или явный «Собрать тропу») пишет в БД `lesson_nodes` **и** payload урока (теория + упражнения); `/books/[id]` и урок только читают. Один и тот же user+book → идентичные узлы и идентичный theory/exercise текст на втором визите.
- **Сейчас (баг):** `src/app/books/[id]/page.tsx` зовёт `ensureFullLearningPath` на каждый SSR; `generateLessonContentOnFly` при пустых `quiz_cards` снова зовёт AI — контент может отличаться.
- **Compose (не дублировать):** BE-003 (grounding / `filterGroundedExercises` / `cards: []`) и BE-004 (`isThinChapter` → один `summary_read`) остаются правилами **генерации**; эта карточка переносит их вызов с read-path на write-once.
- **Schema:**
  - Пишем в существующие: `lesson_nodes` (теория в `description` у `summary_read`), `quiz_cards` (`nodeId`, `userId`, `contentData` / exercise), `user_node_progress`.
  - Для гейта доступности (см. BE-007): колонка на `books` — `path_status` enum/text `pending` | `approved` | `rejected` (drizzle: `books.pathStatus` → `path_status`, default `pending`). **Не** новое поле `PathNode`. Статус гейта — отдельный объект/поле книги (или тонкий DTO рядом с `getLearningPath`), не shape узла.
  - Альтернатива допустима: отдельная строка path-meta на книгу, если Backend аргументирует в desk — но PathNode frozen.
- **Actions / функции (реальные имена):**
  1. **Убрать AI/сборку с read-path:** `BookPage` **не** вызывает `ensureFullLearningPath`. Читать через `getLearningPath(bookId)` (+ `path_status` / availability).
  2. **Write-once сборка:** переработать `ensureFullLearningPath` / `generateLearningPathOnFly` / `buildLearningPath(bookId)` так, чтобы один явный запуск (обработка книги **или** `buildLearningPath` с кнопки) создавал узлы **и** сразу персистил упражнения практики (`storeExercises` / тот же pipeline что сейчас в `generateLessonContentOnFly` после AI+grounding) для practice-узлов главы. Повторный вызов при `path_status === 'approved'` — **no-op** (не переписывать nodes/cards).
  3. **Read-only урок:** `generateLessonContentOnFly(nodeId)` → только SELECT `lesson_nodes` + `quiz_cards` (+ progress). **Ноль** `generateObjectWithCredits` / AI на этом пути. Переименовать в desk-контракте допустимо (`getLessonContent` / alias), сигнатуру для страницы сохранить или тонкий wrapper.
  4. Новый/явный reader статуса: например `getBookPathAvailability(bookId)` → `{ status: 'pending'|'approved'|'rejected'; nodes?: PathNode[] }` — зафиксировать в `docs/backend-desk.md`.
- **AI JSON:** генерация на write-once по-прежнему `pathNodeSchema` + `exerciseListSchema`. **exerciseListSchema без изменений.**
- **RLS:** `getCurrentUserId()` + фильтр `books.userId` / `quiz_cards.userId` / progress `userId`. Чужой `bookId`/`nodeId` — отказ.
- **Ошибки:** сбой генерации **не** 500 на странице книги; `path_status` остаётся `pending`/`rejected`; UI видит «тропа не готова», **не** случайный partial path из половины глав.
- **Вне объёма:** сердца (BE-005), RFC-004 длина главы, смена формы `PathNode` / props `LessonRunner`, дубль логики BE-003/004 (только вызов на write).
- **Файлы:** `src/app/books/[id]/page.tsx`, `src/app/books/[id]/lesson/[nodeId]/page.tsx`, `src/lib/ai/book-processor.ts`, `src/app/actions/lessons.ts` (`buildLearningPath`), `src/lib/data.ts` (`getLearningPath`), `src/db/schema.ts`; контракт → `docs/backend-desk.md`.
- **Acceptance Criteria (DoD):**
  - [ ] Открытие `/books/[id]` и урока **не** вызывает AI; только чтение `lesson_nodes` / `quiz_cards` / progress / `path_status`.
  - [ ] Write-once (process или `buildLearningPath`) пишет узлы + theory `description` + practice rows в `quiz_cards`; второй визит того же user+book → идентичные nodes и идентичный theory/exercise текст.
  - [ ] Повтор `buildLearningPath` при approved — не перегенерирует контент.
  - [ ] Failed generation → не 500 book page; не отдаёт partial playable path; статус not-ready.
  - [ ] `exerciseListSchema` без изменений; PathNode frozen; `getCurrentUserId`+`userId`.
  - [ ] Reader/`path_status` записаны в `docs/backend-desk.md`.

### [ ] BE-007 · P0 · Control gate: условия обучения + суть книги до availability

- [ ] To Do
- [ ] Ready for QA
- [ ] Verified / Done
- [ ] **Критичность:** P0 (customer 2026-09-29 ~21:04; после/вместе с BE-006)
- **Зачем:** тропа доступна пользователю **только после** контроля: (a) соответствует условиям обучения продукта, (b) даёт суть книги. Иначе `path_status` остаётся not-available (`pending`/`rejected`), playable nodes не отдаются.
- **«Условия обучения пользователя»** = уже существующие product rules, **не** новая форма настроек и не learner-profile UI (в коде профиля ученика под тропу нет — не изобретать):
  1. Теория перед практикой (порядок узлов: `summary_read` → practice types).
  2. Тонкая глава = только theory (`isThinChapter` / BE-004).
  3. Упражнения grounded в **сохранённой** теории sibling (`filterGroundedExercises` / BE-003).
  4. Сердца **не** участвуют в генерации/гейте контента (BE-005 отдельно).
- **Суть (essence):** у substantive-глав `summary_read.description` непустой и достаточно содержательный; practice-узлы проверяют именно эту theory (не raw chapter шире сохранённой theory). Thin — один theory-узел с blurb, без пустого playable practice.
- **Schema:** использует `books.path_status` из BE-006 (`pending` → после успешного gate `approved`; fail → `rejected` или остаётся `pending`). **PathNode без новых полей.** Отдельный объект availability для FE.
- **Actions:**
  1. После write-once сборки (BE-006) вызвать чистый validator, напр. `validateLearningPathGate(bookId)` (новый) → `{ ok: true } | { ok: false; reasons: string[] }`. При ok → `path_status = 'approved'`; иначе не approved, nodes **не** в playable-ответе `getLearningPath` / availability.
  2. Опционально маленький zod-check поверх уже сохранённых payloads (структура узлов/карточек) — **не** новый AI schema; **exerciseListSchema без изменений.**
  3. Read path (`getLearningPath` / `getBookPathAvailability`): если не `approved` → пустой playable list + status, даже если сырые rows временно в БД.
- **AI JSON:** на гейте AI **нет**; только детерминированные проверки над БД. exerciseListSchema без изменений.
- **RLS:** тот же `getCurrentUserId()` + `books.userId`.
- **Ошибки / DoD-фикстуры:** failing fixture (пустая theory на substantive, practice без grounding, thin с practice-узлами, нарушенный порядок) **не** становится `approved`. Passing stored path → serve с **нулём** AI на read.
- **Зависимость:** BE-006 (persist + status column). FE-006 читает availability.
- **Файлы:** `src/lib/ai/book-processor.ts` (или новый `src/lib/learning-path-gate.ts`), `src/lib/data.ts`, `src/db/schema.ts`; контракт → `docs/backend-desk.md`.
- **Acceptance Criteria (DoD):**
  - [ ] Gate проверяет product rules (theory→practice, thin=theory-only, grounded exercises, hearts out of generation) + non-empty essence theory для substantive.
  - [ ] Fail → `path_status` не `approved`; playable path пользователю не отдаётся.
  - [ ] Pass → `approved`; read path zero AI; контент из БД стабилен.
  - [ ] Нет нового settings/learner-profile экрана; PathNode frozen; exerciseListSchema без изменений.
  - [ ] Контракт статуса/reader в `docs/backend-desk.md`.

## Готово (Ready for QA — Verified не ставить без QA)

### [x] BE-005 · P0 · Жизни только на первом проходе узла (RFC-003)

- [ ] To Do
- [x] Ready for QA
- [ ] Verified / Done
- [x] **Критичность:** P0 (RFC-003)
- **Статус (2026-09-29 21:05):** Ready for QA (backend-desk confirm; Verified не ставить).
- **Статус (2026-09-29 21:00, backend):** Ready for QA. `applyLessonMiss` + `decrementHeartForMiss`; LessonRunner miss → charged gate; PathNode/props frozen. Контракт в backend-desk.
- **Статус (2026-09-29 fix pass):** DoD still met. Charge predicate extracted to `shouldChargeHeartOnMiss` in `src/lib/hearts.ts` (used by store); vitest charge table covers first-pass / replay / due.
- **Зачем:** ошибка на узле со статусом не `completed` и не `mastered` снимает 1 сердце; та же ошибка на повторе уже пройденного/освоенного узла сердце не снимает — только FSRS Again (`due` сдвигается). Ноль сердец на **новом** упражнении по-прежнему пауза + практика + таймер 4ч. Теория (`summary_read`) без жизней.
- **Где видно:** `LessonRunner` (спринт / пары / босс) и `/today/session` (due-повтор). Сейчас клиент: `recordLessonAnswer` + `decrementHeart` при `nodeId`; due без `nodeId` (`isDueReview`) сердца не тратит — этого мало: повтор **пройденного** узла с `nodeId` всё ещё зовёт `decrementHeart`.
- **Schema:** без изменений. Уже есть `user_node_progress.status` (`available` | `completed` | `mastered` | …) и `users_stats.hearts` / `max_hearts` / `last_heart_refill_at`. Колонок не добавлять.
- **Actions (реальные имена):**
  1. `recordLessonAnswer(cardId, correct)` / обёртка `registerMiss(cardId)` — **всегда** FSRS Again при miss; сердца не трогает (как сейчас). Сигнатуру FSRS не ломать.
  2. `decrementHeart(userId)` из `src/lib/actions/hearts.ts` → `src/lib/hearts-store.ts` — сейчас всегда −1. **Нужно:** штраф по miss только если узел карточки ещё не `completed`/`mastered`.
  - Минимальный контракт (клиент **не** получает `progress.status`, props `LessonRunner` **не** менять): серверный путь miss→сердце смотрит `quiz_cards.nodeId` → `user_node_progress` для `getCurrentUserId()`. Если статус `completed` | `mastered` (или нет `nodeId`, как due-сессия) — **не** декрементить, вернуть текущий `HeartStatus` и явный признак `charged: false` (или эквивалент: сердца не изменились + документированный флаг). Если `available` (первый проход) — `decrementHeart` как сейчас, `charged: true`.
  - Варианты реализации на выбор Backend: расширить `decrementHeart` (например принимать `cardId`) **или** тонкий action поверх `registerMiss`/`recordLessonAnswer` + условный `decrementHeart`; FE должен уметь отличить «сняли» vs «только Again» без новых props `LessonRunner`.
  3. `rateCard` (`src/app/actions/quiz.ts`) — вне этого контура урока; не смешивать.
- **AI JSON:** без изменений.
- **RLS:** изоляция через `getCurrentUserId()` + фильтр `userId` на `quiz_cards` / `user_node_progress` / `users_stats`. SQL RLS не обязателен; чужой `cardId`/`userId` — отказ.
- **Ошибки:** карточка не найдена / чужая → `{ ok: false, error }` без изменения сердец; узел locked — как сейчас на странице урока; не бросать 500 на штатный replay-miss.
- **Вне объёма:** покупка сердец, смена max с 5, снятие жизней с первого прохода, RFC-004 (длина главы), форма `PathNode` / props `LessonRunner`.
- **Зависимость для FE-005:** без статуса на клиенте UI опирается на ответ сервера (`charged` / неизменённый `HeartStatus`) + существующий `isDueReview` (`!nodeId` на `/today/session`).
- **Файлы:** `src/app/actions/lessons.ts`, `src/lib/actions/hearts.ts`, `src/lib/hearts-store.ts`, `src/lib/hearts.ts`; контракт → `docs/backend-desk.md`.
- **Реализация (Backend):** `decrementHeartForMiss(cardId)` / alias `decrementHeartOnLessonMiss`; тонкий `applyLessonMiss(cardId)` = FSRS Again + условный заряд. Ответ: `({ ok: true; charged: boolean } & HeartStatus) | { ok: false; error }`.
- **Acceptance Criteria (DoD):**
  - [x] Miss на узле со статусом `available` (не `completed`/`mastered`) → ровно −1 сердце; FSRS Again через `recordLessonAnswer` / `registerMiss`.
  - [x] Miss на узле `completed` или `mastered` → сердца не меняются; `due`/FSRS Again всё равно пишется.
  - [x] Due-повтор без `nodeId` (`/today/session`) → сердца не тратятся (сохранить / усилить серверным гейтом).
  - [x] При 0 сердец после miss на **новом** упражнении — пауза доступна как сейчас (practice + 4h); покупки нет.
  - [x] `summary_read` / theory — сердец нет (не регрессия).
  - [x] Schema без новых колонок; AI JSON без изменений; `getCurrentUserId`+`userId`; PathNode / props `LessonRunner` frozen.
  - [x] Контракт (`charged` / эквивалент) записан в `docs/backend-desk.md`.

### [x] BE-004 · P1 · Тонкая / пустая глава → только theory-узел

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (substance gate; не RFC-004)
- **Статус (2026-09-29 20:15, backend):** `isThinChapter` в `src/lib/ai/thin-chapter.ts`: substance = `contentSummary || content` без title; `< 80` или единственная карточка `THIN_THEORY_FALLBACK` → один `summary_read`. Содержательная глава — прежние 4 узла. Уже сохранённые practice-узлы тонкой главы снимаются при сборке, вторая theory на `(chapter_id, 0)` не вставляется (`onConflictDoNothing`). AI на thin не зовётся. PathNode не менялся.
- **QA (2026-09-29):** Verified — code review `generateLearningPathOnFly` + `vitest` `src/lib/ai/thin-chapter.test.ts` (green). DB rebuild/onConflict не гонялся в живой БД.
- **Acceptance Criteria (DoD):**
  - [x] Thin-тест в `src/lib/ai/thin-chapter.test.ts` и даёт ровно 1× `summary_read` в `generateLearningPathOnFly`.
  - [x] Substantive глава по-прежнему 4 узла (порядок типов без изменений).
  - [x] Rebuild не создаёт duplicate `(chapter_id, order_index)`.
  - [x] Контракт в `docs/backend-desk.md`; PathNode shape не менялся.
  - [x] QA: Verified только после приёмки QA (не browser-check Developer).

### [x] BE-003 · P0 · Упражнения только из теории summary_read

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (product foundation: суть → проверка)
- **Статус (2026-09-29 20:10, backend-desk):** DoD закрыт Backend. `generateLessonContentOnFly` берёт sibling `summary_read.description` (иначе `theoryDescriptionFromChapter`); prompt только theory-string; post-filter `filterGroundedExercises`; `fallbackExercises` удалён; 0 grounded / AI fail → `ok: true`, `cards: []`. Схема упражнений без `groundingQuote`.
- **QA (2026-09-29):** Verified — code review processor + `vitest` `src/lib/ai/grounding.test.ts` / `quiz-schema.test.ts` (36 suite green). Live AI call not run.
- **Acceptance Criteria (DoD):**
  - [x] Prompt практики из theory sibling / theoryDescriptionFromChapter, не raw chapter шире теории.
  - [x] Нет `fallbackExercises` на пути практики.
  - [x] Незаземлённые drop; 0 → `cards: []`, не 500.
  - [x] Схема БД без новых колонок; контракт в backend-desk.
  - [x] `getCurrentUserId`+`userId` сохранены.
  - [x] QA: Verified только после приёмки QA.

### [x] BE-001 · P0 · Контракт панели «Сегодня»

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (RFC-001)
- **Статус (2026-09-29 19:55, backend-desk):** DoD закрыт Backend. `getTodayPanel()` → `TodayPanel` `{ book, nextNode, dueCount }`; `listBookDueCards(bookId)` → `BookDueCard[]` `{ id, exercise }`, `due ASC`; `pickActiveBook` по правилу Developer (available → max `completedAt`). Legacy `getContinueBookSession` — тот же pick, **не** замена `getTodayPanel` для FE-001. Контракт в `docs/backend-desk.md`. Developer browser-check 20:53 ≠ QA.
- **QA (2026-09-29):** Verified — code review `src/lib/data.ts` + FE wiring; no DB integration test.
- **Acceptance Criteria (DoD):**
  - [x] Книга + first available + dueCount по `nodeId`/`due`; list due ASC → LessonCard shape.
  - [x] PathNode не тронут.
  - [x] Контракт в backend-desk.
  - [x] QA: Verified только после приёмки QA (RFC-001 browser-check Developer не считается).

### [x] BE-002 · P0 · FSRS при ответе в уроке (Good / Again)

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (RFC-002)
- **Статус (2026-09-29 19:55, backend-desk):** DoD закрыт Backend. Action **`recordLessonAnswer(cardId, correct)`** — correct→Good, wrong→Again; `scheduleReview` + FSRS-поля `quiz_cards` + `review_logs`. Обёртки: `registerCorrect` / `registerMiss`. `completeLessonNode` / unlock не менялись. Design FE-002 зовёт тот же Good/Again. Developer browser-check ≠ QA.
- **QA (2026-09-29):** Verified — `recordLessonAnswer` + `vitest` `src/lib/fsrs.test.ts` (Good/Again). Heart miss path is FE/BE-005 (BUG-001), not this card.
- **Acceptance Criteria (DoD):**
  - [x] Good/Again полный FSRS; review_logs; unlock next не сломан.
  - [x] Контракт в backend-desk; PathNode / completeLessonNode без регрессии.
  - [x] QA: Verified только после приёмки QA (RFC-002 не Verified).

## Справочник (не задачи)

- Схема: `src/db/schema.ts` — `books`, `bookChapters`, `quizzes`, `quizQuestions`, `flashcards`, `lessonNodes`, `userNodeProgress`, `notes`, `quizCards`, `reviewLogs`, `usersStats`, `achievements`, `userAchievements`, `reminders`, `quizAttempts`. Пользовательские строки несут `userId`.
- Actions: `src/app/actions/books.ts`, `book-study.ts`, `lessons.ts`, `quiz.ts`, `gamification.ts`, `notes.ts`, `auth.ts`; сердца — `src/lib/actions/hearts.ts` / `hearts-store.ts`.
- AI JSON: `bookSummarySchema`, `recallQuizSchema`, `pathNodeSchema` в `src/lib/ai/book-processor.ts`. Упражнения — `exerciseListSchema` в `src/lib/exercises.ts` (`multiple_choice`, `matching_pairs`, `fill_blank`, `sequence_order`, 5–8 штук).
- RLS: SQL-политик в репозитории нет. Изоляция сейчас в приложении через `getCurrentUserId()` и `userId`. Новая задача обязана явно сказать: оставить проверку в action или добавить SQL RLS.
- Контракт UI не менять без записи в `docs/backend-desk.md`: `PathNode`, props `LessonRunner`.
