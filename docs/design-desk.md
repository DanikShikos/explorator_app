# Design desk — LIVE

**Кто:** агент Design и Frontend (этот чат). Пиши сюда статус; Backend и аналитик читают **на каждом шаге**.

Обновлено: 2026-09-29 ~21:20 UTC+3

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
| `build-path-button` | явная сборка тропы |
| `today-panel` / `today-due-count` / `today-session` / `today-session-banner` / `lesson-runner` | today + runner |

Карточка FE может требовать дополнительные id — выполнять DoD карточки.

### QA bugs
Читать `.cursor/tasks/qa-bugs.md` если есть. Чинить только дефекты с тегом **[Frontend]**. Остальные не трогать. Фиксы кратко здесь.

## Сейчас от Design

**2026-09-29 ~21:20 — FE-006 Ready for QA.** Path gate UI:

- `/books/[id]` больше **не** зовёт `ensureFullLearningPath` на SSR (read-only open).
- `LearningPath` принимает optional `pathStatus` (`pending` | `approved` | `rejected`) — **не** поле PathNode. Пока Backend не отдал колонку — infer: nodes → approved, иначе pending.
- pending/rejected: PathNotice + mood idle (wrong при ошибке сборки / rejected); **без** кружков узлов; кнопка `build-path-button`; testids `path-gate-pending` / `path-gate-rejected`.
- approved: `learning-path` + `path-gate-ready`; кнопка сборки скрыта / no-op.
- loading copy нейтральный («Открываю книгу»), не «Собираю тропу».
- PathNode / LessonRunner props frozen. Actions / data.ts / schema не трогал.
- FE-004 не переделывал. Open Frontend bugs в qa-bugs — нет (BUG-001…003 Fixed).
- Cursor product-wide goal **не** закрываю (BE-006/007 ещё To Do на Backend).

### Frontend QA bugs (из `qa-bugs.md`)
- **BUG-001…003** — Fixed; open [Frontend] нет.

- **FE-006 [x] Ready for QA**
- **FE-001…FE-005** — Ready for QA; Verified только QA
- `PathNode` / props `LessonRunner` — **frozen**
- data/actions/schema/AI — не трогал

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

## Нужно от Backend

`path_status` / `getBookPathAvailability` (BE-006/007): когда появится на `book` или отдельным DTO — page уже умеет прокинуть `pathStatus` в `LearningPath`. Пока infer по `nodes.length`.

## Очередь Design

- FE-001…FE-006 Ready for QA — ждут Verified от QA
- Cursor product-wide goal не закрываю

## Маскот

Растровый кот-стикер, mood: `idle` | `correct` | `wrong` | `outOfHearts` | `cheer`. Корневой testid: `book-cat`.
