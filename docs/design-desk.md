# Design desk — LIVE

**Кто:** агент Design и Frontend (этот чат). Пиши сюда статус; Backend и аналитик читают **на каждом шаге**.

Обновлено: 2026-09-29 ~22:10 UTC+3

## Иерархия

Шаг **7** в org chart (после Developer → Marketer → Analyst → AI/BE/DevOpsSec). Беру работу **только** из `.cursor/tasks/frontend-tasks.md`. Scope не беру напрямую из `developer-desk` / `marketer-desk`. **Verified / Done** не ставлю (это QA). Не меняю `PathNode`, schema, actions, AI. `BookCat.tsx` / кадры маскота — другой агент.

## Цель

Доработка приложения. Активна. Слежу за своими файлами. Чужие доски и backend-очередь только читаю.

## Зона ответственности

Пишу и проверяю:

- `docs/design-desk.md`
- `.cursor/tasks/frontend-tasks.md` — статусы карточки + одна status-строка; карточки целиком не переписываю
- `src/components/**`
- `src/app/**/*.tsx` (экраны и клиентский UI, не `src/app/actions/**`)
- `src/app/globals.css`
- `public/mascot/**`

Только читаю: `docs/developer-desk.md`, `docs/analyst-desk.md`, `docs/backend-desk.md`, `.cursor/tasks/backend-tasks.md`, `.cursor/tasks/backlog.md`, `.cursor/tasks/qa-bugs.md` (если есть).

Не трогаю: `src/db/**`, `src/app/actions/**`, `src/lib/ai/**`, форму `PathNode`, `src/lib/data.ts`.

## Роль

Кроме UX и контракта `PathNode` этот агент пишет фронтенд: страницы, компоненты, вёрстка, клиентское состояние. Схему, actions, парсеры и AI не трогает.

## Конвенции (держать)

### Статус FE-карточки
После своей проверки DoD: в `.cursor/tasks/frontend-tasks.md` отметить **Ready for QA** (`[x] Ready for QA` + status-строка). **Verified / Done** ставит только QA.

### `data-testid` (kebab-case, стабильные)
На интерактиве урока/тропы/today (не кипятить весь auth/notes):

| testid | Где |
|--------|-----|
| `book-cat` | обёртка маскота (`BookCat`) |
| `hearts-indicator` / `lesson-hearts` / `lesson-hearts-count` | сердца (шапка / LessonRunner) |
| `answer-option` / `answer-input` | варианты ответа / fill_blank |
| `check-button` | «Проверить» |
| `continue-button` / `today-continue-cta` | «Дальше» / «Продолжить» |
| `got-it-button` | теория «Понятно» |
| `start-lesson-button` | CTA старта на тропе |
| `practice-button` | OutOfHearts / path practice |
| `theory-complete-message` | финал TheoryLesson |
| `practice-empty-notice` | пустые practice cards |
| `learning-path` / `path-notice` | тропа / notice |
| `path-gate-pending` / `path-gate-rejected` / `path-gate-ready` | FE-006 gate |
| `path-unit-banner` / `path-current-node` | FE-008 unit label / current node |
| `path-personal-card` / `path-personal-streak` | FE-010 личная карточка у тропы |
| `path-desire-copy` | FE-011 обещание / текущий шаг на тропе |
| `build-path-button` | явная сборка тропы |
| `save-theory-button` / `definition-highlight` / `save-definition-button` | FE-012 теория / определения |
| `notes-list` / `notes-export-word` | FE-012 список заметок / «В Word» |
| `today-panel` / `today-due-count` / `today-session` / `today-session-banner` / `lesson-runner` | today + runner |

Карточка FE может требовать дополнительные id — выполнять DoD карточки.

### QA bugs
Читать `.cursor/tasks/qa-bugs.md` если есть. Чинить только дефекты с тегом **[Frontend]**. Остальные не трогать. Фиксы кратко здесь.

## Сейчас от Design

**2026-09-29 ~22:15 — BookCat blink:** idle lids `scaleY` from eye top (`originY: 0` / `transform-origin: center top`), not pupil center. Goal not closed.

**2026-09-29 ~22:10 — queue empty:** FE-001…FE-012 все Ready for QA / Verified; open To Do карточек нет. Product code не трогал. Cursor goal не закрываю.

**2026-09-29 ~22:10 — BookCat SVG parts:** `BookCat` = inline geometric SVG (huge head/eyes matching idle.png) + Framer Motion breathe/blink/tail/hop/shake; no PNG frame-flip. Goal not closed.

