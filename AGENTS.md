# Explorator — агенты

Параллельная работа: **Developer** ставит задачу **аналитику**, аналитик раскладывает её на **Design** и **Backend**. Design и Backend строят «книга → тропа уроков».

Пока задача идёт, **перечитывай живые столы**, не полагайся на первое сообщение сессии:

| Файл | Кто пишет | Кто читает | Зачем |
|------|-----------|------------|--------|
| `docs/developer-desk.md` | Developer | аналитик | задача аналитику и ответы на его вопросы |
| `docs/analyst-desk.md` | аналитик | Developer, Design, Backend | вопросы Developer; куда легли карточки |
| `.cursor/tasks/backend-tasks.md` | аналитик | Backend | атомные задачи Backend: schema, actions, AI JSON, RLS |
| `.cursor/tasks/frontend-tasks.md` | аналитик | Design / Frontend | атомные задачи UI: компоненты, маскот, интерактив, DoD |
| `docs/design-desk.md` | Design (и фронтенд) | Backend, аналитик | UX, контракт UI и что уже собрано в компонентах |
| `docs/backend-desk.md` | Backend | Design, аналитик | что сейчас в работе, API, блокеры |
| `docs/agent-handoff.md` | Design и Backend | все | статусы, DoD, журнал |

Правила: `.cursor/rules/agent-collaboration.mdc` (всегда), `.cursor/rules/design-book-learning-path.mdc` (книга/тропа/урок).
