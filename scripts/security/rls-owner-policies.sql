-- Owner policies for the Supabase Data API.
-- Applied once policies were confirmed absent and anon/authenticated had full grants.
-- No DROP TABLE. No demo-user exception. postgres/service_role still bypass RLS.
-- Statements are split on a line that is exactly: -- statement

-- statement
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "books" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "book_chapters" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "flashcards" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "lesson_nodes" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "quiz_cards" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "quiz_questions" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "quizzes" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "review_logs" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "user_achievements" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "user_node_progress" ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE "users_stats" ENABLE ROW LEVEL SECURITY;

-- statement
DO $$
BEGIN
  CREATE POLICY "achievements_read" ON "achievements"
    FOR SELECT TO anon, authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "books_owner" ON "books"
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "book_chapters_owner" ON "book_chapters"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "books" b
        WHERE b.id = book_id AND b.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "books" b
        WHERE b.id = book_id AND b.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "flashcards_owner" ON "flashcards"
    FOR ALL TO authenticated
    USING (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM "books" b
        WHERE b.id = book_id AND b.user_id = auth.uid()
      )
    )
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM "books" b
        WHERE b.id = book_id AND b.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "lesson_nodes_owner" ON "lesson_nodes"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "book_chapters" c
        JOIN "books" b ON b.id = c.book_id
        WHERE c.id = chapter_id AND b.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "book_chapters" c
        JOIN "books" b ON b.id = c.book_id
        WHERE c.id = chapter_id AND b.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "notes_owner" ON "notes"
    FOR ALL TO authenticated
    USING (
      auth.uid() = user_id
      AND (
        book_id IS NULL
        OR EXISTS (SELECT 1 FROM "books" b WHERE b.id = book_id AND b.user_id = auth.uid())
      )
    )
    WITH CHECK (
      auth.uid() = user_id
      AND (
        book_id IS NULL
        OR EXISTS (SELECT 1 FROM "books" b WHERE b.id = book_id AND b.user_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "quiz_attempts_owner" ON "quiz_attempts"
    FOR ALL TO authenticated
    USING (
      auth.uid() = user_id
      AND (
        quiz_id IS NULL
        OR EXISTS (
          SELECT 1 FROM "quizzes" q
          JOIN "books" b ON b.id = q.book_id
          WHERE q.id = quiz_id AND b.user_id = auth.uid()
        )
      )
    )
    WITH CHECK (
      auth.uid() = user_id
      AND (
        quiz_id IS NULL
        OR EXISTS (
          SELECT 1 FROM "quizzes" q
          JOIN "books" b ON b.id = q.book_id
          WHERE q.id = quiz_id AND b.user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "quiz_cards_owner" ON "quiz_cards"
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "quiz_questions_owner" ON "quiz_questions"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "books" b
        WHERE b.id = book_id AND b.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "books" b
        WHERE b.id = book_id AND b.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "quizzes_owner" ON "quizzes"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "books" b
        WHERE b.id = book_id AND b.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "books" b
        WHERE b.id = book_id AND b.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "reminders_owner" ON "reminders"
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "review_logs_owner" ON "review_logs"
    FOR ALL TO authenticated
    USING (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM "quiz_cards" c
        WHERE c.id = card_id AND c.user_id = auth.uid()
      )
    )
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM "quiz_cards" c
        WHERE c.id = card_id AND c.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "user_achievements_owner" ON "user_achievements"
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "user_node_progress_owner" ON "user_node_progress"
    FOR ALL TO authenticated
    USING (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM "lesson_nodes" n
        JOIN "book_chapters" c ON c.id = n.chapter_id
        JOIN "books" b ON b.id = c.book_id
        WHERE n.id = node_id AND b.user_id = auth.uid()
      )
    )
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM "lesson_nodes" n
        JOIN "book_chapters" c ON c.id = n.chapter_id
        JOIN "books" b ON b.id = c.book_id
        WHERE n.id = node_id AND b.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
DO $$
BEGIN
  CREATE POLICY "users_stats_owner" ON "users_stats"
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
CREATE INDEX IF NOT EXISTS "user_node_progress_node_id_idx"
  ON "user_node_progress" ("node_id");

-- statement
DO $$
BEGIN
  CREATE POLICY "achievements_seed_insert" ON "achievements"
    FOR INSERT TO authenticated
    WITH CHECK (code IN (
      'first_note',
      'quiz_master_5',
      'streak_7_days',
      'perfect_quiz',
      'first_book_read',
      'fb2_master',
      'quiz_100_percent'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- statement
REVOKE TRUNCATE ON TABLE
  "achievements", "books", "book_chapters", "flashcards", "lesson_nodes",
  "notes", "quiz_attempts", "quiz_cards", "quiz_questions", "quizzes",
  "reminders", "review_logs", "user_achievements", "user_node_progress", "users_stats"
FROM anon, authenticated;
