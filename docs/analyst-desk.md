# Analyst desk — LIVE

**Кто:** Lead System Analyst. Пиши сюда вопросы Developer и куда легла декомпозиция. Developer читает **на каждом шаге**.

Обновлено: 2026-09-29 21:05 UTC+3

## Цель

Доработка приложения. Активна.

## Слежу за файлами

Хук `postToolUse` → `.cursor/hooks/analyst-watch.js` (watch set без `docs/analyst-desk.md`).

Пишу только сюда и в доски задач:

- `docs/analyst-desk.md`
- `.cursor/tasks/backend-tasks.md`
- `.cursor/tasks/frontend-tasks.md`

Читаю, не правлю:

- `docs/developer-desk.md` — задача в работу только из секции «Задача аналитику»
- `.cursor/tasks/backlog.md` — черновики RFC; в работу только то, что Developer передал (сейчас **RFC-003**; RFC-004 остаётся черновиком)

`design-desk` и `backend-desk` читаю ради контракта. RFC-001/002 не переоткрывать. RFC-004 в карточки не кладу.

## Сейчас

**Источник:** прямой customer assignment 2026-09-29 ~21:04 UTC+3 — persist тропы + control gate до availability. Карточки без ожидания developer-desk. RFC-003 (BE-005/FE-005) остаётся Ready for QA. RFC-001/002 не переоткрывать. RFC-004 не карточить.

**Статусы на досках:** To Do / Ready for QA (ставит Backend|Design) / Verified/Done (**только QA**). Аналитик Verified не ставит.

**Ready for QA:** `BE-001`…`BE-005`, `FE-001`…`FE-005`. Verified — только где уже отметил QA (BE-001…BE-004); аналитик Verified не трогал.

**To Do (новые, customer path persist/gate):**

- Backend → `BE-006` P0 — write-once persist `lesson_nodes` + theory/exercises в `quiz_cards`; `/books/[id]` и урок только читают (ноль AI на read); `books.path_status` `pending|approved|rejected`; PathNode frozen.
- Backend → `BE-007` P0 — control gate (product learning rules + essence) до `approved`; compose с BE-003/BE-004; failing fixture не available.
- Design/Frontend → `FE-006` P0 — PathNotice + idle при not-ready; «Собрать тропу» без auto-regen; testids `path-gate-pending|rejected|ready`; reuse `book-cat` / `learning-path` / `path-notice` / `build-path-button`.

**RFC-003 (без изменений тела):** `BE-005` / `FE-005` — Ready for QA (Verified пусто).

Код не пишу.

## Вопросы Developer

Нет.

## Для Design

Открыта: `FE-006` (P0, To Do) — UI not-ready / gate; зависит от availability Backend (BE-006/007). Ready for QA: `FE-001`…`FE-005` (Verified не ставить). Доска: `.cursor/tasks/frontend-tasks.md`.

Опора: токены path/reward; mood из пяти; `PathNode` / props `LessonRunner` frozen; reuse testids + только новые gate ids.

## Для Backend

Открыты: `BE-006` (P0, To Do) persist+read-only; `BE-007` (P0, To Do) control gate. Compose с BE-003/BE-004, не дублировать. Ready for QA: `BE-001`…`BE-005` (Verified не ставить аналитику). Доска: `.cursor/tasks/backend-tasks.md`.

Контракт после работы — в `docs/backend-desk.md` (reader + `path_status`).

## Как отвечаю Developer

Коротко: что понял, номер вопроса, номера карточек `BE-…` / `FE-…` и их критичность.
