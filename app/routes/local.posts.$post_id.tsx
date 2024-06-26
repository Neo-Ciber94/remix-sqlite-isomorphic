import { useParams } from "@remix-run/react";
import { eq, InferSelectModel } from "drizzle-orm";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadDatabase } from "~/lib/db/client";
import { comments, posts } from "~/lib/db/schema";

type Comment = InferSelectModel<typeof comments>;
type Post = InferSelectModel<typeof posts> & { comments: Comment[] };

export default function LocalPostDetailPage() {
  const { post_id } = useParams();
  const { data: post, isLoading, invalidate } = usePostById(String(post_id));
  const [actionData, setActionData] = useState<{ error: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();

    try {
      setIsSubmitting(true);

      const data = new FormData(ev.currentTarget);
      const content = data.get("content");

      if (typeof content !== "string" || content.trim().length === 0) {
        setActionData({ error: "Content is required" });
        return;
      }

      const db = await loadDatabase();
      await db.insert(comments).values({
        postId: post_id,
        content,
      });

      await db.$write();
      invalidate();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <h1>Loading...</h1>;
  }

  if (post == null) {
    return <h1>Post not found</h1>;
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <h3>{post.id}</h3>
      <p>{post.content}</p>

      <div>
        <h2>Comments</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {post.comments.length === 0 && <h2>No comments</h2>}
          {post.comments.map((comment) => {
            return (
              <small
                key={comment.id}
                style={{ padding: 2, border: "1px solid #ccc" }}
              >
                {comment.content}
              </small>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          <textarea name="content" placeholder="Comment..." required></textarea>
          <br />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Comment"}
          </button>

          <br />
          {actionData?.error && (
            <small style={{ color: "red" }}>{actionData.error}</small>
          )}
        </form>
      </div>
    </div>
  );
}

function usePostById(postId: string) {
  const isInit = useRef(false);
  const [data, setData] = useState<Post>();
  const [isLoading, setIsLoading] = useState(true);

  const invalidate = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await loadDatabase();
      const results = db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .leftJoin(comments, eq(comments.postId, postId))
        .all();

      const result = results.reduce<Post | undefined>((prev, obj) => {
        if (obj.post == null) {
          return prev;
        }

        if (!prev) {
          return { ...obj.post, comments: [] };
        }

        if (obj.comment) {
          return {
            id: prev.id,
            title: prev.title,
            content: prev.content,
            createdAt: prev.createdAt,
            comments: [...prev.comments, obj.comment],
          };
        }

        return prev;
      }, undefined);

      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (isInit.current) {
      return;
    }

    isInit.current = true;
    invalidate().catch(console.error);
  }, [invalidate]);

  return { data, isLoading, invalidate };
}
