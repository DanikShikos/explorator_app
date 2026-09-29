# Explorator — агенты

Порядок: **1. Developer** → **2. Marketer** → **3. Analysis** → **4–6 параллельно** AI Prompt Engineer / Backend / DevOpsSec → **7. Frontend/Design** (после Ready/Verified у AI+BE+DO той же фичи, или явной пометки «карточки AI/DO нет») → **8. QA** (только Verified). Аналитик раскладывает intent на карточки; код продукта не пишет.

Пока задача идёт, **перечитывай живые столы**, не полагайся на первое сообщение сессии:

| Файл | Кто пишет | Кто читает | Зачем |
|------|-----------|------------|--------|
| `docs/developer-desk.md` | Developer | аналитик | задача аналитику и ответы на его вопросы |
| `docs/marketer-desk.md` | Marketer | аналитик | маркетинговые задачи (OG, share, SEO, pixels) → карточки BE/FE |
| `docs/analyst-desk.md` | аналитик | Developer, Design, Backend, AI Prompt Engineer, DevOpsSec | вопросы Developer; куда легли карточки |
| `.cursor/tasks/backend-tasks.md` | аналитик | Backend | атомные задачи Backend: actions, product schema usage (миграции → devops) |
| `.cursor/tasks/frontend-tasks.md` | аналитик | Design / Frontend | атомные задачи UI: компоненты, маскот, интерактив, DoD |
| `.cursor/tasks/ai-prompts.md` | аналитик | AI Prompt Engineer | system prompts, Zod/JSON Schema LLM, обработка ответа модели |
| `.cursor/tasks/devops-security.md` | аналитик | DevOpsSec | Drizzle-миграции, RLS, rate limit, env (имена) |
| `docs/design-desk.md` | Design (и фронтенд) | Backend, аналитик | UX, контракт UI и что уже собрано в компонентах |
| `docs/backend-desk.md` | Backend | Design, аналитик | что сейчас в работе, API, блокеры |
| `docs/agent-handoff.md` | Design и Backend | все | статусы, DoD, журнал |

Правила: `.cursor/rules/agent-collaboration.mdc` (всегда), `.cursor/rules/design-book-learning-path.mdc` (книга/тропа/урок).
