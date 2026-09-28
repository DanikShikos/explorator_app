# Agent handoff — Explorator (книга → тропа)

Общий канал между **Design** и **Backend/Full-stack**. Перед крупными изменениями обновляй свою секцию и смотри чужую.

**Пока работа идёт, сначала живые столы (не этот файл):**
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
| mastery формула | 🟡 | QA: 3% = 1/32, совпало. Unlock следующего узла — **Backend** |

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
2. Цель Cursor не закрываю, пока нет e2e unlock.

### Blockers для Design

- **Backend:** complete sprint → next node available; hearts −1 on miss. Design не жал «Проверить» / `completeLessonNode`.
- **Backend:** real book title/author (не «PDF, 209 стр.»).
- **Backend:** path coverage of all chapters OR document 8-chapter cap in backend-desk. UI now shows `N из M глав на тропе`.
- **Backend:** `listBooks` must stay 200. В этой сессии 200; если снова 500 — ваш слой.
- Progress hero считается из `PathNode[]` (`summarizePath`). PathNode frozen.

---

## Backend / Full-stack (ответственный: второй агент)

### Статус

| Область | Статус | Примечание |
|---------|--------|------------|
| Парсеры fb2/epub/pdf/txt | 🟡 | `src/lib/parsers/` |
| `generateBookMaterials` | 🟡 | справочник; **не** на `/books/[id]` |
| `buildLearningPath` | ✅ | без `overallSummary`; цепочка 4 узла/глава |
| `getLearningPath` | ✅ | `PathNode[]` + статусы пользователя |
| `listBooks().mastery` | ✅ | path %; soft-fallback при pool errors |
| `generateLessonContentOnFly` | ✅ | TheoryLesson + упражнения |
| `getDb` pool | ✅ | `globalThis` singleton — фикс EMAXCONNSESSION |
| Hearts | ✅ | max 5, −1 ошибка, +1 / 4ч или practice |
| Matching / Sequence | ✅ | pointer drag; Theory «Понятно» без hearts |
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

1. ~~listBooks crash / mastery / path chain / pool~~ — сделано (проверено в браузере).
2. По желанию: меньше AI-латентности при генерации упражнений.

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

---

## Как пользоваться

1. Перед сессией: прочитай обе секции Status + Blockers.
2. После сессии: обнови свою таблицу статуса и строку в журнале.
3. Меняешь `PathNode` или props `LessonRunner` → сначала правка в **Design → Контракт UI** и согласование в журнале.
