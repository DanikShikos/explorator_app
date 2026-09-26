-- Explorator MVP schema for Supabase Postgres.
-- Apply in SQL Editor or via drizzle-kit push.

create type "question_type" as enum ('multiple_choice', 'open_ended');

create table if not exists "notes" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "title" text not null,
  "content" text not null default '',
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index if not exists "notes_user_id_idx" on "notes" ("user_id");
create index if not exists "notes_user_updated_idx" on "notes" ("user_id", "updated_at");

create table if not exists "quiz_cards" (
  "id" uuid primary key default gen_random_uuid(),
  "note_id" uuid not null references "notes"("id") on delete cascade,
  "user_id" uuid not null,
  "type" "question_type" not null,
  "question" text not null,
  "options" jsonb default null,
  "answer" text not null,
  "explanation" text,
  "due" timestamptz not null default now(),
  "stability" real not null default 0,
  "difficulty" real not null default 0,
  "elapsed_days" integer not null default 0,
  "scheduled_days" integer not null default 0,
  "learning_steps" integer not null default 0,
  "reps" integer not null default 0,
  "lapses" integer not null default 0,
  "state" integer not null default 0,
  "last_review" timestamptz,
  "created_at" timestamptz not null default now()
);

create index if not exists "quiz_cards_user_due_idx" on "quiz_cards" ("user_id", "due");
create index if not exists "quiz_cards_note_id_idx" on "quiz_cards" ("note_id");

create table if not exists "review_logs" (
  "id" uuid primary key default gen_random_uuid(),
  "card_id" uuid not null references "quiz_cards"("id") on delete cascade,
  "user_id" uuid not null,
  "rating" integer not null,
  "state" integer not null,
  "reviewed_at" timestamptz not null default now()
);

create index if not exists "review_logs_user_reviewed_idx" on "review_logs" ("user_id", "reviewed_at");
create index if not exists "review_logs_card_id_idx" on "review_logs" ("card_id");

alter table "notes" enable row level security;
alter table "quiz_cards" enable row level security;
alter table "review_logs" enable row level security;

create policy "notes_owner" on "notes"
  for all using (auth.uid() = user_id or user_id = '00000000-0000-4000-8000-000000000001')
  with check (auth.uid() = user_id or user_id = '00000000-0000-4000-8000-000000000001');

create policy "quiz_cards_owner" on "quiz_cards"
  for all using (auth.uid() = user_id or user_id = '00000000-0000-4000-8000-000000000001')
  with check (auth.uid() = user_id or user_id = '00000000-0000-4000-8000-000000000001');

create policy "review_logs_owner" on "review_logs"
  for all using (auth.uid() = user_id or user_id = '00000000-0000-4000-8000-000000000001')
  with check (auth.uid() = user_id or user_id = '00000000-0000-4000-8000-000000000001');
