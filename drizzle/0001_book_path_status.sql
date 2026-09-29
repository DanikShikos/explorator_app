-- BE-006/007: book-level learning path gate status.
DO $$ BEGIN
  CREATE TYPE "book_path_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "books"
  ADD COLUMN IF NOT EXISTS "path_status" "book_path_status" NOT NULL DEFAULT 'pending';
