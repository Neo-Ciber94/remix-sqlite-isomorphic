import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  Form,
  json,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { count, eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { comments, posts } from "~/lib/db/schema";

export const meta: MetaFunction = () => {
  return [{ title: "Posts" }];
};

export async function loader() {
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

  return json(result);
}

export async function action(args: ActionFunctionArgs) {
  const data = await args.request.formData();
  const title = data.get("title");
  const content = data.get("content");

  if (typeof title !== "string" || title.trim().length === 0) {
    return json({ error: "Title is required" });
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return json({ error: "Content is required" });
  }

  const created = await db.insert(posts).values({ title, content }).returning();
  return json({ data: created, error: null });
}

export default function PostsPage() {
  const allPosts = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { state } = useNavigation();
  const isSubmitting = state === "submitting";

  return (
    <div>
      <h1>Posts (Server)</h1>
      <Form method="post">
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
      </Form>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {allPosts.length === 0 && <h1>No posts available</h1>}

        {allPosts.map((post) => {
          return (
            <Link
              key={post.id}
              to={`/server/posts/${post.id}`}
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
