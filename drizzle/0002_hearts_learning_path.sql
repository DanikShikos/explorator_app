ALTER TABLE users_stats ADD COLUMN IF NOT EXISTS hearts integer NOT NULL DEFAULT 5;
ALTER TABLE users_stats ADD COLUMN IF NOT EXISTS max_hearts integer NOT NULL DEFAULT 5;
ALTER TABLE users_stats ADD COLUMN IF NOT EXISTS last_heart_refill_at timestamptz;

DO $$ BEGIN
  CREATE TYPE lesson_node_type AS ENUM (
    'summary_read',
    'quiz_sprint',
    'flashcard_review',
    'boss_challenge',
    'practice_review'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE node_progress_status AS ENUM ('locked', 'available', 'completed', 'mastered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_type AS ENUM ('multiple_choice', 'matching_pairs', 'fill_blank', 'sequence_order');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS lesson_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES book_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  node_type lesson_node_type NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 20,
  is_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_nodes_chapter_order_idx ON lesson_nodes (chapter_id, order_index);

CREATE TABLE IF NOT EXISTS user_node_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  status node_progress_status NOT NULL DEFAULT 'locked',
  score integer,
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS user_node_progress_unique_idx ON user_node_progress (user_id, node_id);
CREATE INDEX IF NOT EXISTS user_node_progress_user_idx ON user_node_progress (user_id);

ALTER TABLE quiz_cards ALTER COLUMN note_id DROP NOT NULL;
ALTER TABLE quiz_cards ADD COLUMN IF NOT EXISTS node_id uuid REFERENCES lesson_nodes(id) ON DELETE CASCADE;
ALTER TABLE quiz_cards ADD COLUMN IF NOT EXISTS exercise_type exercise_type;
ALTER TABLE quiz_cards ADD COLUMN IF NOT EXISTS content_data jsonb;
CREATE INDEX IF NOT EXISTS quiz_cards_node_id_idx ON quiz_cards (node_id);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_nodes_chapter_order_unique ON lesson_nodes (chapter_id, order_index);
