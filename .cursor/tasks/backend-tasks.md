# Backend tasks

**Кто пишет:** аналитик. **Кто делает:** Backend. Файл не переписывать целиком — отмечать статусы на карточке и дописывать заметку под задачей.

Обновлено: 2026-09-29 22:20 UTC+3

**Старт роли:** Backend берёт карточку после того, как аналитик положил её сюда (шаг 4–6, параллельно с AI и DevOpsSec).

Prompt / Zod-схема / обработка ответа LLM **не** реализуются на BE-карточке — карточка и DoD живут в `.cursor/tasks/ai-prompts.md`. Миграции / RLS / rate-limit / env — в `.cursor/tasks/devops-security.md` (линк с BE, не дублировать работу).

Сюда же попадают маркетинговые карточки после заполненной «Задача аналитику» в `docs/marketer-desk.md`. Scope для Backend — **только** эти карточки, не developer-/marketer-desk напрямую. Те же статусы QA (To Do / Ready for QA by the developer / Verified only by QA), Acceptance Criteria; frontend `data-testid` — на FE-доске.

**Статусы карточки (три состояния):**
- `[ ]` **To Do** — ещё не сделано / в работе у Backend.
- `[x]` **Ready for QA** — выставляет **Backend** после своей проверки DoD (не аналитик «на глаз»).
- `[x]` **Verified / Done** — выставляет **только QA**. Аналитик это поле не трогает.

Чекбокс в заголовке `### [ ]` / `### [x]` = текущая стадия (To Do vs Ready for QA и далее). Под заголовком всегда три строки статусов. `Verified / Done` не отмечать без QA.

Цель: **BE-011** To Do (share/OG payload после шага главы). **BE-010** Verified — не переоткрывать. **BE-009** / **BE-008** Verified — не переоткрывать. RFC-001/002/003/004 не трогать. PathNode frozen. AI JSON без изменений (для share LLM нет).

Правило карточки: критичность `P0` / `P1` / `P2`, ссылки на файлы. В каждой задаче: schema, сигнатура action/route, JSON для AI, RLS, ошибки, **Acceptance Criteria (DoD)** чекбоксами.

## Открытые

### [ ] BE-011 · P1 · Share/OG payload: книга + глава + свой прогресс (без чужой библиотеки)

- [x] To Do
- [ ] Ready for QA
- [ ] Verified / Done
- [x] **Критичность:** P1 (Marketer desk «Задача аналитику» 22:15 + Developer «Ответы аналитику»: книга, глава, кот cheer, свой прогресс)
- **Зачем:** после закрытого шага главы человек может поделиться одной карточкой. Backend отдаёт данные карточки и безопасный share-URL. Не публичный каталог книг, не интеграция с соцсетями.
- **Сейчас:** прогресс шагов уже считается (`summarizePath` / шапка книги «N из M шагов»); название книги и строка главы есть в продукте. Отдельного share-payload и share-URL нет.
- **Payload (контракт для FE-013 и OG):**
  - `bookTitle` — название книги пользователя.
  - `chapterLine` — одна строка главы (уже сохранённый title/подпись главы или узла; **не** сырой текст главы, **не** LLM).
  - `stepsCompleted` / `stepsTotal` — свой прогресс по шагам **этой** книги (как на тропе).
  - Mood для карточки на FE — только `cheer` (из пяти уже существующих); Backend mood не генерирует.
- **Share-URL:**
  - Только то, чем пользователь **явно** поделился (снимок/токен карточки или эквивалент).
  - Открытие URL **не** открывает чужую библиотеку, **не** отдаёт сырой файл / `books.content` / главу целиком, **не** индекс всех книг.
  - Посторонний видит только поля карточки выше (и при необходимости OG meta из них же).
- **Schema / actions:**
  - Допустимо тонкое хранилище снимка (id/token + поля payload + owner) **или** подписанный/неугадываемый id без утечки списка книг — Backend фиксирует в `docs/backend-desk.md`.
  - Создание снимка — только владелец книги (`getCurrentUserId()`); чтение публичного share — **только** поля снимка, без join на чужие notes/файлы.
  - **Не** новый `nodeType`. **PathNode** / props `LessonRunner` — frozen.
