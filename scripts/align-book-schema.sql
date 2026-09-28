-- Align the existing Supabase project with the book schema.
-- Safe to re-run. Does not drop data.

DO $$ BEGIN
  CREATE TYPE public.book_format AS ENUM ('fb2', 'epub', 'pdf', 'txt');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.books
SET title = left(title, 500),
    author = left(author, 300),
    format = CASE
      WHEN lower(coalesce(format, '')) IN ('fb2', 'epub', 'pdf', 'txt') THEN lower(format)
      ELSE 'txt'
    END;

ALTER TABLE public.books
  ALTER COLUMN title TYPE varchar(500),
  ALTER COLUMN author TYPE varchar(300);

ALTER TABLE public.books
  ALTER COLUMN format TYPE public.book_format USING format::public.book_format;
ALTER TABLE public.books ALTER COLUMN format SET NOT NULL;

ALTER TABLE public.book_chapters ADD COLUMN IF NOT EXISTS chapter_index integer;
ALTER TABLE public.book_chapters ADD COLUMN IF NOT EXISTS read_time_minutes integer DEFAULT 1;

UPDATE public.book_chapters SET title = 'Глава' WHERE title IS NULL OR btrim(title) = '';
UPDATE public.book_chapters SET content = '' WHERE content IS NULL;
UPDATE public.book_chapters SET content_summary = '' WHERE content_summary IS NULL;

WITH ranked AS (
  SELECT id, (row_number() OVER (PARTITION BY book_id ORDER BY created_at NULLS LAST, id) - 1)::int AS idx
  FROM public.book_chapters
)
UPDATE public.book_chapters AS chapter
SET chapter_index = ranked.idx
FROM ranked
WHERE chapter.id = ranked.id
  AND chapter.chapter_index IS NULL;

UPDATE public.book_chapters SET read_time_minutes = 1 WHERE read_time_minutes IS NULL;

ALTER TABLE public.book_chapters ALTER COLUMN content SET DEFAULT '';
ALTER TABLE public.book_chapters ALTER COLUMN content_summary SET DEFAULT '';
ALTER TABLE public.book_chapters ALTER COLUMN read_time_minutes SET DEFAULT 1;
ALTER TABLE public.book_chapters ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.book_chapters ALTER COLUMN content SET NOT NULL;
ALTER TABLE public.book_chapters ALTER COLUMN content_summary SET NOT NULL;
ALTER TABLE public.book_chapters ALTER COLUMN chapter_index SET NOT NULL;
ALTER TABLE public.book_chapters ALTER COLUMN read_time_minutes SET NOT NULL;

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS chapter_id uuid;

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  quiz_id uuid NOT NULL,
  book_id uuid NOT NULL,
  chapter_id uuid,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer_index integer NOT NULL,
  explanation text DEFAULT '' NOT NULL,
  order_index integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  book_id uuid NOT NULL,
  chapter_id uuid,
  user_id uuid NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  next_review_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS quiz_id uuid;

DO $$ BEGIN
  ALTER TABLE public.quizzes
    ADD CONSTRAINT quizzes_chapter_id_book_chapters_id_fk
    FOREIGN KEY (chapter_id) REFERENCES public.book_chapters(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_quizzes_id_fk
    FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.quiz_questions
    ADD CONSTRAINT quiz_questions_book_id_books_id_fk
    FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.quiz_questions
    ADD CONSTRAINT quiz_questions_chapter_id_book_chapters_id_fk
    FOREIGN KEY (chapter_id) REFERENCES public.book_chapters(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.flashcards
    ADD CONSTRAINT flashcards_book_id_books_id_fk
    FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.flashcards
    ADD CONSTRAINT flashcards_chapter_id_book_chapters_id_fk
    FOREIGN KEY (chapter_id) REFERENCES public.book_chapters(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_quizzes_id_fk
    FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS book_chapters_book_idx ON public.book_chapters (book_id);
CREATE INDEX IF NOT EXISTS book_chapters_book_order_idx ON public.book_chapters (book_id, chapter_index);
CREATE INDEX IF NOT EXISTS books_user_id_idx ON public.books (user_id);
CREATE INDEX IF NOT EXISTS books_user_updated_idx ON public.books (user_id, updated_at);
CREATE INDEX IF NOT EXISTS flashcards_user_due_idx ON public.flashcards (user_id, next_review_at);
CREATE INDEX IF NOT EXISTS flashcards_book_idx ON public.flashcards (book_id);
CREATE INDEX IF NOT EXISTS quiz_questions_quiz_idx ON public.quiz_questions (quiz_id, order_index);
CREATE INDEX IF NOT EXISTS quiz_questions_book_idx ON public.quiz_questions (book_id);
CREATE INDEX IF NOT EXISTS quizzes_book_idx ON public.quizzes (book_id);
CREATE INDEX IF NOT EXISTS quizzes_chapter_idx ON public.quizzes (chapter_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_quiz_idx ON public.quiz_attempts (quiz_id);
