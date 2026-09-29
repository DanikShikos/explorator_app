# DevOps & Security — LIVE

**Кто пишет:** Lead DevOps & Security (карточки DO кладёт аналитик). Backend не применяет этот файл как очередь фич. Сюда — аудит, гейт миграций, секреты, заголовки, лимиты.

Обновлено: 2026-09-29 22:20 UTC+3

**Старт роли:** DevOpsSec берёт карточку после того, как аналитик положил её сюда (шаг 4–6, параллельно с AI и Backend).

## Очередь фич (карточки аналитика)

### [ ] DO-002 · P1 · Share/OG URL: rate-limit + без утечки библиотеки/файла

- [x] To Do
- [ ] Ready for QA
- [ ] Verified / Done
- [x] **Критичность:** P1 (Marketer «Куда аналитику разложить»: публичный share-маршрут → rate-limit и без дыры в RLS)
- **Зачем:** share-URL из **BE-011** должен быть безопасным для открытия без сессии владельца, но не становиться дырой в личные книги.
- **Scope:**
  - Публичный GET (или OG) share-снимка: отдаёт **только** поля карточки (`bookTitle`, `chapterLine`, `stepsCompleted`, `stepsTotal` / OG meta из них).
  - Rate-limit на публичный маршрут (reuse существующего паттерна лимитов; **новых имён секретов не выдумывать** — Upstash уже в `.env.example` если нужен общий лимитер).
  - Нет дыры в RLS: share id не даёт `SELECT` чужих `books` / `notes` / progress списком; сырой файл / `content` книги не отдаётся.
  - Публичного каталога / индекса всех книг **нет**. Пиксели / Product Hunt / Telegram **не** добавлять.
- **Миграция:** только если Backend завёл таблицу снимков — безопасный SQL без `DROP`/`TRUNCATE`; RLS на снимок: публичное чтение **только** по id снимка (или эквивалент), без owner bypass чужих строк. Иначе — без новой миграции, зафиксировать в desk.
- **Стык:** payload и create — **BE-011**; UI — **FE-013** (после Ready BE+DO).
- **Вне объёма:** пиксели, SEO всех книг, новые `NEXT_PUBLIC_` секреты, смена PathNode, invite-for-a-heart.
- **Acceptance Criteria (DoD):**
  - [ ] Публичный share-URL не открывает чужую библиотеку и не отдаёт файл/content книги.
  - [ ] Rate-limit на публичный маршрут есть (или осознанный отказ с записью в desk, если маршрут только auth — тогда Marketer/BE должны были выбрать иначе; по умолчанию публичный снимок = лимит обязателен).
  - [ ] Новых имён секретов нет; пикселей нет; каталога всех книг нет.
  - [ ] PathNode / LessonRunner frozen.

SEC-001…008 по-прежнему `[x]` — не переоткрывать. DO-001 на доске не было (notes export опирался на существующий RLS).

## Правило миграций

Продакшен не обновлять через `npm run db:push` / `drizzle-kit push`. Push сравнивает schema.ts с живой базой и может удалить колонки и политики.

Порядок:

1. `npm run db:generate` — только после ревью schema.ts.
2. Прочитать SQL. `node scripts/security/check-migrations.mjs` падает на `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`.
3. На прод — осознанный `drizzle-kit migrate` или вставка в SQL Editor. Не push.
4. `scripts/security/rls-owner-policies.sql` применён к текущей базе 2026-09-29 через `node scripts/security/apply-rls.mjs` (одна транзакция). Повтор безопасен: `ENABLE` идемпотентен, дубликат политики гасится. Не прогонять поверх этого старые файлы `0000`–`0003`: там permissive-политика с demo-user, она снова откроет чужие строки.

`drizzle.config.ts` читает `.env.local`, затем `.env`. Секреты в лог не писать.

## Аудит RLS (живая база, 2026-09-29)

До применения: на всех 15 таблицах `public` RLS был выключен, политик не было. `anon` и `authenticated` имели `SELECT/INSERT/UPDATE/DELETE/TRUNCATE`. `TRUNCATE` не смотрит на RLS.

После `apply-rls.mjs`: RLS включён на всех 15 таблицах, по одной политике, demo-user в `qual` нет. `TRUNCATE` у `anon` и `authenticated` снят (0 грантов). Каталог `achievements` читается всем; остальные таблицы — только `authenticated` и только свои строки (`auth.uid()`).

`postgres` и `service_role` по-прежнему `rolbypassrls = true`. Каждый запрос через `getDb()` перед чтением делает `SET LOCAL ROLE authenticated` и ставит id сессии, поэтому server actions видят только строки этого пользователя. Прямой клиент `postgres` без этой обёртки политики не проходит. `FORCE ROW LEVEL SECURITY` не включался.