- **AI JSON:** без изменений; LLM не нужен (см. `ai-prompts.md`).
- **RLS / rate-limit публичного маршрута:** **DO-002** (`.cursor/tasks/devops-security.md`) — не дублировать работу здесь.
- **Ошибки:** чужой bookId / нет сессии на create → отказ; несуществующий/просроченный share id → пустая/404 карточка без утечки; не 500 с телом книги.
- **Вне объёма:** лиги, рейтинг, магазин, звуки; пиксели, Product Hunt, Telegram; сердце за приглашение/шеринг; публичное SEO всех книг; новый mood/кадр BookCat; переоткрывать RFC-001…004, BE-008…010, FE-008…012.
- **Файлы (ориентир):** actions/route share snapshot; при необходимости тонкая таблица/колонки; контракт → `docs/backend-desk.md`. UI — **FE-013**.
- **Зависимость FE:** **FE-013** стартует после Ready/Verified **BE-011** и **DO-002** (AI-карточки нет).
- **Acceptance Criteria (DoD):**
  - [ ] Owner может получить/создать payload: `bookTitle`, `chapterLine`, `stepsCompleted`, `stepsTotal`.
  - [ ] Share-URL отдаёт только эти поля (и OG из них); чужая библиотека и файл книги недоступны.
  - [ ] Нет нового `nodeType`; PathNode / LessonRunner frozen; AI JSON без изменений.
  - [ ] Нет рейтинга / лиг / магазина / пикселей / сердца за шеринг в контракте данных.

### [x] BE-010 · P1 · Сохранённые теоретические моменты + определения + экспорт в Word (.docx)

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (customer chat 2026-09-29 ~21:37 + ~21:41 definitions; прямая постановка аналитику, без ожидания developer-desk)
- **QA (2026-09-29):** Verified — all DoD bullets met. Schema `notes` + enum `definition` + `term`; `saveTheoryMoment` / `saveDefinition` owner-gated; `listNotes({ bookId? })` user-scoped + `sourceKind`/`term`; `GET /api/notes/export` still fail-closed (session → 401; both paths `eq(notes.userId, userId)`; foreign book → empty docx, no foreign rows). Sectioned docx (theory / definitions / freeform). Vitest `notes-docx` + `tenant-isolation` → **2 files / 20 passed**. New bugs: none. FE-012 left To Do.
- **Зачем:** пункт меню «Заметки» — коллекция **теоретических моментов** и **ключевых определений**, которые пользователь сам сохраняет с TheoryLesson (`summary_read`). В заметках можно разобраться с сохранённым или выгрузить в Microsoft Word (`.docx`; в чате опечатка «Wordc»). Не сырая глава, не упражнение, не вся книга. **Не** параллельная система notes — тот же `notes` + `sourceKind`.
- **Сейчас:** `notes` = freeform `title` + `content` + `userId` (+ timestamps). Actions: `createNote` / `updateNote` / `deleteNote`. Нет provenance книги/узла, нет save из теории/определений, нет экспорта .docx. Freeform editor остаётся **вторичным**. `buildTheoryCards` → `string[]` (plain); отдельного JSON `definitions[]` нет.
- **Schema (расширить `notes` только недостающим):**
  - **Reuse:** `userId`, `title`, `content`, `createdAt`, `updatedAt`.
  - **Добавить / уточнить:**
    - `bookId` uuid nullable FK → `books.id` (onDelete set null или cascade — Backend фиксирует в desk; для theory/definition-save обязателен non-null на insert).
    - `nodeId` uuid nullable FK → `lesson_nodes.id` (узел `summary_read`, откуда взят snippet).
    - `sourceKind` enum: `'theory_moment' | 'definition' | 'freeform'` (default `freeform`; `NULL`/freeform = прежние rows). Раньше планировался только `theory_moment` — **добавить `definition`**.
    - `term` text **nullable** — заполняется только при `sourceKind = 'definition'` (короткий термин ≤ 80 символов); для `theory_moment` / `freeform` = `NULL`.
    - Для `definition`: `content` = **meaning** (короткое значение); `title` = `term` или первые ~80 символов; **не** дублировать главу. Допустимо также писать в `content` строку `"term — meaning"`, если `term` уже в колонке — тогда meaning-only в `content` предпочтительнее (list/export читают `term` + `content`).
    - Для `theory_moment`: `content` = текст theory-карточки; `term` = `NULL`.
    - Опционально `cardIndex` int nullable — индекс карточки в `theoryCards[]` / строки на карточке.
    - Опционально `reviewedAt` timestamptz nullable — «разобрался» без второго квиза.
  - Миграция / default / RLS / rate-limit export: **см. DO-001** (`.cursor/tasks/devops-security.md`).
  - **Не** хранить `books.content` / главу целиком / exercise payload. Только короткий snippet + ids источника.
