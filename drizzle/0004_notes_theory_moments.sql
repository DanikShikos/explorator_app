-- BE-010: theory moments + definitions provenance on notes.
DO $$ BEGIN
  CREATE TYPE "note_source_kind" AS ENUM ('theory_moment', 'definition', 'freeform');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- If enum existed without 'definition', add it (outside DO — PG ADD VALUE).
ALTER TYPE "note_source_kind" ADD VALUE IF NOT EXISTS 'definition';

ALTER TABLE "notes"
  ADD COLUMN IF NOT EXISTS "book_id" uuid REFERENCES "books"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "node_id" uuid REFERENCES "lesson_nodes"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "source_kind" "note_source_kind" DEFAULT 'freeform',
  ADD COLUMN IF NOT EXISTS "term" text,
  ADD COLUMN IF NOT EXISTS "card_index" integer,
  ADD COLUMN IF NOT EXISTS "reviewed_at" timestamptz;

CREATE INDEX IF NOT EXISTS "notes_user_book_idx" ON "notes" ("user_id", "book_id");
