import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Question formats produced by the AI generator.
 */
export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "open_ended",
]);

export const bookFormatEnum = pgEnum("book_format", ["fb2", "epub", "pdf", "txt"]);

export const lessonNodeTypeEnum = pgEnum("lesson_node_type", [
  "summary_read",
  "quiz_sprint",
  "flashcard_review",
  "boss_challenge",
  "practice_review",
]);

export const nodeProgressStatusEnum = pgEnum("node_progress_status", [
  "locked",
  "available",
  "completed",
  "mastered",
]);

export const exerciseTypeEnum = pgEnum("exercise_type", [
  "multiple_choice",
  "matching_pairs",
  "fill_blank",
  "sequence_order",
]);

export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    author: varchar("author", { length: 300 }),
    format: bookFormatEnum("format").notNull(),
    coverUrl: text("cover_url"),
    fileUrl: text("file_url"),
    rawText: text("raw_text"),
    overallSummary: text("overall_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("books_user_id_idx").on(table.userId),
    index("books_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const bookChapters = pgTable(
  "book_chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterIndex: integer("chapter_index").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    contentSummary: text("content_summary").notNull().default(""),
    readTimeMinutes: integer("read_time_minutes").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("book_chapters_book_idx").on(table.bookId),
    index("book_chapters_book_order_idx").on(table.bookId, table.chapterIndex),
  ],
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => bookChapters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("quizzes_book_idx").on(table.bookId),
    index("quizzes_chapter_idx").on(table.chapterId),
  ],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => bookChapters.id, { onDelete: "set null" }),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctAnswerIndex: integer("correct_answer_index").notNull(),
    explanation: text("explanation").notNull().default(""),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    index("quiz_questions_quiz_idx").on(table.quizId, table.orderIndex),
    index("quiz_questions_book_idx").on(table.bookId),
  ],
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => bookChapters.id, { onDelete: "set null" }),
    userId: uuid("user_id").notNull(),
    front: text("front").notNull(),
    back: text("back").notNull(),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("flashcards_user_due_idx").on(table.userId, table.nextReviewAt),
    index("flashcards_book_idx").on(table.bookId),
  ],
);

export const bookAchievementSeeds = [
  {
    code: "first_book_read",
    title: "Первая книга",
    description: "Загрузите и разберите первую книгу",
    icon: "book-open",
    xpReward: 50,
  },
  {
    code: "fb2_master",
    title: "Мастер FB2",
    description: "Загрузите пять книг в формате FB2",
    icon: "library",
    xpReward: 100,
  },
  {
    code: "quiz_100_percent",
    title: "Идеальный тест",
    description: "Пройдите тест по книге без ошибок",
    icon: "trophy",
    xpReward: 80,
  },
] as const;

export const lessonNodes = pgTable(
  "lesson_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => bookChapters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    nodeType: lessonNodeTypeEnum("node_type").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    xpReward: integer("xp_reward").notNull().default(20),
    isGenerated: boolean("is_generated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("lesson_nodes_chapter_order_idx").on(table.chapterId, table.orderIndex),
  ],
);

export const userNodeProgress = pgTable(
  "user_node_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => lessonNodes.id, { onDelete: "cascade" }),
    status: nodeProgressStatusEnum("status").notNull().default("locked"),
    score: integer("score"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("user_node_progress_user_idx").on(table.userId),
    uniqueIndex("user_node_progress_unique_idx").on(table.userId, table.nodeId),
  ],
);