- **Распознавание определения в тексте теории (одно правило, для FE; Backend принимает уже разобранные term/meaning):**
  - В plain-строке theory-карточки (`theoryCards[i]`) **строка** (после split по `\n`), которая матчит `^(.{1,80}?)\s*[—–]\s+(.+)$` (term ≤ 80 символов, разделитель em/en dash `—`/`–`, далее meaning), считается **определением**. FE подсвечивает этот span; Backend **не** парсит главу сам при save — принимает `term` + `meaning` с клиента.
  - **AI JSON: без изменений.** Не добавлять `definitions: { term, meaning }[]` в theory payload; `buildTheoryCards` остаётся `string[]`. Highlight — UI-treatment уже попавших в карточку строк по правилу выше. **exerciseListSchema без изменений.**
- **Actions / route (сигнатуры):**
  1. `saveTheoryMoment({ bookId, nodeId, cardText, cardIndex? })` — как раньше; `sourceKind = 'theory_moment'`; `term = NULL`; `content` = текст карточки.
  2. **Определения:** либо `saveDefinition({ bookId, nodeId, term, meaning, cardIndex? })`, либо тот же `saveTheoryMoment` / общий `saveTheorySnippet` с `sourceKind: 'definition'` + `term` + `meaning`/`cardText`. На insert: `sourceKind = 'definition'`, `term` = trimmed term, `content` = meaning (не chapter raw). Не принимать сырой chapter / quiz / exercise.
  3. `listNotes({ bookId? })` — только `userId` текущего; отдать id, title, content, **term**, bookId, book title, nodeId, **sourceKind**, reviewedAt?, updatedAt (чтобы FE отличил «Определение»).
  4. **Export Word:** `GET /api/notes/export?bookId=` **или** `exportNotesToDocx(bookId?: string)` → `.docx`.
     - **Объём:** при `bookId` — все **свои** notes этой книги с `sourceKind ∈ {theory_moment, definition}`; без `bookId` — **все** свои (theory + definition + freeform). Один файл, user-scoped.
     - **Структура .docx (зафиксировано):** секция «Теоретические моменты» (theory_moment); отдельная короткая секция **«Определения»** (definition: строки `term — meaning` или term + meaning); freeform — в общей/своей секции если есть. Пустой набор → дружелюбный пустой `.docx` или typed empty, **не 500**.
  5. `createNote` / `updateNote` / `deleteNote` — freeform; update может ставить `reviewedAt`.
- **AI JSON:** без изменений (см. правило распознавания выше). Не новый AI-пайплайн.
- **RLS:** везде `getCurrentUserId()` + `notes.userId`. Чужой `bookId`/`nodeId` / чужие notes — отказ; в export не попадают. PathNode frozen.
- **Ошибки:** пустой export → empty docx / typed empty, не 500. Invalid node / пустой term/meaning — typed error. Missing auth — как сейчас.
- **Вне объёма:** PathNode / props LessonRunner; RFC-001…004; BE-009/BE-008; FE-008…011; лиги/рейтинг/магазин; хранение всей книги; отдельная таблица definitions; новый квиз по заметкам как primary.
- **Файлы:** `src/db/schema.ts` (`notes`, enum `note_source_kind` + `definition`, колонка `term`), migration drizzle, `src/app/actions/notes.ts`, `src/lib/data.ts`, route/action export; контракт → `docs/backend-desk.md`.
- **Зависимость FE:** **FE-012** (save theory + highlight/save definition, список с меткой «Определение», «В Word»).
- **Acceptance Criteria (DoD):**
  - [x] Save theory-карточки → `notes` с `sourceKind=theory_moment` + bookId/nodeId; не chapter raw, не exercise.
  - [x] Save определения → `notes` с `sourceKind=definition`, заполненным `term`, `content`=meaning; не глава целиком.
  - [x] List scoped по `userId`; отдаёт `sourceKind` (+ `term` для definition); опциональный фильтр `bookId`.
  - [x] Export .docx: секция определений отдельно от theory moments; при `bookId` — свои theory+definition книги; без — все свои; чужие не экспортируются; пустой export — не 500.
  - [x] AI JSON / PathNode / LessonRunner / RFC-001…004 без изменений; freeform create/update не сломан; отдельной notes-системы нет.

