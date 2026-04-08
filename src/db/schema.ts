import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// Enums
export const seriesTypeEnum = pgEnum("series_type", [
  "anime",
  "manga",
  "manhwa",
  "manhua",
  "novel",
  "movie",
  "tv_series",
  "drama",
  "other",
]);

export const seriesStatusEnum = pgEnum("series_status", [
  "ongoing",
  "completed",
  "hiatus",
]);

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "moderator",
  "admin",
]);

export const reportTargetTypeEnum = pgEnum("report_target_type", [
  "spoiler",
  "comment",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "resolved",
  "dismissed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_spoiler",
  "comment",
  "upvote",
]);

// Auth.js Tables
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").default("user"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// Content Tables
export const series = pgTable("series", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  type: seriesTypeEnum("type").notNull(),
  coverImage: text("cover_image"),
  synopsis: text("synopsis"),
  titleTh: text("title_th"),
  synopsisTh: text("synopsis_th"),
  latestChapter: text("latest_chapter"),
  latestChapterDate: text("latest_chapter_date"),
  releaseDay: text("release_day"),
  status: seriesStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const genres = pgTable("genres", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const seriesGenres = pgTable(
  "series_genres",
  {
    seriesId: text("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    genreId: text("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (sg) => [primaryKey({ columns: [sg.seriesId, sg.genreId] })]
);

export const spoilers = pgTable("spoilers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  seriesId: text("series_id")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  chapter: text("chapter"),
  slug: text("slug").notNull().unique(),
  upvoteCount: integer("upvote_count").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  spoilerId: text("spoiler_id")
    .notNull()
    .references(() => spoilers.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const votes = pgTable(
  "votes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    spoilerId: text("spoiler_id")
      .notNull()
      .references(() => spoilers.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
  },
  (v) => [uniqueIndex("votes_spoiler_user_idx").on(v.spoilerId, v.userId)]
);

// Engagement Tables
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seriesId: text("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (b) => [uniqueIndex("bookmarks_user_series_idx").on(b.userId, b.seriesId)]
);

export const reports = pgTable("reports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  spoilers: many(spoilers),
  comments: many(comments),
  votes: many(votes),
  bookmarks: many(bookmarks),
  notifications: many(notifications),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  spoilers: many(spoilers),
  seriesGenres: many(seriesGenres),
  bookmarks: many(bookmarks),
}));

export const spoilersRelations = relations(spoilers, ({ one, many }) => ({
  series: one(series, {
    fields: [spoilers.seriesId],
    references: [series.id],
  }),
  author: one(users, {
    fields: [spoilers.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  votes: many(votes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  spoiler: one(spoilers, {
    fields: [comments.spoilerId],
    references: [spoilers.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  spoiler: one(spoilers, {
    fields: [votes.spoilerId],
    references: [spoilers.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  series: one(series, {
    fields: [bookmarks.seriesId],
    references: [series.id],
  }),
}));

export const seriesGenresRelations = relations(seriesGenres, ({ one }) => ({
  series: one(series, {
    fields: [seriesGenres.seriesId],
    references: [series.id],
  }),
  genre: one(genres, {
    fields: [seriesGenres.genreId],
    references: [genres.id],
  }),
}));
