# QA Security findings (fail-closed)

**Кто пишет:** QA (+ DevOpsSec lane). Не путать с `.cursor/tasks/qa-bugs.md`.
**Обновлено:** 2026-09-29 (S01/S02/S05 fixed: owner RLS committed, probe books=1 lesson_nodes=104)
**Scope:** RLS / tenant isolation, API leakage, rate limits на AI/upload. Без secrets, без чужих данных, без exploit recipes.

## Verified (controls that hold)

| Check | Test / evidence |
|-------|-----------------|
| App-layer ownership deny (foreign userId) | `ownsResource / scopedByOwner (app-layer isolation)` → `denies a foreign user id` in `src/lib/tenant-isolation.test.ts` |
| App-layer allow only matching owner | same file → `allows only the matching session owner` |
| Missing resource owner denied | same file → `denies missing or empty resource owner` |
| RLS SQL predicate denies foreign auth.uid | `rlsOwnerPolicyAllows` → `denies another authenticated user reading a non-demo row` |
| RLS SQL predicate denies anon on normal row | `rlsOwnerPolicyAllows` → `denies anonymous auth.uid on a normal user row` |
| RLS SQL predicate denies foreign auth on historical demo UUID | same → `denies foreign auth on the historical demo UUID row (BUG-S05)` |
| Repo migration: notes/quiz_cards/review_logs owner policies | `migration SQL owner policies` → notes policies require `auth.uid = user_id`; no demo UUID |
| Repo migration: books_owner | same → `books_owner policy ties books to auth.uid`; no demo UUID |
| Repo migration: users_stats_owner (hearts) | same → `users_stats owner policy present`; no demo UUID |
| Repo + applied: lesson_nodes / user_node_progress RLS (BUG-S02) | same → `0005` + `rls-owner-policies.sql` owner checks without demo UUID |
| Notes export: session + `books.userId` / `notes.userId` | `API route auth surface` → notes export requires session and scopes |
| Notes export: in-process rate limit 429 | `consumeRateLimit("notes-export")` + source contract in `notes/export/route.test.ts` |
| Quiz generate: session 401 + in-process rate limit 429 | `quiz generate route` source contract + `consumeRateLimit` memory tests |
| Book upload: session + in-process rate limit (429 in action result) | `createBookFromUpload` + `books.upload-rate-limit.test.ts` |
| Server actions notes/books/quiz/lessons: `getCurrentUserId` + `eq(*.userId, …)` | Code review (`src/app/actions/**`, `src/lib/data.ts`, `src/lib/hearts-store.ts` `ownUser`) |
| Hearts reject foreign account id | `hearts-store` `ownUser`: `current !== userId` → throw (predicate covered by `ownsResource`) |

## Bugs

### **[BUG-S01] Live database has RLS disabled on tenant tables**
- **Статус:** **Fixed** (2026-09-29) — one txn via `scripts/security/apply-rls.mjs`: owner policies + `ENABLE ROW LEVEL SECURITY` on 15 public tenant tables; authenticated owner probe before COMMIT → **books=1**, **lesson_nodes=104**. App still uses `getDb()` → `set local role authenticated` + JWT `sub` (`src/db/rls-client.ts`). App-layer `userId` filters unchanged.
- **Назначен на:** Backend
- **Затронутые файлы:** live Supabase schema; `scripts/security/rls-owner-policies.sql`, `scripts/security/apply-rls.mjs`, `src/db/rls-client.ts`

### **[BUG-S02] `lesson_nodes` / `user_node_progress` have no RLS in repo migrations**
- **Статус:** **Fixed** (2026-09-29) — `drizzle/0005_lesson_nodes_progress_rls.sql` matches applied owner policies (chapter→book / `user_id` + owned book); registered in `drizzle/meta/_journal.json`. Live probe included lesson_nodes via chapter/book join (**104**). No demo UUID.
- **Назначен на:** Backend
- **Затронутые файлы:** `drizzle/0005_lesson_nodes_progress_rls.sql`, `drizzle/meta/_journal.json`, `scripts/security/rls-owner-policies.sql`, `src/lib/tenant-isolation.test.ts`