**Заметка Backend (2026-09-29 ~22:10):** Ready for QA. Live DB: columns + enum `theory_moment|freeform|definition` + `term`. `saveTheoryMoment` / `saveDefinition`; `listNotes({ bookId? })` + bookTitle/term; `GET /api/notes/export` sectioned docx; empty → empty file. Vitest `notes-docx` **8 passed**. PathNode / AI JSON frozen. Verified не ставить.

**QA (2026-09-29):** → **Verified / Done**. Export auth re-checked after post-sec edit: still session + owner-only. See QA note above.

### [x] BE-009 · P0 · Readers: узлы в БД → отдать UI; library ≡ book page

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (Developer desk 2026-09-29 21:22 / 21:23; факт localhost: книга «На тропе» 2% в библиотеке, `/books/[id]` — «тропа не готова» + «Собрать тропу», узлов на карте нет, 500 не было)
- **QA (2026-09-29):** Verified — code `effectivePathAvailability` / `getLearningPath` / `getBookPathAvailability` / `listBooks` (rejected hides mastery; pending keeps nodes); `getLessonContent` blocks only rejected; contract in backend-desk. Vitest `effective-path-availability` + `data-schema-error` + `learning-path-gate` → **3 files / 16 passed**. Browser: library «На тропе» · «26 глав · 2%» ≡ book «2 из 104 шагов» · «тропа 2%»; no empty/not-ready regression. New bugs: none.
- **Зачем:** UI не должен гадать. Если `lesson_nodes` у книги уже есть — `getLearningPath` / `getBookPathAvailability` отдают эти узлы (карта). Gate «не готова» / пустой playable — только когда узлов **нет** или книга **явно `rejected`**. Библиотека (`listBooks` mastery / бейдж) и страница книги говорят одно и то же.
- **Сейчас (баг):** `listBooks` считает реальные `lesson_nodes` + progress → mastery > 0 → «На тропе». `getLearningPath` / `getBookPathAvailability` при `path_status !== 'approved'` возвращают **пустой** `nodes[]` (BE-007 «даже если сырые rows в БД»). FE получает not-ready и кнопку сборки при живых узлах в БД.
- **Правило gate (Developer, не отменять RFC-004 / FE-008):**
  1. Узлы в БД есть → readers отдают `PathNode[]` (playable list), UI рисует карту. Не маскировать stored nodes пустым массивом из-за `pending`.
  2. Узлов нет (`count(lesson_nodes)=0`) → empty nodes + not-ready / pending; кнопка «Собрать тропу» уместна.
  3. Явный `rejected` → empty playable + rejected (контроль не пройден); «Собрать тропу» допустима как повторный явный write.
  4. `approved` без регрессии: как сейчас, nodes + approved.
- **Schema:** без новых колонок и **без нового `nodeType`**. Используем существующие `lesson_nodes`, `user_node_progress`, `books.path_status`. **PathNode frozen.**
- **Actions / readers (что отдавать, чтобы UI не гадал):**
  1. `getLearningPath(bookId)` → `PathNodeRow[]`: если у книги есть stored nodes и статус **не** `rejected` — SELECT узлов + progress (как сейчас при approved). Если `rejected` **или** узлов нет — `[]`.
  2. `getBookPathAvailability(bookId)` → `{ status, nodes }`:
     - nodes = результат того же правила, что `getLearningPath` (один источник правды);
     - `status`: `rejected` остаётся `rejected`; при наличии nodes и не-rejected — отдавать статус, при котором FE **не** показывает not-ready (предпочтительно `approved`, либо согласованный контракт в `docs/backend-desk.md`: «nodes.length > 0 ⇒ карта»; зафиксировать явно). Не оставлять `pending` + empty nodes при живых rows.
  3. `listBooks()`: mastery / «есть тропа» считать **тем же** набором узлов, что playable readers (не считать прогресс по rows, которые book-page скрывает). Либо оба экрана видят одни и те же stored nodes; расхождение mastery>0 при empty availability — дефект Backend.
  4. Урок / `getLessonContent`: если nodes отданы readers — урок по `nodeId` из этого набора не отвечает «Тропа ещё не готова» только из-за `pending`.
