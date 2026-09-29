# Frontend / Design tasks

**Кто пишет:** аналитик. **Кто делает:** Design и Frontend. Файл не переписывать целиком — отмечать статусы на карточке и дописывать заметку под задачей.

Обновлено: 2026-09-29 21:05 UTC+3

**Статусы карточки (три состояния):**
- `[ ]` **To Do** — ещё не сделано / в работе у Design.
- `[x]` **Ready for QA** — выставляет **Design/Frontend** после своей проверки DoD (не аналитик «на глаз»).
- `[x]` **Verified / Done** — выставляет **только QA**. Аналитик это поле не трогает.

Чекбокс в заголовке `### [ ]` / `### [x]` = текущая стадия (To Do vs Ready for QA и далее). Под заголовком всегда три строки статусов. `Verified / Done` не отмечать без QA.

Цель: **FE-006** (path not-ready / gate UI) → To Do. FE-001…FE-005 → Ready for QA. RFC-004 в backlog, не карточить. RFC-001/002 не переоткрывать.

Правило карточки: критичность `P0` / `P1` / `P2`, ссылки на файлы. В каждой задаче: компоненты, кадр маскота, интерактив, **обязательные `data-testid`**, **Acceptance Criteria (DoD)** чекбоксами.

Контракт path gate: `BE-006` / `BE-007` (availability / `path_status`). RFC-003 сердца: `BE-005`. Props `LessonRunner` / форма `PathNode` — frozen.

## Открытые

### [ ] FE-006 · P0 · UI: тропа не готова / gate pending|rejected|approved

- [ ] To Do
- [ ] Ready for QA
- [ ] Verified / Done
- [ ] **Критичность:** P0 (customer 2026-09-29 ~21:04; после BE-006/BE-007)
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
  - [ ] pending/rejected: PathNotice + idle (или wrong при ошибке), нет fake nodes, нет auto-regen на каждый заход.
  - [ ] «Собрать тропу» один явный action; при уже approved — не перегенерирует.
  - [ ] approved: `learning-path` из stored nodes; PathNode без новых полей.
  - [ ] На месте `path-gate-pending` / `path-gate-rejected` / `path-gate-ready` + reuse testids; moods только из пяти.
  - [ ] Пустой not-ready не выглядит как broken empty path без copy.

## Готово (Ready for QA — Verified не ставить без QA)

### [x] FE-005 · P0 · UI: жизни только на первом проходе (RFC-003)

- [ ] To Do
- [x] Ready for QA
- [ ] Verified / Done
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

### [x] FE-004 · P1 · Theory-only глава и пустые cards практики

- [ ] To Do
- [x] Ready for QA
- [ ] Verified / Done
- [x] **Критичность:** P1 (после BE-004 / стык с BE-003 `cards: []`)
- **Статус (2026-09-29 21:05):** Ready for QA — theory-only copy без «дальше практика»; empty cards → `practice-empty-notice` до hearts-gate; `learning-path` / `theory-complete-message` / path-notice testids; localhost:3000 был down.
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
- [ ] Verified / Done
- [x] **Критичность:** P0 (RFC-001)
- **Статус (2026-09-29 19:43, design-desk):** `/` → `getTodayPanel` + `TodayPanel`; CTA «Продолжить» → `/today/session`; idle-кот; заметки вторичной ссылкой на `/notes`; список заметок убран. Developer browser-check 20:53 ≠ QA.
- **QA (2026-09-29):** Not Verified — UX wiring OK by code review; DoD `data-testid` missing → **BUG-002**, **BUG-003**.
- **Статус (2026-09-29 fix pass):** DoD testids present (`today-panel`, `today-continue-cta`, `today-due-count`, `book-cat`). BUG-002/003 fixed. Ready for QA; Verified только QA.
- **data-testid (для автотестов / добить если нет):**
  - `today-panel`
  - `today-continue-cta`
  - `today-due-count`
  - `book-cat`
- **Acceptance Criteria (DoD):**
  - [x] `/` показывает активную книгу и CTA «Продолжить», не список заметок.
  - [x] Idle-кот; заметки только вторичной ссылкой.
  - [x] На месте `data-testid`: `today-panel`, `today-continue-cta`, `today-due-count`, `book-cat`.
  - [ ] QA: Verified только после приёмки QA.

