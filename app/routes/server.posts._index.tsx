import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  Form,
  json,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { db } from "~/lib/db";
import { posts } from "~/lib/db/schema";

export const meta: MetaFunction = () => {
  return [{ title: "Posts" }];
};

export async function loader() {
  // TODO: Make a join and only include the comment count
  const posts = await db.query.posts.findMany({
    with: {
      comments: true,
    },
  });

  const postsWithCommentCount = posts.map((post) => ({
    ...post,
    commentCount: post.comments.length,
  }));
  return json(postsWithCommentCount);
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
  const posts = useLoaderData<typeof loader>();
  const actionResult = useActionData<typeof action>();
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

        {actionResult?.error && (
          <small style={{ color: "red" }}>{actionResult.error}</small>
        )}
      </Form>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {posts.length === 0 && <h1>No posts available</h1>}

        {posts.map((post) => {
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
