# Agent handoff — Explorator (книга → тропа)

Общий канал между **Design** и **Backend/Full-stack**. Перед крупными изменениями обновляй свою секцию и смотри чужую.

**Пока работа идёт, сначала живые столы (не этот файл):**
- Developer пишет задачи аналитику: [`docs/developer-desk.md`](developer-desk.md)
- Аналитик спрашивает и раскладывает: [`docs/analyst-desk.md`](analyst-desk.md)
- Design пишет: [`docs/design-desk.md`](design-desk.md)
- Backend пишет: [`docs/backend-desk.md`](backend-desk.md)

**Правила дизайна:** [`.cursor/rules/design-book-learning-path.mdc`](../.cursor/rules/design-book-learning-path.mdc)  
**UI-стек:** [`.cursor/rules/ui-components.mdc`](../.cursor/rules/ui-components.mdc)  
**Always-on:** [`.cursor/rules/agent-collaboration.mdc`](../.cursor/rules/agent-collaboration.mdc) · `AGENTS.md` · хуки в `.cursor/hooks.json`

---

## Цель продукта

Книга после загрузки и разбора превращается в **линейную тропу уроков** (теория + закрепление). Справочные материалы (суть, главы, тест, карточки) остаются, но **primary UX — тропа и `LessonRunner`**.

---

## Design (ответственный: агент Design)

### Статус

| Область | Статус | Примечание |
|---------|--------|------------|
| Иерархия `/books/[id]` | ✅ | шапка + progress hero → тропа (без BookStudy) |
| Тропа `LearningPath` | ✅ UX | токены path/reward; Star vs Crown; sticky + 16rem padding; PathNode frozen |
| Урок `LessonRunner` + `TheoryLesson` | ✅ | те же токены; крошка «К тропе»; locked/empty/error = PathNotice |
| Progress hero | ✅ | `summarizePath` из существующих узлов |
| Шапка главы/тропа | ✅ UX | partial path → `N из M глав на тропе`; full cover → короткий copy |
| Библиотека `/books` | ✅ UX | бейджи Новая / Разобрана / На тропе; бар = `mastery`; throw → PathNotice + retry |
| mastery формула | ✅ | QA было 1/32; после спринта 2/104, пары available |

### Контракт UI (не ломать без согласования)

```tsx
// src/components/book/LearningPath.tsx
export type PathNode = {
  id: string;
  chapterTitle: string;
  title: string;
  description: string;
  nodeType: string; // summary_read | quiz_sprint | flashcard_review | boss_challenge | practice_review
  orderIndex: number;
  xpReward: number;
  status: "locked" | "available" | "completed" | "mastered";
  score: number | null;
};
```

**Лейблы типов узлов (RU):** Теория, Спринт, Пары, Босс, Практика.

**Gate:** упражнения только при `hearts >= 1`. Теория (`summary_read`) без жизней.

### Очередь Design

1. Не трогать data/schema/actions/AI/hearts-store.
2. Цель Cursor: unlock проверен Backend. Можно закрывать со своей стороны, если шапка и тропа совпадают.

### Blockers для Design

- Unlock спринт → пары и −1 сердце — **закрыто Backend** (пары available, жизни 3/5).
- Заголовок «PDF, 209 стр.» — **закрыто**: живая книга теперь с названием и автором из парсера.
- Покрытие глав — **закрыто**: лимита 8 нет, 26 глав = 104 узла.
- Если `listBooks` снова 500 — pool/schema Backend, не Design.
- Progress hero считается из `PathNode[]` (`summarizePath`). PathNode frozen.

---

## Backend / Full-stack (ответственный: второй агент)

### Статус

| Область | Статус | Примечание |
|---------|--------|------------|
| `buildLearningPath` | ✅ | без `overallSummary`; **все** главы, 4 узла, без дублей |
| `getLearningPath` | ✅ | `PathNode[]` + статусы пользователя |
| `listBooks().mastery` | ✅ | path %; soft-fallback при pool errors |
| `generateLessonContentOnFly` | ✅ | TheoryLesson + упражнения |
| `getDb` pool | ✅ | `globalThis` singleton — фикс EMAXCONNSESSION |
| Hearts | ✅ | QA: ошибка в спринте 4→3 |
| Matching / Sequence | ✅ | pointer drag; спринт → пары `available` |
| Парсеры fb2/epub/pdf/txt | ✅ | PDF: название и автор из метаданных / биб. строки |
| FSRS / review | отдельный поток | `/review`, notes |

### Контракт API / data layer

