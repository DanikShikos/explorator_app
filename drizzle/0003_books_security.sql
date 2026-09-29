-- Owner policies for the new book-learning tables (no shared demo UUID).
alter table "books" enable row level security;
alter table "book_chapters" enable row level security;
alter table "quizzes" enable row level security;
alter table "quiz_questions" enable row level security;
alter table "flashcards" enable row level security;

create policy "books_owner" on "books"
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "book_chapters_owner" on "book_chapters"
  for all using (exists (
    select 1 from "books" b
    where b.id = book_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from "books" b
    where b.id = book_id and b.user_id = auth.uid()
  ));

create policy "quizzes_owner" on "quizzes"
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from "books" b
      where b.id = book_id and b.user_id = quizzes.user_id
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from "books" b
      where b.id = book_id and b.user_id = quizzes.user_id
    )
  );

create policy "quiz_questions_owner" on "quiz_questions"
  for all using (exists (
    select 1 from "quizzes" q
    where q.id = quiz_id and q.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from "quizzes" q
    where q.id = quiz_id and q.user_id = auth.uid()
  ));

create policy "flashcards_owner" on "flashcards"
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from "books" b
      where b.id = book_id and b.user_id = flashcards.user_id
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from "books" b
      where b.id = book_id and b.user_id = flashcards.user_id
    )
  );

-- Preserve legacy note attempts while preventing attempts from referencing another user's quiz.
drop policy if exists "quiz_attempts_owner" on "quiz_attempts";
create policy "quiz_attempts_owner" on "quiz_attempts"
  for all using (
    auth.uid() = user_id
    and (quiz_id is null or exists (
      select 1 from "quizzes" q
      where q.id = quiz_id and q.user_id = quiz_attempts.user_id
    ))
  )
  with check (
    auth.uid() = user_id
    and (quiz_id is null or exists (
      select 1 from "quizzes" q
      where q.id = quiz_id and q.user_id = quiz_attempts.user_id
    ))
  );

insert into "achievements" ("code", "title", "description", "icon", "xp_reward") values
  ('first_book_read', 'Первая книга', 'Завершите первый тест по книге', 'BookOpen', 25),
  ('fb2_master', 'Знаток FB2', 'Получите 100% в тесте по книге FB2', 'BookCheck', 30),
  ('quiz_100_percent', 'Идеальный результат', 'Получите 100% в тесте по книге', 'Sparkles', 40)
on conflict ("code") do nothing;