Покупок как таблицы нет. Жизни — `users_stats`, политика `users_stats_owner`. Прогресс — `user_node_progress_owner` (свой `user_id` и узел своей книги). Попытки — `quiz_attempts_owner`. Повторы — `review_logs_owner`.

Проверка экрана после применения: `/` открывается, книга на месте, «Жизни: 0 из 5», «Следующий шаг: Закрепление · Пары».

## Индексы карты уроков

Уже есть и совпадают с запросами тропы (`user_id` + `node_id`, `chapter_id` + `order_index`, `book_id` + `chapter_index`). Вместе с политиками добавлен `user_node_progress_node_id_idx` на `node_id` — для удаления узла.

Лидерборда в продукте нет (личная карта, без рейтинга). Индекс по `users_stats.xp` не добавлять, пока нет такого запроса.

## Секреты

- В git не коммитить `.env` / `.env.local` (уже в `.gitignore`).
- В браузер только `NEXT_PUBLIC_SUPABASE_URL` и anon key. Service role в репозитории не используется — не заводить `NEXT_PUBLIC_` для него.
- AI-ключи только на сервере.
- Upstash — см. `.env.example`. Оба значения нужны на проде, иначе генерация отвечает 503.

`.gitignore` больше не прячет `drizzle/*.sql`. Пока файлы не закоммичены, GitHub CI видит только то, что уже в репозитории. Локальный `check-migrations` читает каталог на диске.

## Что уже включено в код

- Заголовки в `next.config.ts`: `nosniff`, `DENY` frame, Referrer-Policy, Permissions-Policy, CSP. HSTS только при `VERCEL=1` (на локальном http его нет). `X-Powered-By` выключен.
- `POST /api/quiz/generate`: сессия, отказ чужому `Origin`, лимит, обрезка тела.
- Лимит до вызова модели: `generateQuestionsForNote` (12 / 10 мин), `buildLearningPath` и `generateBookMaterials` (6 / час на пользователя, общее окно `book-ai`).
- Прод без Upstash — отказ. Локально и в тестах — окно в памяти процесса (на Vercel оно не общее между инстансами, поэтому там нужен Upstash).
- `.github/workflows/ci.yml`: `npm ci`, скан SQL, `typecheck`, `vitest`.

## Очередь (SEC-аудит)

- [x] **SEC-001** В живых политиках нет demo-user. Старые SQL `0000`–`0003` его всё ещё содержат — не применять повторно.
- [x] **SEC-002** `scripts/security/rls-owner-policies.sql` применён. 15/15 таблиц с RLS, политика владельца, без demo-user.
- [x] **SEC-003** Запросы `getDb()` в одном заходе делят одно соединение: роль `authenticated` и id сессии ставятся один раз, не на каждый statement. Страница книги после этого ~16 с (было ~55 с) и рисует «2 из 104 шагов». Пул логинится как `postgres`; соединение возвращается с `RESET ROLE`.
- [x] **SEC-004** `drizzle/*.sql` больше не в `.gitignore`. CI увидит их после коммита. Локальный скан уже читает эти файлы.
- [x] **SEC-005** Проба Data API (`node scripts/security/rls-probe.mjs`): `anon` и чужой `authenticated` видят 0 строк в books/stats/progress/notes; владелец видит свои книги; REST с anon-ключом — 200 и 0 строк. Нагрузочный прогон тропы ещё не делался.
- [x] **SEC-006** CI typecheck + vitest + запрет разрушающего SQL.
- [x] **SEC-007** Security headers и `.env.example` без реальных ключей.
- [x] **SEC-008** Лимит генерации (Upstash в проде, память локально).

## Повторная проверка (idle, без новой карточки)

Прогон без правок кода/схемы (секреты в лог не писались):

- `node scripts/security/check-migrations.mjs` — ok, 13 sql files, нет `DROP TABLE` / `DROP SCHEMA` / `TRUNCATE`.
- `node scripts/security/rls-probe.mjs` — `pass: true`: anon и stranger по 0 строк (books/stats/progress/notes); `ownerSeesOwnBooks: true`; Data API anon key — status 200, 0 rows.

Существующие контроли (миграционный скан, RLS-проба, headers, rate limit) не ломались — ужесточать нечего. Код, UI, PathNode/LessonRunner не трогал.

## Не трогал

`PathNode`, props `LessonRunner`, схему Drizzle, журнал миграций. Политики применены отдельным скриптом, не через `drizzle-kit push`.