- **Стык с BE-006/007 (не дублировать карточки):** persist + gate validator остаются; меняется **read-политика**: stored nodes не прятать за `pending`. Write-once / `buildLearningPath` / RFC-004 (BE-008) **не** переписывать. Progress не стирать.
- **AI JSON:** без изменений. **exerciseListSchema без изменений.**
- **RLS:** `getCurrentUserId()` + `books.userId` как сейчас.
- **Ошибки:** нет узлов / rejected → empty + status, не 500. Missing `path_status` — как сейчас (schema-error path), не маскировать ложным «На тропе».
- **Вне объёма:** новый `nodeType`, смена формы `PathNode` / props `LessonRunner`, перепись RFC-004 (BE-008), расширение FE-008, ручной редактор тропы.
- **Файлы:** `src/lib/data.ts` (`getLearningPath`, `getBookPathAvailability`, `listBooks`), при необходимости `src/lib/ai/book-processor.ts` (lesson readiness / reconcile — только если мешает отдаче stored nodes); контракт → `docs/backend-desk.md`.
- **Acceptance Criteria (DoD):**
  - [x] Книга с `lesson_nodes` в БД (и не `rejected`): `getLearningPath` / `getBookPathAvailability` возвращают эти узлы; UI может показать карту без повторной «Собрать тропу».
  - [x] Книга без узлов: empty `nodes` + not-ready/pending; «Собрать тропу» — единственный явный путь собрать тропу.
  - [x] `rejected`: empty playable + явный rejected; не выдавать карту как approved.
  - [x] `listBooks` mastery / признак «на тропе» согласованы с тем же набором узлов, что readers книги; кейс «библиотека 2% / На тропе» + book page empty/not-ready — закрыт.
  - [x] RFC-004 (short=2 / long=4 / thin=1, progress-safe) не отменён; PathNode frozen; exerciseListSchema без изменений; контракт readers в `docs/backend-desk.md`.

**Заметка Backend (2026-09-29):** Ready for QA. Read-политика: `getLearningPath` отдаёт stored nodes если не `rejected`; `getBookPathAvailability` через `effectivePathAvailability` — pending+узлы → `{ status: "approved", nodes }` (без записи в БД); rejected → empty; `listBooks` не считает mastery по rejected; `getLessonContent` блокирует только rejected. PathNode / RFC-004 / FE-008 не трогал. Verified не ставить.
- **Как задумано (Developer 21:40):** страница книги показывает карту, если узлы уже есть и книга не rejected; «Собрать тропу» только когда узлов нет; library ≡ book page. Не переоткрывать; не плодить вторую карточку на то же.

