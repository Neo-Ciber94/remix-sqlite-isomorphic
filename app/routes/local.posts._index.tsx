import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { count, eq, InferSelectModel } from "drizzle-orm";
import { useCallback, useEffect, useRef, useState } from "react";
import { posts, comments } from "~/lib/db/schema";
import { loadDatabase } from "~/lib/db/client";

export const meta: MetaFunction = () => {
  return [{ title: "Posts (Client)" }];
};

type Post = InferSelectModel<typeof posts> & { commentCount: number };

export default function PostsClientPage() {
  const { data: allPosts, isLoading, invalidate } = usePosts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionData, setActionData] = useState<{ error: string } | null>(null);

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();

    try {
      setIsSubmitting(true);
      const data = new FormData(ev.currentTarget);
      const title = data.get("title");
      const content = data.get("content");

      if (typeof title !== "string" || title.trim().length === 0) {
        return setActionData({ error: "Title is required" });
      }

      if (typeof content !== "string" || content.trim().length === 0) {
        return setActionData({ error: "Content is required" });
      }

      const db = await loadDatabase();
      await db.insert(posts).values({ title, content }).returning();
      await db.$write();
      invalidate();
    } catch (err) {
      console.error(err);
      setActionData({ error: "Failed to add post" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Posts (Local)</h1>
      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Title" required />
        <br />

        <textarea name="content" placeholder="Content" required></textarea>
        <br />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create"}
        </button>
        <br />

        {actionData?.error && (
          <small style={{ color: "red" }}>{actionData.error}</small>
        )}
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {isLoading && <h1>Loading...</h1>}
        {!isLoading && allPosts.length === 0 && <h1>No posts available</h1>}

        {allPosts.map((post) => {
          return (
            <Link
              key={post.id}
              to={`/local/posts/${post.id}`}
              style={{ padding: 4, border: "1px solid #ccc" }}
            >
              <h3>{post.title}</h3>
              <small>
                Published on: {new Date(post.createdAt).toDateString()}
              </small>
              <br />
              <small>{post.commentCount} comments</small>
              <br />
              <p>{post.content}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function usePosts() {
  const isInit = useRef(false);
  const [data, setData] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const invalidate = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await loadDatabase();
      const result = await db
        .select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          createdAt: posts.createdAt,
          commentCount: count(comments.id),
        })
        .from(posts)
        .leftJoin(comments, eq(comments.postId, posts.id))
        .groupBy(posts.id);

      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInit.current) {
      return;
    }

    isInit.current = true;
    invalidate().catch(console.error);
  }, [invalidate]);

  return { data, isLoading, invalidate };
}
