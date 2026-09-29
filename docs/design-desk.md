# Design desk — LIVE

**Кто:** агент Design и Frontend (этот чат). Пиши сюда статус; Backend и аналитик читают **на каждом шаге**.

Обновлено: 2026-09-29 (fix pass)

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
| `today-panel` / `today-due-count` / `today-session` / `today-session-banner` / `lesson-runner` | today + runner |

Карточка FE может требовать дополнительные id — выполнять DoD карточки.

### QA bugs
Читать `.cursor/tasks/qa-bugs.md` если есть. Чинить только дефекты с тегом **[Frontend]**. Остальные не трогать. Фиксы кратко здесь.

## Сейчас от Design

**2026-09-29 fix pass** — BUG-001/002/003 Fixed; FE-001…005 Ready for QA. Charge UI uses server `charged`; DoD testids on place. Browser click-through not run. Props frozen.

21:05 — **FE-004 Ready for QA**. Theory-only: `hasPracticeAhead` из `getLearningPath` → после «Понятно» без «дальше практика». Empty practice → `practice-empty-notice` до hearts-gate. Testids FE-001…004 + lesson/path. **FE-005** уже Ready for QA (parallel, `applyLessonMiss`). localhost:3000 down — browser не кликал. Cursor goal не закрывал.

### Frontend QA bugs (из `qa-bugs.md`)
- **BUG-002** — fixed: добавлены `today-panel`, `today-continue-cta`, `today-due-count`, `today-session`, `today-session-banner`, `lesson-runner`, `lesson-answer-correct`, `lesson-answer-wrong`, `lesson-miss-feedback`, `book-cat`.
- **BUG-003** — fixed: `BookCat` → `data-testid="book-cat"` (не `mascot`).
- **BUG-001** — Frontend-назначен, Backend уже переписал miss на `applyLessonMiss`; в UI подтверждено (не трогал actions). Retest — на QA.

- **FE-004 [x] Ready for QA**
- **FE-005 [x] Ready for QA** (не моя сессия целиком; testids hearts/miss на месте)
- **FE-001/002/003** — testid DoD закрыт; Verified только QA
- `PathNode` / props `LessonRunner` — **frozen**
- data/actions/schema/AI — не трогал

## Контракт (заморожен)

`PathNode` — без изменений.  
`status`: `locked` | `available` | `completed` | `mastered`  
`nodeType` лейблы: Теория / Спринт / Пары / Босс / Практика  
Старт упражнений: `hearts >= 1` на **первом** проходе. Replay completed/mastered — без штрафа (`charged: false`). Теория (`summary_read`) — без жизней.

Цвета тропы: `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`.

## QA bugs

- **BUG-002** [Frontend] — fixed (testid DoD FE-001…003).
- **BUG-003** [Frontend] — fixed (`book-cat`).
- **BUG-001** — miss path уже на `applyLessonMiss` (Backend + FE-005); Design не менял actions.

## Backend уже заявил

- BE-003: practice AI fail / ungrounded → `cards: []`, `ok: true`
- BE-004: thin chapter → один `summary_read`
- BE-005 Ready for QA → FE-005 Ready for QA

## Нужно от Backend

Сейчас блокеров по FE-004 нет.

## Очередь Design

- FE-004 / FE-005 Ready for QA — ждут Verified от QA
- Cursor product-wide goal не закрываю

## Маскот

Растровый кот-стикер, mood: `idle` | `correct` | `wrong` | `outOfHearts` | `cheer`. Корневой testid: `book-cat`.
