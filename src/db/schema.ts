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
export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    format: text("format"),
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
  ]
);
export const bookChapters = pgTable(
  "book_chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
    title: text("title"),
    content: text("content"),
    contentSummary: text("content_summary").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("book_chapters_book_idx").on(table.bookId)]
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("quizzes_book_idx").on(table.bookId)]
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
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    type: questionTypeEnum("type").notNull(),
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
