# Frontend / Design tasks

**Кто пишет:** аналитик. **Кто делает:** Design и Frontend. Файл не переписывать целиком — отмечать статусы на карточке и дописывать заметку под задачей.

Обновлено: 2026-09-29 22:20 UTC+3

**Старт роли:** Design ждёт, пока BE/AI/DO той же фичи станут Ready for QA или Verified (или аналитик явно написал «для этой фичи карточки AI/DO нет»); не стартовать FE, пока зависимость To Do.

Prompt / Zod-схема / обработка ответа LLM **не** на FE-карточке — см. `.cursor/tasks/ai-prompts.md`. Миграции / RLS / rate-limit / env — `.cursor/tasks/devops-security.md` (не реализовать на FE).

Сюда же попадают маркетинговые карточки после заполненной «Задача аналитику» в `docs/marketer-desk.md`. Scope для Design — **только** эти карточки, не developer-/marketer-desk напрямую. Те же статусы QA (To Do / Ready for QA by the developer / Verified only by QA), Acceptance Criteria и обязательные `data-testid`.

**Статусы карточки (три состояния):**
- `[ ]` **To Do** — ещё не сделано / в работе у Design.
- `[x]` **Ready for QA** — выставляет **Design/Frontend** после своей проверки DoD (не аналитик «на глаз»).
- `[x]` **Verified / Done** — выставляет **только QA**. Аналитик это поле не трогает.

Чекбокс в заголовке `### [ ]` / `### [x]` = текущая стадия (To Do vs Ready for QA и далее). Под заголовком всегда три строки статусов. `Verified / Done` не отмечать без QA.

