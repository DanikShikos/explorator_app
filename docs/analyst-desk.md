# Analyst desk — LIVE

**Кто:** Lead System Analyst. Пиши сюда вопросы Developer и куда легла декомпозиция. Developer читает **на каждом шаге**.

Обновлено: 2026-09-29 22:20 UTC+3

## Цель

Доработка приложения. Активна.

## Порядок

Цепочка (диаграмма customer 2026-09-29): **1. Developer** (`docs/developer-desk.md`) → **2. Marketer** (`docs/marketer-desk.md`; OG/share/pixels только из «Задача аналитику») → **3. Analysis** (я; код не пишу) → **4–6 параллельно** AI Prompt Engineer / Backend / DevOpsSec (только после моих карточек) → **7. Frontend/Design** только когда AI+BE+DO той же фичи Ready for QA или Verified, либо явно «для этой фичи карточки AI/DO нет» → **8. QA** ставит Verified / Done (больше никто).

На каждом шаге читаю `docs/developer-desk.md` и `docs/marketer-desk.md`. File-watch: хук `postToolUse` → `.cursor/hooks/analyst-watch.js`.

## Правило маршрутизации (обязательно)

**Developer** и **Marketer** пишут запросы только в свои столы (`docs/developer-desk.md`, `docs/marketer-desk.md`). **Design**, **Backend**, **AI Prompt Engineer** и **DevOpsSec** **не** берут продуктовый scope напрямую из этих столов — реализуют **только** карточки на своих досках:

| Доска | Кто делает |
|-------|------------|
| `.cursor/tasks/backend-tasks.md` | Backend |
| `.cursor/tasks/frontend-tasks.md` | Design / Frontend |
| `.cursor/tasks/ai-prompts.md` | AI Prompt Engineer |
| `.cursor/tasks/devops-security.md` | DevOpsSec |

Аналитик пишет все четыре файла задач. Design/Backend по-прежнему только свои BE/FE доски (не ai-prompts / devops).

## Слежу за файлами

Хук `postToolUse` → `.cursor/hooks/analyst-watch.js` (watch set без `docs/analyst-desk.md`).

Пишу только сюда и в доски задач:

- `docs/analyst-desk.md`
- `.cursor/tasks/backend-tasks.md`
- `.cursor/tasks/frontend-tasks.md`
- `.cursor/tasks/ai-prompts.md`
- `.cursor/tasks/devops-security.md`

Читаю, не правлю:

- `docs/developer-desk.md` — задача в работу только из секции «Задача аналитику»
- `docs/marketer-desk.md` — маркетинговые задачи; карточки только после заполненной «Задача аналитику» у Marketer
- `.cursor/tasks/backlog.md` — черновики RFC
- `.cursor/tasks/marketing-growth.md` — контекст трекера; карточки — только если Marketer уже перенёс строки в «Задача аналитику»

`design-desk` и `backend-desk` читаю ради контракта и Ready for QA (если executor уже отметил DoD). RFC-001/002/003/004 не переоткрывать. `PathNode` / props `LessonRunner` frozen. Код продукта не пишу. Verified / Done — **только QA**.

## Сейчас

**Порядок принят** (диаграмма 2026-09-29): Dev → Marketer → Analysis → AI∥Backend∥DevOpsSec → FE → QA.

**Разложено: share/OG после шага главы** (Marketer «Задача аналитику» 22:15 + Developer подтверждение: книга, глава, кот cheer, свой прогресс):

| Карточка | Кому | Статус |
|----------|------|--------|
| — | **AI** | Карточки **нет** (статика из известных полей; заметка в `ai-prompts.md`) |
| **BE-011** | Backend | To Do — payload + безопасный share-URL |
| **DO-002** | DevOpsSec | To Do — rate-limit публичного URL, без утечки библиотеки/файла |
| **FE-013** | Design | To Do — **не стартовать**, пока BE-011 и DO-002 не Ready/Verified |

**Закрытое / не трогать:** BE-010, FE-012 Verified. FE-008…011, BE-008/009, RFC-001…004. PathNode / LessonRunner frozen.

**Не делать (scope-запрет этой фичи):** рейтинг, лиги, звук, магазин; пиксели, Product Hunt, Telegram; сердце за приглашение/шеринг; публичное SEO всех книг; новый mood/кадр BookCat; новый `nodeType`; менять PathNode / LessonRunner; переоткрывать RFC-010 («Сегодня» — ждёт, не раскладывать сейчас).

**Статусы на досках:** To Do / Ready for QA (executor) / Verified (**только QA**). Аналитик Verified не ставит.

## Вопросы Developer

Нет.

## Вопросы Marketer

Нет. Share/OG из «Задача аналитику» 22:15 разложена: BE-011, DO-002, FE-013; AI нет.

## Для Design

- Берите scope **только** из `.cursor/tasks/frontend-tasks.md`.
- **FE-013** — после Ready/Verified у **BE-011** и **DO-002** (AI-карточки нет).
- Не трогать FE-008…012, RFC-001…004. PathNode/LessonRunner frozen.
- Один testid: `chapter-share-card`.

## Для Backend

- Берите scope **только** из `.cursor/tasks/backend-tasks.md`.
- **BE-011** — payload (книга, глава, шаги) + share-URL без чужой библиотеки/файла. Без нового `nodeType`.
- Миграции/RLS/rate-limit публичного маршрута — **DO-002**, не дублировать на BE.
- BE-010 Verified — не переоткрывать.

## Для AI Prompt Engineer

- Берите scope **только** из `.cursor/tasks/ai-prompts.md`.
- Open пуст. Share/OG — **без** AI-карточки (статика).

## Для DevOpsSec

- Берите scope **только** из `.cursor/tasks/devops-security.md`.
- **DO-002** To Do — share URL. Пиксели не выдумывать. Новых имён секретов нет.
- SEC-001…008 не переоткрывать.

## Как отвечаю Developer

Коротко: что понял, номера карточек `BE-…` / `FE-…` / `DO-…` / `AI-…` и критичность.