/**
 * Markdown notes owned by a Supabase Auth user (`auth.users.id`).
 */
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notes_user_id_idx").on(table.userId),
    index("notes_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

/**
 * Quiz items generated from a note, plus FSRS scheduling fields
 * matching `Card` from `ts-fsrs`.
 */
export const quizCards = pgTable(
  "quiz_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "cascade" }),
    nodeId: uuid("node_id").references(() => lessonNodes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    type: questionTypeEnum("type").notNull(),
    exerciseType: exerciseTypeEnum("exercise_type"),
    contentData: jsonb("content_data").$type<Record<string, unknown> | null>(),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[] | null>().default(null),
    answer: text("answer").notNull(),
    explanation: text("explanation"),
    due: timestamp("due", { withTimezone: true }).defaultNow().notNull(),
    stability: real("stability").notNull().default(0),
    difficulty: real("difficulty").notNull().default(0),
    elapsedDays: integer("elapsed_days").notNull().default(0),
    scheduledDays: integer("scheduled_days").notNull().default(0),
    learningSteps: integer("learning_steps").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    state: integer("state").notNull().default(0),
    lastReview: timestamp("last_review", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("quiz_cards_user_due_idx").on(table.userId, table.due),
    index("quiz_cards_note_id_idx").on(table.noteId),
    index("quiz_cards_node_id_idx").on(table.nodeId),
  ],
);

/**
 * History of FSRS ratings (Again / Hard / Good / Easy).
 * `ts-fsrs` Rating: 1 Again · 2 Hard · 3 Good · 4 Easy
 */
export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => quizCards.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    rating: integer("rating").notNull(),
    state: integer("state").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("review_logs_user_reviewed_idx").on(table.userId, table.reviewedAt),
    index("review_logs_card_id_idx").on(table.cardId),
  ],
);

export const usersStats = pgTable("users_stats", {
  userId: uuid("user_id").primaryKey(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakCount: integer("streak_count").notNull().default(0),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  dailyGoalXp: integer("daily_goal_xp").notNull().default(50),
  hearts: integer("hearts").notNull().default(5),
  maxHearts: integer("max_hearts").notNull().default(5),
  lastHeartRefillAt: timestamp("last_heart_refill_at", { withTimezone: true }),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  xpReward: integer("xp_reward").notNull().default(0),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("user_achievements_user_idx").on(table.userId),
    index("user_achievements_unique_idx").on(table.userId, table.achievementId),
  ],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    reminderTime: varchar("reminder_time", { length: 5 }).notNull(),
    daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull().default([]),
    isEnabled: boolean("is_enabled").notNull().default(true),
  },
  (table) => [index("reminders_user_idx").on(table.userId)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "set null" }),
    quizId: uuid("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }), // Добавьте это поле
    score: integer("score").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    correctAnswers: integer("correct_answers").notNull(),
    xpEarned: integer("xp_earned").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("quiz_attempts_user_created_idx").on(table.userId, table.createdAt),
    index("quiz_attempts_note_idx").on(table.noteId),
    index("quiz_attempts_quiz_idx").on(table.quizId), // Добавьте индекс
  ],
);

export const booksRelations = relations(books, ({ many }) => ({
  chapters: many(bookChapters),
  quizzes: many(quizzes),
  flashcards: many(flashcards),
}));

export const bookChaptersRelations = relations(bookChapters, ({ one, many }) => ({
  book: one(books, { fields: [bookChapters.bookId], references: [books.id] }),
  quizzes: many(quizzes),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  book: one(books, { fields: [quizzes.bookId], references: [books.id] }),
  chapter: one(bookChapters, { fields: [quizzes.chapterId], references: [bookChapters.id] }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
  book: one(books, { fields: [quizQuestions.bookId], references: [books.id] }),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  book: one(books, { fields: [flashcards.bookId], references: [books.id] }),
}));

export const notesRelations = relations(notes, ({ many }) => ({
  quizCards: many(quizCards),
}));

export const quizCardsRelations = relations(quizCards, ({ one, many }) => ({
  note: one(notes, {
    fields: [quizCards.noteId],
    references: [notes.id],
  }),
  reviewLogs: many(reviewLogs),
}));

export const reviewLogsRelations = relations(reviewLogs, ({ one }) => ({
  card: one(quizCards, {
    fields: [reviewLogs.cardId],
    references: [quizCards.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type BookChapter = typeof bookChapters.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type Flashcard = typeof flashcards.$inferSelect;
export type LessonNode = typeof lessonNodes.$inferSelect;
export type UserNodeProgress = typeof userNodeProgress.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type QuizCard = typeof quizCards.$inferSelect;
export type NewQuizCard = typeof quizCards.$inferInsert;
export type ReviewLog = typeof reviewLogs.$inferSelect;
export type UserStats = typeof usersStats.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