Цель: **FE-013** To Do (share-карточка после шага главы) — **не стартовать**, пока **BE-011** и **DO-002** To Do. **FE-012** Verified — не расширять. **FE-011**/**FE-010** Verified — не расширять. **FE-008**/**FE-007**/**FE-009** Verified — не трогать. RFC-001/002/003/004 не переоткрывать. AI-карточки для этой фичи **нет**.

Правило карточки: критичность `P0` / `P1` / `P2`, ссылки на файлы. В каждой задаче: компоненты, кадр маскота, интерактив, **обязательные `data-testid`**, **Acceptance Criteria (DoD)** чекбоксами.

Контракт path gate: `BE-009` (readers: nodes в БД → отдать) поверх `BE-006`/`BE-007`. RFC-003 сердца: `BE-005`. Props `LessonRunner` / форма `PathNode` — frozen. FE-008 не расширять. Notes: **BE-010**. Share: **BE-011** + **DO-002**.

## Открытые

### [ ] FE-013 · P1 · Одна share-карточка после шага главы (книга + глава + cheer + прогресс)

- [x] To Do
- [ ] Ready for QA
- [ ] Verified / Done
- [x] **Критичность:** P1 (Marketer desk 22:15 + Developer: название книги, глава, кот cheer, свой прогресс; без рейтинга/звука/магазина/пикселей/PH/Telegram/сердца за invite)
- **Зачем:** после завершённого шага главы человек видит спокойную карточку и может сам ею поделиться. Не новый экран «соцсеть», не публичный каталог книг.
- **Зависимость (блокер):** **не начинать**, пока **BE-011** и **DO-002** не Ready for QA или Verified. Для этой фичи карточки AI **нет** (статика из известных полей). Schema/actions/share-URL — только через Backend; rate-limit/публичный маршрут — DevOpsSec.
- **Поверхность:** уже существующий финал урока/главы — `theory-complete` (TheoryLesson) **или** момент на `/books/[id]` после шага; Design выбирает одну поверхность, без второго «дома» шеринга.
- **Что видит пользователь на карточке:**
  - название книги;
  - одна строка главы;
  - BookCat mood **только** `cheer` (из пяти; **без** нового кадра);
  - свой прогресс: шаги закрыто / шагов всего по этой книге (из BE-011).
  - Контрол «Поделиться» → share-URL / Web Share / копирование ссылки на **эту** карточку (не библиотеку, не файл).
- **Компоненты:** тонкий блок на выбранной поверхности; `BookCat`. **Не** расширять геометрию FE-008. **Не** дублировать FE-010 (личная серия у тропы остаётся без шеринга). PathNode / props `LessonRunner` — **frozen**.
- **Токены (book/lesson):** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward` — без хардкода цветов.
- **Чего не делать:** лиги, рейтинг, магазин, звуки; пиксели, Product Hunt, Telegram; сердце за шеринг/приглашение; публичное SEO всех книг; новые mood; менять PathNode / LessonRunner; переоткрывать FE-008…012, RFC-001…004; выдумывать соцсеть-SDK.
- **data-testid (один обязательный):**
  - `chapter-share-card` — контейнер карточки шеринга (внутри — title/глава/прогресс/cheer; reuse `book-cat` на коте).
- **Acceptance Criteria (DoD):**
  - [ ] После шага главы на выбранной поверхности видна одна карточка: книга + глава + cheer + свой прогресс.
  - [ ] «Поделиться» ведёт на share-URL карточки (BE-011); чужая библиотека / файл книги не открываются.
  - [ ] `data-testid="chapter-share-card"` на месте; BookCat только `cheer` из пяти.
  - [ ] Нет лиг/рейтинга/магазина/звуков/пикселей/PH/Telegram/сердца за invite; PathNode / LessonRunner frozen; FE-008…012 не расширены.

### [x] FE-012 · P1 · Сохранить теорию и определения в «Заметки» + список + «В Word»

- [ ] To Do
- [ ] Ready for QA
- [x] Verified / Done
- [x] **QA (2026-09-29):** Verified — TheoryLesson `/lesson/b89e5af5-…`: «В заметки» ×3 (`save-theory-button`), mood idle, «Сначала коротко прочитай суть — без потери жизней»; this chapter had 0 `term — meaning` lines (no highlight) — rule covered by vitest + source. `/notes`: «Сохранённые моменты», «В Word» → `/api/notes/export` (`notes-export-word`), `notes-list` «Момент» + «Разобраться →», sidebar «Заметки»; «Определение» in source. PathNode/LessonRunner frozen. Vitest theory-definitions + theory-practice-ui: 2 files / 10 passed. New bugs: none.
- **Статус (2026-09-29 Design):** Ready for QA — TheoryLesson: per-card `save-theory-button` → `saveTheoryMoment`; `term —/– meaning` → `definition-highlight` + `save-definition-button` → `saveDefinition`. `/notes`: `notes-list` (Момент/Определение), `notes-export-word`, empty PathNotice + `book-cat`. Browser smoke: save → list. PathNode/LessonRunner frozen. Verified только QA.
- **Критичность:** P1 (customer chat 2026-09-29 ~21:37 + ~21:41 definitions; typo «Wordc» = Microsoft Word `.docx`)
- **Зачем:** суть меню «Заметки» — сохранённые **теоретические моменты** и **ключевые определения** с TheoryLesson. Пользователь сохраняет карточку теории или подсвеченное определение; потом разбирается в списке или экспортирует в Word. Freeform «Новая заметка» — secondary. **Не** второй UI notes.
- **Зависимость:** **BE-010** (`saveTheoryMoment` / `saveDefinition` или общий save с `sourceKind`, list с provenance+term, export .docx с секцией определений). Schema/AI/actions — только через Backend; FE не пишет drizzle.
- **TheoryLesson (`summary_read`) — теория:**
  - Контрол сохранения **на каждой theory-карточке** или на видимой карточке (Design выбирает; предпочтительно per-card).
  - По клику → BE-010 `sourceKind=theory_moment` с `bookId`, `nodeId`, текстом карточки (`cards[i]`, не chapter raw, не exercise).
  - BookCat mood: `idle` | `cheer`; **без** нового mood; **без** звука.
  - Props `LessonRunner` / форма `PathNode` — **frozen**.
- **TheoryLesson — определения (расширение ~21:41):**
  - **Правило span (одно, согласовано с BE-010):** в тексте карточки строка, матчащая `^(.{1,80}?)\s*[—–]\s+(.+)$` (term — meaning через em/en dash), рендерится как визуально отличный highlight (soft chip / span), не как обычный body. Токены: `bg-path-soft` и/или `text-path-ink` — **не** новый rainbow, **не** emerald.
  - `data-testid="definition-highlight"` на каждом таком span/chip.
  - Сохранение определения: отдельный `data-testid="save-definition-button"` **или** тот же save-control с kind=definition; по тапу на highlight **или** кнопке save у highlight → BE-010 `sourceKind=definition` с `term` + `meaning` (не вся глава). Тот же путь, что save theory, другой kind.
  - AI JSON на FE не менять: highlight — UI-treatment plain-строк по правилу выше.
- **Страница `/notes`:**
  - Primary: список theory moments **и** definitions — книга + текст (`data-testid="notes-list"`).
  - Definitions визуально/лейблом отличаются: метка **«Определение»** (и при наличии `term` — показать term); theory moments — без этой метки / как «Момент».
  - «Разобраться»: существующий NoteEditor / `/notes/[id]`; **не** второй квиз.
  - Кнопка **«В Word»** → .docx (BE-010: theory + definitions книги при фильтре, иначе все свои) — `data-testid="notes-export-word"`. Label кнопки остаётся **«В Word»**.
  - Empty: PathNotice/empty + одно предложение (моменты/определения с теории); **не** фейковая тропа. Reuse `book-cat` если кот в empty.
  - Sidebar **«Заметки»** (`src/lib/nav.ts` — не переименовывать). Freeform create — secondary.
- **Компоненты:** `TheoryLesson`, `/notes` page, `NoteEditor` (reuse), `PathNotice` / empty, `BookCat`.
- **Токены (book/lesson):** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`. Definition highlight — из path-токенов выше.
- **BookCat mood:** только из пяти; на теории — `idle`|`cheer`; на empty notes — `idle` если кот показан.
- **Чего не делать:** рейтинги, лиги, shop, звуки, новые mood; второй квиз; фейковая path; переименовать nav; параллельная notes-система; rainbow/emerald для definitions; переоткрывать RFC-001…004, FE-008…011, BE-009; менять PathNode / LessonRunner props.
- **data-testid (обязательные):**
  - `save-theory-button` — save theory card
  - `definition-highlight` — подсвеченный span/chip определения
  - `save-definition-button` — save определения (или тот же save с kind; тогда этот testid на control kind=definition)
  - `notes-list` — список (moments + definitions)
  - `notes-export-word` — «В Word»
  - reuse: `book-cat` (если empty с котом)
- **Acceptance Criteria (DoD):**
  - [x] На TheoryLesson есть save theory; сохраняется текст карточки; mood idle|cheer; без нового звука/mood.
  - [x] Строки `term — meaning` (em/en dash) в theory-тексте подсвечены (`definition-highlight`, токены path-soft/path-ink); tap highlight или `save-definition-button` сохраняет definition через BE-010.
  - [x] `/notes` показывает moments и definitions; у definitions метка «Определение»; «разобраться» через note UI; «В Word» качает .docx (включая секцию определений на BE).
  - [x] Empty — PathNotice/empty + одна фраза, не фейковая тропа; sidebar «Заметки».
  - [x] `save-theory-button`, `definition-highlight`, `save-definition-button` (или kind), `notes-list`, `notes-export-word` (+ `book-cat` если кот) на месте.
  - [x] Нет рейтингов/лиг/магазина; PathNode / LessonRunner frozen; FE-008…011 не расширены; freeform secondary; нет параллельной notes-системы.

### [x] FE-010 · P1 · Личная карточка серии у тропы (без рейтинга)

- [ ] To Do
- [ ] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (Marketer desk 2026-09-29 21:40 + Developer «зачем остаться»; не P0 — видимость тропы уже FE-009)
- **QA (2026-09-29):** Verified — `/books/7a317ea5-…` grid beside `learning-path`: card strings «1 дн.» / «серия» / «XP сегодня» / «0 / 50» / «Серия жива — один спокойный шаг.»; testids `path-personal-card` / `path-personal-streak` / `book-cat`; no league/rank/share/shop; theme tokens only. Vitest `path-personal-card` (+ related) 3 files / 17 passed. New bugs: none. FE-011 untouched.
- **Статус (2026-09-29 Design):** Ready for QA — `PathPersonalCard` справа от тропы на `/books/[id]` (desktop column); серия + XP дня / `dailyGoalXp` из `getProfileData`; кот `idle`|`cheer` + одна строка; testids `path-personal-card` / `path-personal-streak` / `book-cat`. Без лиг/рейтинга/share. FE-008 / PathNode / LessonRunner не трогал. Vitest `path-personal-card` green. Verified только QA.
- **Зачем:** на `/books/[id]` человек сразу видит, зачем остаться. Там, где у референса блок лиги — у нас **личная** карточка прогресса: своя серия, XP за сегодня к дневной цели, одна спокойная строка Ученого Кота. Чужих имён, мест в списке, кнопок «к рейтингам» нет.
- **Что видит пользователь:** рядом с тропой (или в правой колонке на desktop, если layout это допускает без новой «лиги») — карточка: «N дн.» серии (уже в продукте), XP дня к существующей дневной цели, одна короткая строка кота на mood `idle` или `cheer` (без нового кадра). Нет рейтинга, шеринга, звуков, магазина.
- **Где:** `/books/[id]` рядом с `LearningPath`. Данные серии / XP дня — из уже существующих readers/stats (новая BE-карточка не нужна, пока Design не упрётся в отсутствие поля).
- **Компоненты:** тонкий блок рядом с тропой / шапкой книги; `BookCat`. **Не** расширять `FE-008` (zigzag / баннер / галочка / кот на узле). PathNode / props `LessonRunner` frozen. Schema/AI/actions не трогать.
- **BookCat mood:** только из пяти; на карточке — `idle` или `cheer` (без нового кадра).
- **Токены:** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.
- **Чего не делать:** лиги, рейтинг, «ты на N месте», share, OG, пиксели, SEO, Product Hunt, Telegram, магазин, звуки, новые mood, награда сердцем, покупка жизней. Не дублировать геометрию FE-008. Не переоткрывать RFC-001…004 / FE-009.
- **data-testid (новые ≤2 + reuse):**
  - новые: `path-personal-card` — корень личной карточки; `path-personal-streak` — серия «N дн.»
  - reuse: `book-cat`
- **Acceptance Criteria (DoD):**
  - [x] На `/books/[id]` видна личная карточка: серия + XP дня к дневной цели + одна строка кота на `idle`|`cheer`.
  - [x] Нет UI лиги / ранга / «места» / кнопок к рейтингам / share / звуков / магазина.
  - [x] FE-008 не расширен (геометрия тропы как есть); moods только из пяти; PathNode / LessonRunner frozen.
  - [x] `path-personal-card`, `path-personal-streak`, `book-cat` на месте.

### [x] FE-011 · P1 · Один набор фраз желания (тропа / пусто / нуль жизней)

- [ ] To Do
- [ ] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (Marketer desk 2026-09-29 21:40 + Developer «зачем остаться»)
- **QA (2026-09-29):** Verified — `/books/7a317ea5-…` one set: promise «Дочитай книгу короткими шагами.» + currentStep «Ты здесь. Один шаг — и день засчитан.» (`path-desire-copy`); sticky 0♥ (hearts already 0) «Жизни кончились — отдыхаем» + «Практика вернёт одну — или подожди около 4 часов. Покупки нет.»; streak card + path map intact; no league/share/shop. Empty PathNotice not on this book (has nodes) — `PATH_DESIRE.emptyPath` + vitest cover. OutOfHeartsModal uses same set (`lesson-out-of-hearts` in source; modal not open). PathNode / LessonRunner frozen; theme tokens. Vitest path-desire-copy + path-personal-card: 2 files / 8 passed. New bugs: none.
- **Статус (2026-09-29 Design):** Ready for QA — `PATH_DESIRE` в `src/lib/path-desire-copy.ts`: promise / emptyPath / currentStep / outOfHearts; wired в LearningPath (`path-desire-copy`), PathNotice empty, book header empty, OutOfHeartsModal + sticky zero-hearts. Moods idle|outOfHearts из пяти. FE-008 геометрию не расширял; PathNode / LessonRunner frozen. Vitest path-desire-copy green. Verified только QA.
- **Зачем:** один короткий набор ценностных фраз — обещание продукта, пустая тропа, текущий шаг, нуль жизней — одинаковый на тропе и в связанных пустых / нулевых состояниях той же книги. Позже те же формулировки можно вынести на лендинг без переписывания экранов. Это тексты в продукте, не кампания.
- **Что видит пользователь:** на `/books/[id]` и в empty/not-ready тропы, а также при нуле жизней в контексте этой книги — согласованные фразы из одного набора, без разных формулировок «на каждый экран».
- **Где:** copy на тропе (обещание / текущий шаг), `PathNotice` / empty (пустая тропа), `OutOfHeartsModal` / zero-hearts в контексте книги. Один модуль/набор констант в продукте — Design выбирает место файла, без schema/AI.
- **Компоненты:** `LearningPath` / page copy, `PathNotice`, zero-hearts UI (`OutOfHeartsModal`). **Не** менять геометрию FE-008. PathNode / LessonRunner frozen. Schema/AI/actions не трогать.
- **BookCat mood:** только из пяти; на нуле жизней — `outOfHearts` (как сейчас); на пустой тропе — `idle`; на текущем шаге — без нового кадра.
- **Токены:** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.
- **Чего не делать:** разные формулировки на каждой поверхности; соцсети, OG, пиксели, SEO, Product Hunt, Telegram; лиги, рейтинг, магазин, звуки; новые mood; переоткрывать RFC / FE-009 / расширять FE-008.
- **data-testid (reuse + ≤1 новый):**
  - reuse: `path-notice`, `lesson-out-of-hearts`, `learning-path`, `book-cat`
  - новый при необходимости: `path-desire-copy` — блок обещания / текущего шага на тропе
- **Acceptance Criteria (DoD):**
  - [x] Один набор: обещание, пустая тропа, текущий шаг, нуль жизней — одни формулировки на этих поверхностях.
  - [x] Нет размазанных разных copy «на каждый экран» для того же смысла.
  - [x] Нет share / OG / pixels / SEO / лиг / звуков / магазина; PathNode / LessonRunner frozen; FE-008 не расширен; moods только из пяти.
  - [x] Reuse testids (+ `path-desire-copy` если нужен) на месте.

### [x] FE-009 · P0 · Книга рисует пришедшие nodes; library ≡ `/books/[id]`

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (Developer desk 2026-09-29 21:22 / 21:23; факт: библиотека «На тропе» + 2%, страница книги «тропа не готова» + «Собрать тропу», узлов нет)
- **QA (2026-09-29):** Verified — `/books/[id]` draws arrived nodes (`learning-path` + `path-gate-ready`, 104 buttons); no «тропа не готова» / no «Собрать тропу»; header «2 из 104 шагов · следующий: Закрепление» + «26 глав · тропа 2%» matches library «На тропе» · «26 глав · 2%». Empty/rejected PathNotice covered by LearningPath `resolveGateStatus` + BE-009 tests. PathNode frozen; FE-008 not expanded. New bugs: none.
- **Зачем:** фронт **рисует то, что пришло** от Backend. Если `nodes.length > 0` — карта (`learning-path` / `path-gate-ready`), прогресс в шапке по `summarizePath(nodes)`. «Собрать тропу» только когда узлов нет (или явный rejected без узлов). Пустая карта и бейдж «На тропе» одновременно — **дефект** (после BE-009 не должно воспроизводиться; FE не маскирует и не противоречит props).
- **Сейчас (баг на странице):** `src/app/books/[id]/page.tsx` строит шапку/playable от `gate !== "approved"` (`тропа не готова`, progress по `[]`), даже когда Design `LearningPath` уже умеет показывать snake при `nodes.length > 0`. Библиотека смотрит `mastery` из `listBooks` независимо — расхождение copy.
- **Статус (2026-09-29 Design):** Ready for QA — page больше не обнуляет nodes при gate≠approved: `hasNodes` → progress/`summarizePath(path)` + без «тропа не готова»/без build CTA; empty pending/rejected → PathNotice + `build-path-button` (LearningPath уже так). Library badge не трогал (mastery из listBooks; FE не маскирует пустой reader). PathNode frozen.
- **Зависимость:** **BE-009** отдаёт stored nodes (не empty при живых rows / не-rejected). FE не выдумывает узлы и не ходит в schema/AI.
- **Где:** `src/app/books/[id]/page.tsx` (шапка, progress, copy not-ready), `LearningPath` / `PathNotice`, при необходимости бейдж на `src/app/books/page.tsx` только если copy расходится с тем же смыслом «есть узлы / прогресс» — **без** новых полей PathNode.
- **Поведение:**
  1. `nodes.length > 0` → показать карту; шапка с прогрессом по фактическим nodes; **без** «тропа не готова»; **без** `build-path-button` (или скрыта / disabled no-op — предпочтительно скрыта).
  2. `nodes.length === 0` + pending → PathNotice not-ready + «Собрать тропу».
  3. `nodes.length === 0` + rejected → PathNotice rejected + «Собрать тропу» допустима.
  4. Библиотека и книга: одно и то же сообщение о состоянии тропы (есть прогресс/узлы → не «не готова» на книге при «На тропе» в библиотеке).
- **Компоненты:** page book, `LearningPath`, `PathNotice`, `BookCat`. **Не** менять форму `PathNode` и props `LessonRunner`. Схему/actions/AI не трогать.
- **BookCat mood:** только из пяти; при карте с available — как сейчас (`cheer` ок); not-ready → `idle` / rejected fail → `wrong`.
- **Токены:** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.
- **data-testid (reuse, без расширения FE-008):**
  - reuse: `learning-path`, `path-notice`, `path-gate-pending`, `path-gate-rejected`, `path-gate-ready`, `build-path-button`, `book-cat`, `start-lesson-button`
  - новых testid **не** добавлять, если reuse покрывает DoD
- **Вне объёма:** FE-008 zigzag/polish (не расширять), RFC-004 длина главы (FE-007/BE-008), новый `nodeType`, PathNode / LessonRunner props, schema/AI.
- **Acceptance Criteria (DoD):**
  - [x] При `nodes.length > 0` на `/books/[id]` видна карта (`learning-path` / `path-gate-ready`); нет copy «тропа не готова»; нет кнопки «Собрать тропу».
  - [x] При `nodes.length === 0` — PathNotice + «Собрать тропу» (`build-path-button`); карта узлов не рисуется.
  - [x] Шапка книги считает прогресс по пришедшим `nodes` (тот же смысл, что mastery в библиотеке после BE-009).
  - [x] Кейс «бейдж На тропе / 2% в библиотеке + пустая not-ready карта на книге» закрыт (дефект).
  - [x] PathNode / props `LessonRunner` frozen; FE-008 не расширен; moods только из пяти; reuse testids.
- **Как задумано (Developer 21:40):** карта, если узлы есть и не rejected; «Собрать тропу» только без узлов; library и страница говорят одно. `FE-009` (`a76a0ad`) не ломать при пришедших узлах.

### [x] FE-008 · P1 · LearningPath: спокойный zigzag «как Duolingo-структура», без лиг/звуков

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (customer 2026-09-29 ~21:14 screenshot; polish поверх stored nodes; P0 остаётся persist/gate BE-006/007)
- **QA (2026-09-29):** Verified — browser: `path-unit-banner`×26, `path-current-node` + `book-cat` at available, 104 zigzag nodes, Теория/Спринт/Пары/Босс; no league/shop/sound copy; tokens path/reward.
- **Зачем:** `/books/[id]` должен ощущаться дружелюбным и «продаваемым»: спокойная страница, вертикальный zigzag крупных круглых узлов, много whitespace. Не рейтинги, лиги, sounds, shop, gems, competition. У каждого user свои книги. Не копировать брендинг Duolingo, зелёную сову и слова со скрина. Структура и теплота — да.
- **Сейчас:** zigzag уже есть (`translate-x` чередование), sticky CTA есть, BookCat сидит в шапке секции и снова в sticky-панели — не «you are here» у текущего узла. Completed = Star, не простой check. Нет unit-banner по `chapterTitle` и тихого divider между главами.
- **Где:** `src/components/book/LearningPath.tsx`, `BookCat`. Не трогать schema/actions/AI. Empty/not-ready — по-прежнему FE-006 `PathNotice`; эта карточка **не** заменяет gate UI.
- **Поведение (структура со скрина → наш продукт):**
  - Спокойный вертикальный zigzag крупных узлов + воздух по бокам (desktop width читается с одного взгляда: где я, что сделано, что дальше).
  - Completed = простой check в залитом круге (токены path/reward); mastered остаётся отличимым через **Crown** (без treasure chests / trophy-лиг).
  - Current available = очевиден (ring/soft fill); **BookCat** сидит у текущего available узла на тропе («you are here»), не в случайном углу шапки. Mood только `cheer` | `idle` у текущего узла (`cheer` если есть available, иначе `idle`). В sticky CTA кот может остаться как сейчас.
  - Короткий **unit banner** над отрезком тропы: `chapterTitle` главы (не leaderboard). Тихий горизонтальный divider между главами.
  - Tap node → select (как сейчас); sticky bottom CTA + `start-lesson-button` без регрессии.
  - Locked = тихо (muted/border), не punishing (без красного «карательного» lock-UI).
- **Компоненты:** `LearningPath`, `BookCat`. Framer Motion — только уже существующий `whileTap` / sticky fade; **без** нового тяжёлого motion, confetti, Web Audio, sound toggles.
- **BookCat mood:** только из пяти; на текущем available — `cheer`; иначе на path-mascot — `idle`. Новых кадров нет.
- **Токены:** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`. **Не** новая emerald/amber палитра и **не** хардкод Duolingo-green.
- **data-testid (reuse + ≤2 новых):**
  - reuse: `learning-path`, `book-cat`, `start-lesson-button`, `path-notice` (gate/empty остаётся FE-006)
  - новые (макс. 2):
    - `path-unit-banner` — баннер главы / отрезка
    - `path-current-node` — обёртка/маркер текущего available узла (где сидит маскот)
- **Вне объёма / запрещено на `/books/[id]`:** ratings, leagues, sounds, shop, gems, XP races, daily quests, right-rail «you placed Nth», treasure chests, trophies-as-leagues, confetti task, Web Audio, копирование бренда/совы/слов скрина. Не дублировать FE-006/FE-007. PathNode shape и props `LessonRunner` frozen.
- **Acceptance Criteria (DoD)** — friendly/sellable в словах пользователя:
  - [x] На desktop width тропа с одного взгляда: где я, что сделано (check), что дальше.
  - [x] BookCat на текущем available узле пути (`path-current-node` + `book-cat`), не в случайном углу.
  - [x] Unit banner с `chapterTitle` (`path-unit-banner`) и тихий divider между главами; без leaderboard-copy.
  - [x] Нет ratings / sounds / shop / league copy anywhere на `/books/[id]`.
  - [x] Locked узлы выглядят тихо, не punishing.
  - [x] Empty/not-ready по-прежнему FE-006 PathNotice; эта карточка его не заменяет.
  - [x] Токены path/reward; PathNode / LessonRunner props frozen; reuse testids + максимум `path-unit-banner` и `path-current-node`.
- **Статус (2026-09-29 Design):** Ready for QA — Duolingo-структура snake: круглые узлы zigzag, check/crown, BookCat у `path-current-node`, slim `path-unit-banner` по chapterTitle; без лиг/звуков/sidebar. Sticky CTA сохранён. PathNode frozen.
- **Как задумано (Developer 21:40):** личная карта — спокойный зигзаг, баннер главы, галочка на пройденном, кот на текущем; нет лиг, рейтинга, магазина, звуков, соревнований. Карточку **не расширять** и не дублировать; FE-010/011 — рядом, не внутри геометрии.

### [x] FE-007 · P1 · RFC-004: карта рисует 2 или 4 узла как отдал Backend

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (RFC-004; после/рядом с BE-008; не путать с FE-006 gate)
- **QA (2026-09-29):** Verified — `LearningPath` maps `PathNode[]` as-is; labels Теория/Спринт/Пары/Босс; browser `2 из 104 шагов` + 104 node buttons (all long chapters); short 2-node UI covered by BE-008 vitest (no short chapter in live book).
- **Зачем:** на `/books/[id]` короткой содержательной главе видны теория и спринт; длинной — ещё пары и босс. Фронт **не** выдумывает узлы и **не** хардкодит «4 на главу»: рисует столько кружков, сколько пришло в `PathNode[]`. Подписи типов те же. Прогресс в шапке — `summarizePath` по фактическим узлам. Thin theory-only (FE-004) не отменять.
- **Где:** `LearningPath`, progress hero на `src/app/books/[id]/page.tsx`, лейблы `nodeType` (Теория / Спринт / Пары / Босс). Урок: существующих props `LessonRunner` / `TheoryLesson` достаточно.
- **Поведение:**
  - Short (Backend отдал 2 узла главы): на карте два шага с лейблами Теория + Спринт; без фейковых Пары/Босс.
  - Long (4 узла): прежний порядок и те же лейблы, включая Пары и Босс.
  - Шапка: «N из M шагов» где M = длина playable path (факт), не `chapters × 4`.
  - Thin (1 узел) — как FE-004; FE-006 not-ready — без узлов, не смешивать с RFC-004.
- **Компоненты:** `LearningPath`, page progress; **не** менять форму `PathNode` и props `LessonRunner`. Схему/порог длины / AI не трогать (BE-008).
- **BookCat mood:** только из пяти; новых кадров нет.
- **Токены:** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.
- **data-testid (reuse, без новых типов узлов):**
  - `learning-path` — число дочерних шагов = ответ Backend
  - `path-notice` / `book-cat` / `start-lesson-button` — без регрессии
  - при необходимости assert по уже существующим лейблам типов на узлах (не плодить `node-type-*`, если уже читается из UI)
- **Вне объёма:** новый `nodeType`, ручной редактор, лимит «первые 8 глав», PathNode/LessonRunner props, gate UI (FE-006), отмена FE-004.
- **Acceptance Criteria (DoD)** — из ожиданий пользователя RFC-004:
  - [x] Короткая глава на тропе показывает теорию и спринт (2 узла Backend → 2 шага UI).
  - [x] Длинная глава дополнительно показывает пары и босса (4 узла → 4 шага).
  - [x] Подписи типов узлов на карте те же (Теория / Спринт / Пары / Босс).
  - [x] Прогресс «N из M» считается по фактическому числу узлов тропы.
  - [x] UI не дорисовывает узлы сверх ответа Backend; повторная сборка не показывает дубли на карте (данные с BE-008).
  - [x] PathNode / props `LessonRunner` frozen; FE-004 thin theory-only не сломан.
- **Статус (2026-09-29 Design):** Ready for QA — `LearningPath` maps `PathNode[]` as-is (no pad to 4); labels Теория/Спринт/Пары/Босс; progress via `summarizePath` on actual length. PathNode frozen.
- **Как задумано (Developer 21:40):** short ≤2 мин → теория+спринт; long → четыре узла; thin → теория; UI рисует столько шагов, сколько пришло. Не переоткрывать RFC-004.

### [x] FE-006 · P0 · UI: тропа не готова / gate pending|rejected|approved

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (customer 2026-09-29 ~21:04; после BE-006/BE-007)
- **QA (2026-09-29):** Verified — earlier pending: PathNotice + `build-path-button`, no fake nodes; approved: `path-gate-ready` + `learning-path` from stored nodes; no SSR auto-build.
- **Зачем:** пока гейт не `approved`, пользователь не видит фейковые/partial узлы и не крутит спиннер, который на каждом заходе снова запускает генерацию. Not-ready ≠ «сломанная пустая тропа». После `approved` — существующий `LearningPath` из **сохранённых** nodes.
- **Где:** `src/app/books/[id]/page.tsx`, `src/components/book/LearningPath.tsx`, `PathNotice`, `BookCat`. Страница **не** должна сама на SSR триггерить сборку (Backend убирает `ensureFullLearningPath` с read — FE не возвращает скрытый auto-build).
- **Поведение:**
  - **pending / rejected / not-ready:** `PathNotice` + `BookCat` mood `idle` (при явной ошибке сборки — `wrong`); **без** кружков узлов; **без** spinner/navigation loop, который зовёт AI. Copy: тропа ещё не готова / не прошла контроль (не «ошибка загрузки списка»).
  - **Явная сборка:** одна кнопка «Собрать тропу» (`build-path-button` уже есть) → `buildLearningPath`; если Backend вернул approved+nodes — refresh показывает тропу. Если approved path уже есть — кнопка **не** перезапускает генерацию (no-op / скрыта).
  - **approved:** существующий `LearningPath` + nodes из props; **без** новых полей `PathNode`.
- **Компоненты:** `LearningPath`, `PathNotice`, `BookCat`; page передаёт availability status от Backend (отдельный prop/DTO, **не** поле PathNode). Props `LessonRunner` frozen.
- **BookCat mood:** только `idle` | `correct` | `wrong` | `outOfHearts` | `cheer`. Pending → `idle`; fail сборки → `wrong`; approved с available шагом — как сейчас (`cheer` ок).
- **Токены:** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.
- **data-testid (reuse + новые только для gate):**
  - reuse: `book-cat`, `learning-path`, `path-notice`, `start-lesson-button`, `got-it-button`, `build-path-button`
  - новые (gate UI):
    - `path-gate-pending` — состояние ожидания / сборки ещё нет или идёт контроль
    - `path-gate-rejected` — контроль не пройден / тропа недоступна
    - `path-gate-ready` — оболочка/маркер когда approved и видна playable тропа (рядом с `learning-path`)
- **Вне объёма:** схема, AI, сердца, смена PathNode / LessonRunner props, RFC-004, новые mood.
- **Acceptance Criteria (DoD):**
  - [x] pending/rejected: PathNotice + idle (или wrong при ошибке), нет fake nodes, нет auto-regen на каждый заход.
  - [x] «Собрать тропу» один явный action; при уже approved — не перегенерирует.
  - [x] approved: `learning-path` из stored nodes; PathNode без новых полей.
  - [x] На месте `path-gate-pending` / `path-gate-rejected` / `path-gate-ready` + reuse testids; moods только из пяти.
  - [x] Пустой not-ready не выглядит как broken empty path без copy.
- **Статус (2026-09-29 Design):** Ready for QA — re-read queue; gate UI already in `LearningPath` + book page (no SSR auto-build); pending/rejected PathNotice + testids; approved `learning-path`/`path-gate-ready`. PathNode frozen. Verified только QA.

## Готово (Ready for QA — Verified не ставить без QA)

### [x] FE-005 · P0 · UI: жизни только на первом проходе (RFC-003)

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (RFC-003)
- **Зачем:** на экране видно: miss на новом узле −1 сердце + mood `wrong`; при 0 на новом упражнении — `outOfHearts` + модалка/пауза (practice, таймер 4ч). Miss на повторе уже `completed`/`mastered` или due на `/today/session` — сердца не мигают вниз, `outOfHearts` **не** из-за этого miss; кот `wrong`, FSRS Again (BE-002/BE-005). Теория без жизней.
- **Где:** `LessonRunner` (спринт / пары / босс), `/today/session` при due-карточках. Сейчас: `isDueReview = mode==="lesson" && !nodeId` уже пропускает сердца на due; replay пройденного узла **с** `nodeId` всё ещё делает `playHeartLoss` + `decrementHeart` — поправить опираясь на ответ BE-005 (`charged` / неизменённый `HeartStatus`), **без** новых props `LessonRunner` и без смены `PathNode`. Статуса прогресса на клиенте нет (`generateLessonContentOnFly` progress не отдаёт) — **зависимость: BE-005**.
- **Компоненты:** `LessonRunner` (`src/components/lesson/LessonRunner.tsx`), `OutOfHeartsModal`, `BookCat`, индикатор сердец в раннере; страница `src/app/today/session/page.tsx` (поведение due без регрессии). Shadcn: `Button` (уже). Framer Motion: flash/crack анимации сердец — только когда сердце **реально** снято.
- **BookCat mood:** miss → `wrong`; при `hearts === 0` после miss на **новом** упражнении → `outOfHearts`. Replay-miss (не charged) — остаётся `wrong`, **не** переключать в `outOfHearts` только из-за miss. `cheer` в конце сессии — без изменений.
- **Интерактив:** выбор / drag пар и порядка как сейчас; звук потери сердца и crack-анимация — только при `charged === true` (или сердца уменьшились). Покупка жизней не появляется.
- **Токены:** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`; destructive для wrong flash — ок.
- **data-testid (обязательны, стабильные):**
  - `lesson-hearts` — блок/контроль сердец в `LessonRunner`
  - `lesson-hearts-count` — число текущих сердец (для assert «не изменилось»)
  - `lesson-miss-feedback` — пояснение / flash после неверного ответа
  - `lesson-out-of-hearts` — состояние / оболочка нуля жизней (модалка или gate), видимо только когда пауза из-за 0 на новом упражнении
  - `book-cat` — корень маскота (mood читается тестом через атрибут/класс уже принятый в UI; не плодить восьмой mood)
- **Вне объёма:** схема, AI, покупка сердец, max ≠ 5, RFC-004, новые mood, смена props `LessonRunner` / `PathNode`.
- **Acceptance Criteria (DoD):**
  - [x] Первый проход (`available`): miss → −1 на `lesson-hearts-count`, видны `lesson-miss-feedback` + mood `wrong`.
  - [x] Replay `completed`/`mastered` (с `nodeId`) или due `/today/session`: miss → `lesson-hearts-count` без изменений; `lesson-out-of-hearts` не открывается из этого miss; Again уходит на Backend.
  - [x] 0 сердец на новом упражнении → `lesson-out-of-hearts` + mood `outOfHearts`; practice / 4h без покупки.
  - [x] Все перечисленные `data-testid` на месте и стабильны.
  - [x] PathNode / props `LessonRunner` frozen; theory без жизней.
- **Design note (2026-09-29 21:05):** miss с `nodeId` → `applyLessonMiss` (`charged`); due → только `recordLessonAnswer(false)`. Crack/heart/`outOfHearts` только при `charged: true`. Props frozen. FE-004 не трогал.
- **Статус (2026-09-29 fix pass):** DoD still met after re-read. BUG-001 closed (server `charged` gate). FE-005 testids present. Ready for QA.
- **QA (2026-09-29):** Verified — browser: available miss `lesson-hearts-count` 4→3 + `lesson-miss-feedback` + `book-cat` mood `wrong`; completed replay miss hearts stayed 3, no `lesson-out-of-hearts`. Due session not live (dueCount=0). Out-of-hearts not drained (skipped). testids present.

### [x] FE-004 · P1 · Theory-only глава и пустые cards практики

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (после BE-004 / стык с BE-003 `cards: []`)
- **Статус (2026-09-29 21:05):** Ready for QA — theory-only copy без «дальше практика»; empty cards → `practice-empty-notice` до hearts-gate; `learning-path` / `theory-complete-message` / path-notice testids; localhost:3000 был down.
- **QA (2026-09-29):** Still Ready for QA — browser confirmed `learning-path` (104 steps). Theory-only complete copy and `practice-empty-notice` not reachable in live book (no thin/empty practice). Code matches DoD; no defect; leave Ready until thin/empty exercised.
- **QA (2026-09-29):** Verified / Done — DoD proved by code + `npm test -- src/lib/theory-practice-ui.test.ts` (6 passed). Theory-only copy without practice CTA; empty `cards` → `practice-empty-notice`; thin path step count = Backend nodes; required testids present. Browser: live DB has no thin chapter (26×4 nodes) / no empty practice — theory-only screen not reached; not a defect.
- **Зачем:** `LearningPath` уже рисует сколько узлов пришло — лишние шаги не выдумывать. Но `TheoryLesson` (`src/components/lesson/TheoryLesson.tsx`) после «Понятно» пишет «Дальше — практика на тропе» — ложный CTA на theory-only главе. `LessonRunner` при `cards.length === 0` (BE-003: grounding drop / AI fail) не должен ломаться молча.
- **Компоненты:** `TheoryLesson`, страница `src/app/books/[id]/lesson/[nodeId]/page.tsx`, при необходимости `PathNotice` / `LearningPath` (только копирайт empty). **Не** менять форму `PathNode` и props `LessonRunner` (можно нейтральный copy внутри TheoryLesson без новых LessonRunner props; если нужен флаг «есть практика дальше» — взять из уже доступных узлов тропы на странице / server props TheoryLesson, не трогая LessonRunner).
- **Поведение:**
  - Theory-only (глава = один `summary_read`): после завершения — нейтральный текст вроде «Готово. Вернись на тропу», **без** обещания спринта/босса. Mood: `idle` на короткой главе; `cheer` только после успешного complete — ок. Новых кадров маскота нет.
  - Практика с `cards: []`: PathNotice mood `idle` (или `wrong` только если явная ошибка), CTA «К тропе», без confetti/audio task.
  - Тропа: сколько узлов Backend отдал — столько кружков; не дорисовывать 4 шага.
- **Токены:** `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.
- **data-testid (обязательны):**
  - `theory-complete-message` — финальный текст после «Понятно» (theory-only vs «дальше практика»)
  - `practice-empty-notice` — PathNotice / empty при `cards: []`
  - `learning-path` — корень тропы (число узлов = ответ Backend)
  - `path-notice` — общий notice, если используется
- **Вне объёма:** схема, AI, actions, сердца, confetti/Web Audio как отдельная задача, новые mood.
- **Acceptance Criteria (DoD):**
  - [x] Theory-only: нет копирайта «дальше практика», если practice-узлов у главы нет; есть `theory-complete-message`.
  - [x] Пустой `cards` на practice-node → `practice-empty-notice` + к тропе, не blank/crash.
  - [x] Тропа (`learning-path`) рендерит 1 узел thin-главы без фейковых шагов.
  - [x] Mood только из пяти существующих; PathNode / LessonRunner props frozen.
  - [x] Перечисленные `data-testid` на месте.

### [x] FE-001 · P0 · Панель `/` — продолжение книги, не список заметок

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (RFC-001)
- **Статус (2026-09-29 19:43, design-desk):** `/` → `getTodayPanel` + `TodayPanel`; CTA «Продолжить» → `/today/session`; idle-кот; заметки вторичной ссылкой на `/notes`; список заметок убран. Developer browser-check 20:53 ≠ QA.
- **QA (2026-09-29):** Not Verified — UX wiring OK by code review; DoD `data-testid` missing → **BUG-002**, **BUG-003**.
- **Статус (2026-09-29 fix pass):** DoD testids present (`today-panel`, `today-continue-cta`, `today-due-count`, `book-cat`). BUG-002/003 fixed. Ready for QA; Verified только QA.
- **QA (2026-09-29 browser):** Verified — `/` shows active book + «Продолжить», notes secondary; CDP: `today-panel`, `today-continue-cta`, `today-due-count=0`, `book-cat` mood `idle`.
- **data-testid (для автотестов / добить если нет):**
  - `today-panel`
  - `today-continue-cta`
  - `today-due-count`
  - `book-cat`
- **Acceptance Criteria (DoD):**
  - [x] `/` показывает активную книгу и CTA «Продолжить», не список заметок.
  - [x] Idle-кот; заметки только вторичной ссылкой.
  - [x] На месте `data-testid`: `today-panel`, `today-continue-cta`, `today-due-count`, `book-cat`.
  - [x] QA: Verified только после приёмки QA.

### [x] FE-003 · P1 · «Продолжить» = короткая сессия (повтор → новый шаг)

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P1 (RFC-001)
- **Статус (2026-09-29 19:43):** `/today/session` — `listBookDueCards` → `LessonRunner` mode=lesson (сердца+FSRS); due=0 → redirect nextNode или pause+cheer; после повтора «Дальше» → available без новых props (`bookId` path-encode). Developer browser-check ≠ QA.
- **QA (2026-09-29):** Not Verified — session flow OK by code review; DoD `data-testid` missing → **BUG-002**, **BUG-003**. Note: lesson page currently passes extra `heartsCharged` prop (FE-005 WIP / props freeze risk) — **BUG-001**.
- **Статус (2026-09-29 fix pass):** DoD testids present (`today-session`, `today-session-banner`, `lesson-runner`, `book-cat`). `heartsCharged` prop removed; BUG-001/002/003 fixed. Ready for QA.
- **QA (2026-09-29 browser):** Verified — dueCount=0 → `/today/session` redirected to next available lesson (`lesson-runner` live). Due>0 banner path not exercised (no due cards). Props frozen in code.
- **data-testid (для автотестов / добить если нет):**
  - `today-session`
  - `today-session-banner`
  - `lesson-runner`
  - `book-cat`
- **Acceptance Criteria (DoD):**
  - [x] Due > 0 → LessonRunner на due; due = 0 + nextNode → урок; без next → PathNotice.
  - [x] Props `LessonRunner` без новых полей; path-encode `bookId` для «Дальше».
  - [x] На месте `data-testid`: `today-session`, `today-session-banner`, `lesson-runner`, `book-cat`.
  - [x] QA: Verified только после приёмки QA.

### [x] FE-002 · P0 · Ответ в LessonRunner планирует карточку (Good / Again)

- [ ] To Do
- [x] Ready for QA
- [x] Verified / Done
- [x] **Критичность:** P0 (RFC-002)
- **Статус (2026-09-29 20:10):** `mode="lesson"` → `recordLessonAnswer(id, true|false)`; сердца / `completeLessonNode` / props без изменений; шкалу не показываю. Developer browser-check ≠ QA.
- **QA (2026-09-29):** Not Verified — `recordLessonAnswer` wiring present; DoD `data-testid` missing (**BUG-002**). Miss/heart branch currently broken (**BUG-001**) — FSRS Again still called on the no-charge branch.
- **Статус (2026-09-29 fix pass):** DoD testids present (`lesson-runner`, `lesson-answer-correct`, `lesson-answer-wrong`, `lesson-miss-feedback`). Miss → `applyLessonMiss`. Ready for QA.
- **QA (2026-09-29 browser):** Verified — wrong answer shows `lesson-miss-feedback` / `lesson-answer-wrong` via `applyLessonMiss` (Again); correct path `recordLessonAnswer(true)` confirmed in code; no interval UI; props frozen.
- **data-testid (для автотестов / добить если нет):**
  - `lesson-runner`
  - `lesson-answer-correct`
  - `lesson-answer-wrong`
  - `lesson-miss-feedback`
- **Acceptance Criteria (DoD):**
  - [x] Верный/неверный ответ в lesson mode вызывает Good/Again (`recordLessonAnswer`).
  - [x] Интервал на экране не показывается; props frozen.
  - [x] На месте `data-testid`: `lesson-runner`, `lesson-answer-correct`, `lesson-answer-wrong`, `lesson-miss-feedback`.
  - [x] QA: Verified только после приёмки QA.

## Справочник (не задачи)

- Уже в UI: `button`, `card`, `dialog`, `input`, `textarea`, `badge`, `separator`, `command` в `src/components/ui/`. Анимация — Framer Motion.
- Маскот `BookCat` (`src/components/mascot/BookCat.tsx`). В коде пять mood, не восемь: `idle`, `correct`, `wrong`, `outOfHearts`, `cheer`. Кадры: `public/mascot/idle.png`, `correct.png`, `wrong.png`, `out-of-hearts.png`, `cheer.png`. Задача называет один из этих пяти. Новый кадр — только отдельной карточкой после ответа Developer.
- Интерактив, который уже есть: выбор варианта, drag пар и порядка в уроке. Звук Web Audio и конфетти в задачу писать только если Developer это попросил.
- Автотесты: стабильные `data-testid` обязательны в Acceptance Criteria каждой FE-карточки.
- Не ломать: `PathNode`, props `LessonRunner`, токены `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`. Схему, actions и AI не трогать.