**2026-09-29 ~22:00 — BookCat idle cycle:** coherent 6-frame idle (same cat, blink/breath only) at ~6 fps; other moods stay single stickers. Goal not closed.

**2026-09-29 ~21:55 — kawaii emblem:** `public/brand/emblem.png` — big anime/chibi orange cat face + mortarboard (transparent); sidebar Emblem 64px. Goal not closed.

**2026-09-29 ~23:10 — BookCat kawaii frames:** regenerated sheets as няшный anime sticker (sparkle eyes, blush, chibi) → `public/mascot/frames/{idle×6,cheer×4,wrong×3,out×4}`; `BookCat` rAF PNG playback; emblem untouched. Goal not closed.

**2026-09-29 ~22:55 — FE-012 smoke:** localhost `/notes` empty → PathNotice + `notes-export-word` + `book-cat` idle; theory lesson save → «В заметках»; `/notes` list + «Момент» + book title. Vitest theory-definitions/practice-ui 10/10. Direct `saveDefinition` import. Ready for QA already; Verified только QA. Cursor goal не закрываю.

**2026-09-29 ~22:50 — BookCat sticker PNGs:** `BookCat` снова `img` from `public/mascot/{idle,correct,cheer,wrong,out-of-hearts}.png` + Framer Motion на всём кадре (float / hop / shake); SVG-лицо убрано. Goal not closed.

**2026-09-29 ~22:20 — FE-012 Ready for QA:** TheoryLesson — «В заметки» на каждой карточке (`saveTheoryMoment`); строки `term —/– meaning` → highlight + «Определение» → `saveDefinition` (имя BE-010; actions не трогал). `/notes` — список moments/definitions, «В Word» → `/api/notes/export`, empty PathNotice. NoteEditor: «разобрался» для theory/definition. PathNode/LessonRunner frozen. Cursor goal не закрываю.

**2026-09-29 ~21:45 — SVG BookCat:** PNG swap → inline scholar-cat SVG + Framer Motion parts; browser `/` idle breathe/blink/tail confirmed (no `img`). Goal not closed.

**2026-09-29 ~22:10 — FE-011 verify pass:** browser `/books/7a317ea5-…` — `path-desire-copy` shows «Дочитай книгу короткими шагами.» + «Ты здесь. Один шаг — и день засчитан.»; sticky 0♥ «Жизни кончились — отдыхаем» + detail; `path-personal-card` «1 дн.» / «Серия жива…» intact; path map 104 nodes. Header progress restored to «2 из 104 · следующий: Закрепление». Vitest path-desire-copy 4/4. Ready for QA (not Verified). Goal not closed.

**2026-09-29 ~22:05 — FE-011 Ready for QA:** один набор `PATH_DESIRE` (`promise` / `emptyPath` / `currentStep` / `outOfHearts`) в `src/lib/path-desire-copy.ts`. На тропе — `path-desire-copy` (обещание + текущий шаг); empty PathNotice + шапка книги — `emptyPath`; `OutOfHeartsModal` и sticky при 0 жизней — `outOfHearts` («Жизни кончились — отдыхаем»). Moods idle|outOfHearts из пяти. FE-008 не расширял; PathNode / LessonRunner frozen.

**2026-09-29 ~21:55 — FE-010 Ready for QA:** на `/books/[id]` рядом с `LearningPath` — `PathPersonalCard` (серия «N дн.», XP дня / цель, кот idle|cheer + одна строка). Данные из `getProfileData`. Testids: `path-personal-card`, `path-personal-streak`, `book-cat`. FE-008 геометрию не трогал; PathNode / LessonRunner frozen; без лиг/рейтинга/share. Cursor goal не закрываю.

**2026-09-29 ~21:30 — queue empty:** FE-001…FE-009 все Ready for QA / Verified; open [Frontend] bugs нет. Product code не трогал. Cursor goal не закрываю.

**2026-09-29 ~21:27 — library cards:** `/books` BookCard — title/author, single-line status (`whitespace-nowrap shrink-0`, «На тропе»), thin progress + `N глав · %`; `data-testid` book-card/book-status; no LearningPath/sidebar/auth edits.

**2026-09-29 ~21:26 — brand copy:** visible name `Учёный кот`, tagline `Учись легко` (sidebar/shell/auth/Emblem alt + layout metadata); `data-testid="app-emblem"` kept; LearningPath / PathNode / actions untouched.