### **[BUG-S03] Quiz generate API has no session check**
- **Статус:** **Fixed** (2026-09-29) — `POST /api/quiz/generate` calls `getOptionalUser()`; missing session → **401** (`Нужен вход`) before rate limit / AI. Content cap (`AI_PROMPT_CLIP.bookSummaryChapter`) and null-sanitize (`sanitizeGeneratedQuiz` → null → 502) kept.
- **Назначен на:** Backend
- **Исправление:** `src/app/api/quiz/generate/route.ts`. Vitest: `route.test.ts` source contract + `tenant-isolation.test.ts` quiz generate auth surface.
- **Затронутые файлы:** `src/app/api/quiz/generate/route.ts`, `src/app/api/quiz/generate/route.test.ts`, `src/lib/tenant-isolation.test.ts`

### **[BUG-S04] No app-level rate limit on AI / upload / notes export**
- **Статус:** **Fixed** (2026-09-29) for the three scoped surfaces: **quiz generate**, **notes export**, and **book upload**. All use the same in-process `consumeRateLimit` helper (no new npm packages). Over-limit → **429** (HTTP on API routes; `status: 429` on upload action result) + `Retry-After` on quiz/export JSON. Ordinary page reads are not rate-limited.
  - `POST /api/quiz/generate` → bucket `quiz-ai` / `QUIZ_GENERATION_LIMIT`
  - `GET /api/notes/export` → bucket `notes-export` / `NOTES_EXPORT_LIMIT` (session + owner scope unchanged when under limit)
  - `createBookFromUpload` → bucket `book-upload` / `BOOK_UPLOAD_LIMIT` (auth unchanged when under limit; limit runs before parse)
- **Still open (out of this slice):** broader AI surfaces beyond these three may already share `book-ai` / `quiz-ai` via actions; any remaining unpaid high-cost paths stay a DevOpsSec follow-up if found.
- **Назначен на:** Backend
- **Затронутые файлы:** `src/app/api/quiz/generate/route.ts`, `src/app/api/notes/export/route.ts`, `src/app/actions/books.ts`, `src/lib/security/rate-limit.ts`, `src/lib/security/rate-limit.test.ts`, `src/app/api/notes/export/route.test.ts`, `src/app/actions/books.upload-rate-limit.test.ts`

### **[BUG-S05] RLS policies OR-in shared demo user UUID**
- **Статус:** **Fixed** (2026-09-29) — live policies recreated owner-only (DROP then CREATE in same txn as S01); demo UUID absent from `pg_policies`. Repo SQL stripped: `0000_init`, `0001_allow_server_user`, `0002_gamification`, `0003_books_security`, `0005`, `rls-owner-policies.sql`. Vitest asserts no demo UUID; `rlsOwnerPolicyAllows` is owner-match only.
- **Назначен на:** Backend
- **Затронутые файлы:** `drizzle/0000_init.sql`, `drizzle/0001_allow_server_user.sql`, `drizzle/0002_gamification.sql`, `drizzle/0003_books_security.sql`, `scripts/security/rls-owner-policies.sql`, `src/lib/tenant-isolation.ts`, `src/lib/tenant-isolation.test.ts`

## Notes

- Overall goal (product) not marked complete.
- No PathNode changes. No developer/analyst/marketer desk edits. No commit/push.
- S01/S02/S05 closed this pass: committed after authenticated owner probe **books=1**, **lesson_nodes=104**. App-layer `userId` filters kept.
- Tests assert denial / presence of known-good controls only.
- **2026-09-29 QA UI:** after live RLS, `/books` (1 book + title), book path (`2 из 104 шагов` / «Учебная тропа»), `/notes` («Сохранённые моменты»), and `/` («Сегодня») all load — no BUG-S06.