### [x] BE-008 · P1 · RFC-004: длина главы → 2 или 4 узла

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (RFC-004; Developer desk 2026-09-29 21:12)
- **Статус (2026-09-29 ~21:40, backend):** Ready for QA. `classifyChapterPathSize` + `chapter-path-size.ts` (порог `read_time_minutes <= 2` → short / `> 2` → long; thin побеждает). `generateLearningPathOnFly` пишет 1/2/4 blueprints; AI schema length 2|4. Повтор: `onConflictDoNothing`; лишние pairs/boss **без** прогресса (`locked` / нет строки) снимаются; `available`/`completed`/`mastered` не трогаем. PathNode frozen. Verified не ставить.
- **Статус (2026-09-29 ~21:20, BUG-005):** progress-safe trim confirmed + vitest BUG-005 case; DoD still met.
- **QA (2026-09-29):** Verified — code + vitest `chapter-path-size` (thin/short/long + BUG-005 prune) + `thin-chapter` + `learning-path` (actual total); browser book all chapters 10–14 min → 104 long nodes (26×4), short UI N/A by design; BUG-005 stays Fixed.
- **Зачем:** микрообучение режет главу по объёму. Содержательная короткая глава → теория + спринт (2 узла). Длинная → теория → спринт → пары → босс (4 узла, прежний порядок типов). Thin/пустая (BE-004 / `isThinChapter`) по-прежнему 1× `summary_read` — **не отменять**.
- **Порог длины (зафиксирован, без В1):** `book_chapters.read_time_minutes <= 2` → short (2 узла); `> 2` → long (4 узла). Если `read_time_minutes` отсутствует/невалиден — оценка из substance (`contentSummary || content`) ≈ **слова / 180**, округление как у парсеров, минимум 1. Thin (`isThinChapter`, substance < 80 символов / fallback) побеждает short/long.
- **Сейчас:** substantive глава всегда 4 blueprint'а (`summary_read` → `quiz_sprint` → `flashcard_review` → `boss_challenge`).
- **Compose (не дублировать):**
  - BE-004 / `isThinChapter` — theory-only; порог short/long **выше** thin.
  - BE-003 grounding — на practice-узлах, которые реально созданы (у short только sprint).
  - BE-006/BE-007 — persist/gate; эта карточка меняет **сколько** узлов пишет write-once / `generateLearningPathOnFly` / `buildLearningPath`, не гейт availability и не read-only.
- **Schema:** без новых колонок и без новых `nodeType`. Используем существующие `book_chapters.read_time_minutes`, `content` / `content_summary`, `lesson_nodes` (`order_index`, unique chapter+order). **PathNode frozen.**
- **Actions / функции:**
  1. Классификатор размера главы (тонкий helper): thin | short | long по правилу выше; blueprints: thin→`[summary_read]`; short→`[summary_read, quiz_sprint]`; long→все четыре в том же порядке и с теми же title/description/xp, что сейчас.
  2. `generateLearningPathOnFly` / write-once сборка (BE-006) создаёт ровно `expectedCount` узлов. Повторная сборка: **не** плодит дубли `(chapter_id, order_index)`; если ранее было 4, а глава short — лишние `flashcard_review`/`boss_challenge` (order ≥ 2) **без прогресса** снимаются; узлы с `available`/`completed`/`mastered` не удаляются (Developer desk). Thin чистит practice без прогресса (BE-004).
  3. Прогресс / unlock считают фактические узлы главы (закрытие главы = все её созданные узлы completed/mastered) — без хардкода «4 на главу».
- **AI JSON:** `pathNodeSchema` / exercise schemas без новых типов; длина массива узлов = 1 / 2 / 4 по size. **exerciseListSchema без изменений.**
- **RLS:** `getCurrentUserId()` + `books.userId` как сейчас.
- **Ошибки:** short/long не ломают thin; failed AI на short не подставляет фейковые pairs/boss.
- **Вне объёма:** новый `nodeType`, ручной редактор тропы, лимит «первые 8 глав», смена формы `PathNode` / props `LessonRunner`, отмена BE-004, persist/gate (BE-006/007).
- **Файлы:** `src/lib/ai/book-processor.ts` (blueprints / `generateLearningPathOnFly`), `src/lib/ai/chapter-path-size.ts` (+ test); контракт порога → `docs/backend-desk.md`.
- **Acceptance Criteria (DoD)** — из ожиданий пользователя RFC-004:
  - [x] Короткая содержательная глава (`read_time_minutes <= 2`, не thin) на тропе даёт ровно теорию и спринт (2 узла: `summary_read`, `quiz_sprint`).
  - [x] Длинная глава (`read_time_minutes > 2`) даёт четыре узла в прежнем порядке: теория → спринт → пары → босс.
  - [x] Подписи/типы узлов те же (`summary_read` / `quiz_sprint` / `flashcard_review` / `boss_challenge`; UI-лейблы не менять на бэке).
  - [x] Прогресс по главе/книге считается по фактическому числу созданных узлов (не «всегда ×4»).
  - [x] Повторная сборка тропы не создаёт дубликаты узлов; short после long снимает pairs/boss **без** прогресса (с прогрессом — оставляем).
  - [x] Thin/пустая глава (BE-004) остаётся 1× theory; PathNode frozen; exerciseListSchema без изменений; контракт порога `<= 2` min в `docs/backend-desk.md`.