**2026-09-29 ~21:35 — FE-009 Ready for QA:** `/books/[id]` больше не обнуляет `playable` при `gate !== "approved"`. Если `nodes.length > 0` — шапка с `summarizePath(path)`, без «тропа не готова», без build CTA; LearningPath уже показывает snake/`path-gate-ready`. Empty pending/rejected — PathNotice + `build-path-button` как раньше. Library badge не менял (не маскирую пустой reader фейковыми узлами). PathNode / LessonRunner frozen; FE-008 не трогал.

**2026-09-29 ~21:30 — brand chrome:** scholar-cat emblem at `public/brand/emblem.png` via `Emblem` (`src/components/brand/Emblem.tsx`); Compass removed from sidebar, mobile shell header, and auth brand; logo links use `data-testid="app-emblem"`; shell warmed with paper/`path` tokens (soft paper bg, path-green active nav, rounded-2xl items) — no leagues/rankings/sounds. LearningPath / PathNode / exercises untouched.

**2026-09-29 ~21:25 — gate UI: stored nodes (`nodes.length > 0`) always show snake + `path-gate-ready` even if `pathStatus` is pending; empty PathNotice only when zero nodes.**

### Визуальное решение тропы (customer screenshot → наш продукт)
- **Структура как Duolingo snake**, не копия бренда: вертикальный zigzag крупных **круглых** узлов, воздух по бокам.
- **Без** лиг / rankings / daily quests / правой колонки соревнования / treasure chests / новых sounds. У каждого user свои книги — не конкуренция.
- Completed = залитый `bg-path` + **Check**; mastered = **Crown** + `bg-reward`; locked = muted + lock (тихо).
- Current available = крупнее + ring; **BookCat** (`cheer`) сидит справа у `path-current-node` («you are here»). Mood только из пяти.
- Главы: slim `path-unit-banner` с `chapterTitle` + тихий divider — **не** зелёный guidebook bar.
- Sticky detail panel + `start-lesson-button` сохранены. Токены path/reward/muted.
- FE-007: рисуем ровно `PathNode[]` от Backend (2 или 4 на главу — как пришло); progress = `summarizePath` по факту.

### Frontend QA bugs (из `qa-bugs.md`)
- **BUG-001…003** — Fixed; open [Frontend] нет.

- **FE-009 [x] Ready for QA**
- **FE-008 [x] Ready for QA**
- **FE-007 [x] Ready for QA**
- **FE-006 [x] Ready for QA** (ждёт Verified от QA)
- **FE-001…FE-005** — Verified / Done (QA)
- `PathNode` / props `LessonRunner` — **frozen**
- data/actions/schema/AI — не трогал
- Cursor product-wide goal **не** закрываю
- **Browser (2026-09-29):** session ok на `localhost:3000`; книга открылась; `path_status=pending` → FE-006 PathNotice + `build-path-button` (snake скрыт по гейту). Узлы в БД есть (104), но approved нет — визуальный snake+cat на current node в живой сессии не подтверждён. Login не блокировал.

## Контракт (заморожен)

`PathNode` — без изменений.  
`status`: `locked` | `available` | `completed` | `mastered`  
`nodeType` лейблы: Теория / Спринт / Пары / Босс / Практика  
Старт упражнений: `hearts >= 1` на **первом** проходе. Replay completed/mastered — без штрафа (`charged: false`). Теория (`summary_read`) — без жизней.

Цвета тропы: `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.

Gate availability (отдельный prop/DTO книги, не PathNode): `pending` | `approved` | `rejected`.

## QA bugs

- Open [Frontend] — нет.

## Backend уже заявил

- BE-003: practice AI fail / ungrounded → `cards: []`, `ok: true`
- BE-004: thin chapter → один `summary_read`
- BE-005 Ready for QA → FE-005 Ready for QA
- BE-006 / BE-007 ещё To Do — `path_status` reader в desk пока нет; FE-006 читает optional `pathStatus` / infer
- RFC-004 / BE-008: короткая глава 2 узла, длинная 4 — FE рисует как пришло

## Нужно от Backend

`path_status` / `getBookPathAvailability` (BE-006/007): когда появится на `book` или отдельным DTO — page уже умеет прокинуть `pathStatus` в `LearningPath`. Пока infer по `nodes.length`.

## Очередь Design

- Open **To Do** — нет (FE-001…FE-012 Ready for QA / Verified)
- open [Frontend] bugs нет
- Cursor product-wide goal не закрываю

## Маскот

**2026-09-29 ~21:45 — SVG scholar cat:** `BookCat` — inline SVG + Framer Motion по частям (breathe/blink/tail/hop/shake/tear); moods idle|correct|wrong|outOfHearts|cheer; `data-testid="book-cat"`; PNG в `public/mascot` не используются. Cursor goal не закрываю.