### [x] FE-003 · P1 · «Продолжить» = короткая сессия (повтор → новый шаг)

- [ ] To Do
- [x] Ready for QA
- [ ] Verified / Done
- [x] **Критичность:** P1 (RFC-001)
- **Статус (2026-09-29 19:43):** `/today/session` — `listBookDueCards` → `LessonRunner` mode=lesson (сердца+FSRS); due=0 → redirect nextNode или pause+cheer; после повтора «Дальше» → available без новых props (`bookId` path-encode). Developer browser-check ≠ QA.
- **QA (2026-09-29):** Not Verified — session flow OK by code review; DoD `data-testid` missing → **BUG-002**, **BUG-003**. Note: lesson page currently passes extra `heartsCharged` prop (FE-005 WIP / props freeze risk) — **BUG-001**.
- **Статус (2026-09-29 fix pass):** DoD testids present (`today-session`, `today-session-banner`, `lesson-runner`, `book-cat`). `heartsCharged` prop removed; BUG-001/002/003 fixed. Ready for QA.
- **data-testid (для автотестов / добить если нет):**
  - `today-session`
  - `today-session-banner`
  - `lesson-runner`
  - `book-cat`
- **Acceptance Criteria (DoD):**
  - [x] Due > 0 → LessonRunner на due; due = 0 + nextNode → урок; без next → PathNotice.
  - [x] Props `LessonRunner` без новых полей; path-encode `bookId` для «Дальше».
  - [x] На месте `data-testid`: `today-session`, `today-session-banner`, `lesson-runner`, `book-cat`.
  - [ ] QA: Verified только после приёмки QA.

### [x] FE-002 · P0 · Ответ в LessonRunner планирует карточку (Good / Again)

- [ ] To Do
- [x] Ready for QA
- [ ] Verified / Done
- [x] **Критичность:** P0 (RFC-002)
- **Статус (2026-09-29 20:10):** `mode="lesson"` → `recordLessonAnswer(id, true|false)`; сердца / `completeLessonNode` / props без изменений; шкалу не показываю. Developer browser-check ≠ QA.
- **QA (2026-09-29):** Not Verified — `recordLessonAnswer` wiring present; DoD `data-testid` missing (**BUG-002**). Miss/heart branch currently broken (**BUG-001**) — FSRS Again still called on the no-charge branch.
- **Статус (2026-09-29 fix pass):** DoD testids present (`lesson-runner`, `lesson-answer-correct`, `lesson-answer-wrong`, `lesson-miss-feedback`). Miss → `applyLessonMiss`. Ready for QA.
- **data-testid (для автотестов / добить если нет):**
  - `lesson-runner`
  - `lesson-answer-correct`
  - `lesson-answer-wrong`
  - `lesson-miss-feedback`
- **Acceptance Criteria (DoD):**
  - [x] Верный/неверный ответ в lesson mode вызывает Good/Again (`recordLessonAnswer`).
  - [x] Интервал на экране не показывается; props frozen.
  - [x] На месте `data-testid`: `lesson-runner`, `lesson-answer-correct`, `lesson-answer-wrong`, `lesson-miss-feedback`.
  - [ ] QA: Verified только после приёмки QA.

## Справочник (не задачи)

- Уже в UI: `button`, `card`, `dialog`, `input`, `textarea`, `badge`, `separator`, `command` в `src/components/ui/`. Анимация — Framer Motion.
- Маскот `BookCat` (`src/components/mascot/BookCat.tsx`). В коде пять mood, не восемь: `idle`, `correct`, `wrong`, `outOfHearts`, `cheer`. Кадры: `public/mascot/idle.png`, `correct.png`, `wrong.png`, `out-of-hearts.png`, `cheer.png`. Задача называет один из этих пяти. Новый кадр — только отдельной карточкой после ответа Developer.
- Интерактив, который уже есть: выбор варианта, drag пар и порядка в уроке. Звук Web Audio и конфетти в задачу писать только если Developer это попросил.
- Автотесты: стабильные `data-testid` обязательны в Acceptance Criteria каждой FE-карточки.
- Не ломать: `PathNode`, props `LessonRunner`, токены `bg-path`, `bg-path-soft`, `text-path-ink`, `text-path-foreground`, `bg-reward`. Схему, actions и AI не трогать.