| Функция / action | Потребитель UI | Ожидание |
|------------------|----------------|----------|
| `getBookStudy(id)` | `books/[id]/page.tsx` | book + chapters (header); quiz/cards опционально |
| `getLearningPath(bookId)` | `LearningPath` | `PathNode[]`, sorted by `orderIndex` |
| `buildLearningPath(bookId)` | «Собрать тропу» | `{ ok, error? }`, **без** `overallSummary` |
| `listBooks()` | `/books` | `{ book, mastery, chapters, minutes }`, mastery = path % |
| `generateLessonContentOnFly(nodeId)` | lesson page | `{ ok, node, cards, theoryCards? }` или «Урок ещё закрыт» |
| `completeLessonNode` / `registerMiss` | LessonRunner / TheoryLesson | unlock next; XP без double-award |

### Очередь Backend

1. ~~listBooks crash / mastery / path chain / pool~~ — сделано.
2. ~~Спринт → пары, −1 сердце, PDF-заголовок, тропа на все главы~~ — проверено в браузере (104 шага, пары available, жизни 3/5).

### Blockers для Backend

- Session pool Supabase = 15. Держать один client через `globalThis`. При повторных EMAXCONNSESSION — transaction pooler `:6543`.

---

## Маршруты (карта)

| URL | RSC / Client | Ключевые компоненты |
|-----|--------------|---------------------|
| `/books` | RSC | `UploadBookForm`, карточки (mastery path %) |
| `/books/[id]` | RSC | header + `LearningPath` (+ BookCat); **без** BookStudy |
| `/books/[id]/lesson/[nodeId]` | RSC → client | `TheoryLesson` / `LessonRunner` |
| `/practice` | RSC | `LessonRunner` mode=`practice` |

---

## Definition of Done (MVP тропы)

- [x] Книга загружена; тропа без обязательного `overallSummary`.
- [x] «Собрать тропу» создаёт узлы; первый `available`, остальные `locked`.
- [x] Урок открывается; узел → `completed` / `mastered`.
- [x] Следующий узел разблокируется; жизни −1 при ошибках.
- [x] `/books` mastery = % узлов тропы пользователя.

---

## Журнал изменений (кратко)

| Дата | Кто | Что |
|------|-----|-----|
| 2026-09-28 | Design | Создан handoff + rule `design-book-learning-path.mdc` |
| 2026-09-28 | Design | Live desks, always-on rule, AGENTS.md, session/prompt/tool hooks |
| 2026-09-28 | Design | Токены path/reward, progress hero, Crown vs Star; PathNode без изменений |
| 2026-09-28 | Design | PathNotice empty/error/locked, sticky-панель, библиотека на path-бейджах; listBooks 500 отдан Backend |
| 2026-09-28 | Design | PathNotice tone=alert + retry; sticky на всех ширинах; locked «Сначала: next» только в панели; сердца → practice/4ч. PathNode frozen. Цель не закрыта: listBooks + unlock loop — Backend |
| 2026-09-28 ~23:35 | Backend | E2E fix: getDb singleton, mastery path %, chain/statuses, sequence drag; browser: `/books` 200 (3%), тропа 32 шага, спринт LessonRunner |
| 2026-09-28 ~23:50 | Design | QA `/books` 200: бар 3%=1/32, Crown/locked/TheoryLesson/LessonRunner. UX: «К тропе», sticky opaque + 16rem padding. PathNode frozen. Цель не закрыта: unlock-loop — Backend |
| 2026-09-28 ~23:55 | Design | Шапка: `N из M глав на тропе` если path не покрывает все главы; PathNode frozen; цель не закрыта |
| 2026-09-28 ~23:45 | Backend | Спринт пройден → пары available; ошибка 4→3 жизни. PDF-заголовок и автор. Тропа на все главы (104), дубли узлов убраны. PathNode frozen |
| 2026-09-29 19:32 | Аналитик | Канал Developer ↔ аналитик: `developer-desk.md`, `analyst-desk.md`. Задачи Design/Backend — секции на столе аналитика. Контракт не менялся |
| 2026-09-29 19:40 | Аналитик | Доски задач: `.cursor/tasks/backend-tasks.md`, `.cursor/tasks/frontend-tasks.md`. Очереди пустые, пока Developer не поставит задачу. Контракт не менялся |

---

## Как пользоваться

1. Перед сессией: Developer и аналитик читают `developer-desk` и `analyst-desk`. Design и Backend — свои столы и секции «Для Design» / «Для Backend».
2. После сессии: обнови свою таблицу статуса и строку в журнале.
3. Меняешь `PathNode` или props `LessonRunner` → сначала правка в **Design → Контракт UI** и согласование в журнале.
