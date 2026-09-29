-- BUG-S02: RLS + owner policies for lesson_nodes / user_node_progress.
-- Matches scripts/security/rls-owner-policies.sql (live apply). No demo-UUID bypass.

alter table "lesson_nodes" enable row level security;
alter table "user_node_progress" enable row level security;

-- lesson_nodes has no user_id; ownership via chapter → book.
create policy "lesson_nodes_owner" on "lesson_nodes"
  for all using (exists (
    select 1 from "book_chapters" c
    join "books" b on b.id = c.book_id
    where c.id = chapter_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from "book_chapters" c
    join "books" b on b.id = c.book_id
    where c.id = chapter_id and b.user_id = auth.uid()
  ));

-- Progress rows are owner-scoped by user_id and must reference a node in an owned book.
create policy "user_node_progress_owner" on "user_node_progress"
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from "lesson_nodes" n
      join "book_chapters" c on c.id = n.chapter_id
      join "books" b on b.id = c.book_id
      where n.id = node_id and b.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from "lesson_nodes" n
      join "book_chapters" c on c.id = n.chapter_id
      join "books" b on b.id = c.book_id
      where n.id = node_id and b.user_id = auth.uid()
    )
  );
