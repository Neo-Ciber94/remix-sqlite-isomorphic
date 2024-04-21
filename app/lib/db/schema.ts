import { text, sqliteTable } from "drizzle-orm/sqlite-core";
import * as columns from "./columns";
import { relations } from "drizzle-orm";

export const posts = sqliteTable("post", {
  id: columns.uuid("post_id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: columns
    .date("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const comments = sqliteTable("comment", {
  id: columns.uuid("comment_id").primaryKey(),
  postId: columns
    .uuid("post_id")
    .notNull()
    .references(() => posts.id),
  content: text("content").notNull(),
  createdAt: columns
    .date("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const postRelations = relations(posts, ({ many }) => ({
  comments: many(comments),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));
