-- Gamification and learning activity tables.
create table if not exists "users_stats" (
  "user_id" uuid primary key,
  "xp" integer not null default 0,
  "level" integer not null default 1,
  "streak_count" integer not null default 0,
  "last_active_at" timestamptz,
  "daily_goal_xp" integer not null default 50
);

create table if not exists "achievements" (
  "id" uuid primary key default gen_random_uuid(),
  "code" varchar(100) not null unique,
  "title" text not null,
  "description" text not null,
  "icon" text not null,
  "xp_reward" integer not null default 0
);

create table if not exists "user_achievements" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "achievement_id" uuid not null references "achievements"("id") on delete cascade,
  "unlocked_at" timestamptz not null default now(),
  unique ("user_id", "achievement_id")
);

create table if not exists "reminders" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "reminder_time" varchar(5) not null,
  "days_of_week" jsonb not null default '[]'::jsonb,
  "is_enabled" boolean not null default true
);

create table if not exists "quiz_attempts" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "note_id" uuid references "notes"("id") on delete set null,
  "score" integer not null,
  "total_questions" integer not null,
  "correct_answers" integer not null,
  "xp_earned" integer not null default 0,
  "created_at" timestamptz not null default now()
);

create index if not exists "user_achievements_user_idx" on "user_achievements" ("user_id");
create index if not exists "reminders_user_idx" on "reminders" ("user_id");
create index if not exists "quiz_attempts_user_created_idx" on "quiz_attempts" ("user_id", "created_at");
create index if not exists "quiz_attempts_note_idx" on "quiz_attempts" ("note_id");

alter table "users_stats" enable row level security;
alter table "achievements" enable row level security;
alter table "user_achievements" enable row level security;
alter table "reminders" enable row level security;
alter table "quiz_attempts" enable row level security;

create policy "users_stats_owner" on "users_stats"
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "achievements_read" on "achievements"
  for select using (true);

create policy "user_achievements_owner" on "user_achievements"
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reminders_owner" on "reminders"
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quiz_attempts_owner" on "quiz_attempts"
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into "achievements" ("code", "title", "description", "icon", "xp_reward") values
  ('first_note', 'Первый шаг', 'Создайте первую заметку', 'NotebookPen', 25),
  ('quiz_master_5', 'Пять побед', 'Пройдите пять тестов', 'Trophy', 50),
  ('streak_7_days', 'Неделя в строю', 'Учитесь семь дней подряд', 'Flame', 100),
  ('perfect_quiz', 'Без ошибок', 'Завершите тест со 100% правильных ответов', 'Sparkles', 30)
on conflict ("code") do nothing;