- **Как задумано (Developer 21:40):** до 2 мин — теория и спринт; длиннее — четыре узла; thin остаётся теорией; узлы с прогрессом при пересборке не удалять. Не переоткрывать RFC-004.

### [x] BE-006 · P0 · Persist тропы + read-only open (без AI на чтении)

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (customer 2026-09-29 ~21:04)
- **Статус (2026-09-29 21:15, backend):** Ready for QA. `books.path_status`; write-once `ensureFullLearningPath` + practice persist; read-only `getLessonContent`; `getBookPathAvailability`. Контракт в backend-desk. Verified не ставить.
- **QA (2026-09-29):** Verified — BookPage uses `getBookPathAvailability` only (no SSR `ensureFullLearningPath`); `getLessonContent` SELECT-only; approved no-op; migration `path_status` live; `/books` shows 1 book (BUG-004 Fixed); approved path serves stored 104 nodes.
- **Статус (2026-09-29 ~21:25, backend):** Ready for QA (follow-up). Hole: pending + existing nodes never got `path_status` written; build cleared nodes. Now `reconcileStoredLearningPathGate` (no AI/no clear) on book open + build; live book → `approved`. Verified не ставить.
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
  - [x] Открытие `/books/[id]` и урока **не** вызывает AI; только чтение `lesson_nodes` / `quiz_cards` / progress / `path_status`.
  - [x] Write-once (process или `buildLearningPath`) пишет узлы + theory `description` + practice rows в `quiz_cards`; второй визит того же user+book → идентичные nodes и идентичный theory/exercise текст.
  - [x] Повтор `buildLearningPath` при approved — не перегенерирует контент.
  - [x] Failed generation → не 500 book page; не отдаёт partial playable path; статус not-ready.
  - [x] `exerciseListSchema` без изменений; PathNode frozen; `getCurrentUserId`+`userId`.
  - [x] Reader/`path_status` записаны в `docs/backend-desk.md`.

### [x] BE-007 · P0 · Control gate: условия обучения + суть книги до availability

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (customer 2026-09-29 ~21:04; после/вместе с BE-006)
- **Статус (2026-09-29 21:15, backend):** Ready for QA. `validateLearningPathGate` / `evaluateLearningPathGate`; fail → `rejected` + empty playable; pass → `approved`. Контракт в backend-desk. Verified не ставить.
- **QA (2026-09-29):** Verified — `evaluateLearningPathGate` vitest green; `getLearningPath` empty unless `approved`; live `path_status=approved` → playable path; contract in backend-desk; PathNode frozen.
- **Статус (2026-09-29 ~21:25, backend):** Ready for QA (follow-up). `applyLearningPathGate` persists status; pending stored path reconciled once (enrich short theory, drop ungrounded cards, gate). Verified не ставить.
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
  - [x] Gate проверяет product rules (theory→practice, thin=theory-only, grounded exercises, hearts out of generation) + non-empty essence theory для substantive.
  - [x] Fail → `path_status` не `approved`; playable path пользователю не отдаётся.
  - [x] Pass → `approved`; read path zero AI; контент из БД стабилен.
  - [x] Нет нового settings/learner-profile экрана; PathNode frozen; exerciseListSchema без изменений.
  - [x] Контракт статуса/reader в `docs/backend-desk.md`.

## Готово (Ready for QA — Verified не ставить без QA)

### [x] BE-005 · P0 · Жизни только на первом проходе узла (RFC-003)

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (RFC-003)
- **Статус (2026-09-29 21:05):** Ready for QA (backend-desk confirm; Verified не ставить).
- **Статус (2026-09-29 21:00, backend):** Ready for QA. `applyLessonMiss` + `decrementHeartForMiss`; LessonRunner miss → charged gate; PathNode/props frozen. Контракт в backend-desk.
- **Статус (2026-09-29 fix pass):** DoD still met. Charge predicate extracted to `shouldChargeHeartOnMiss` in `src/lib/hearts.ts` (used by store); vitest charge table covers first-pass / replay / due.
- **QA (2026-09-29):** Verified — vitest hearts+charge+learning-path+fsrs 4/18 green; predicate+store+applyLessonMiss code review; browser first-pass miss −1, completed replay miss hearts unchanged.
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
