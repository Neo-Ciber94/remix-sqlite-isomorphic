import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { InferSelectModel } from "drizzle-orm";
import { useEffect, useState } from "react";
import { posts as PostTable } from "~/lib/db/schema";
import { loadDatabase } from "~/lib/db/client";

export const meta: MetaFunction = () => {
  return [{ title: "Posts (Client)" }];
};

type Post = InferSelectModel<typeof PostTable> & { commentCount: number };

export default function PostsClientPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionResult, setActionResult] = useState<{ error: string } | null>(
    null
  );

  useEffect(() => {
    let discard = false;

    (async () => {
      try {
        if (discard) {
          return;
        }

        setIsLoading(true);
        const db = await loadDatabase();
        const data = await db.query.posts.findMany({
          with: { comments: true },
        });
        const postsWithCommentCount = data.map((post) => ({
          ...post,
          commentCount: post.comments.length,
        }));

        console.log(data);
        setPosts(postsWithCommentCount);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      discard = true;
    };
  }, []);

  return (
    <div>
      <h1>Posts</h1>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();

          try {
            setIsSubmitting(true);
            const data = new FormData(ev.currentTarget);
            const title = data.get("title");
            const content = data.get("content");

            if (typeof title !== "string" || title.trim().length === 0) {
              return setActionResult({ error: "Title is required" });
            }

            if (typeof content !== "string" || content.trim().length === 0) {
              return setActionResult({ error: "Content is required" });
            }

            const db = await loadDatabase();
            await db.insert(PostTable).values({ title, content }).returning();
            await db.$write();
          } catch (err) {
            console.error(err);
            setActionResult({ error: "Failed to add post" });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <input name="title" placeholder="Title" required />
        <br />

        <textarea name="content" placeholder="Content" required></textarea>
        <br />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create"}
        </button>
        <br />

        {actionResult?.error && (
          <small style={{ color: "red" }}>{actionResult.error}</small>
        )}
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {isLoading && <h1>Loading...</h1>}
        {!isLoading && posts.length === 0 && <h1>No posts available</h1>}

        {posts.map((post) => {
          return (
            <Link
              key={post.id}
              to={`/client/posts/${post.id}`}
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
