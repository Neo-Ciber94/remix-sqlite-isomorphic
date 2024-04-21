import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  json,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { db } from "~/lib/db";
import { comments } from "~/lib/db/schema";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data == null ? `Post not found` : `${data.title}` }];
};

export async function loader(args: LoaderFunctionArgs) {
  const postId = String(args.params.post_id);
  const post = await db.query.posts.findFirst({
    where(model, { eq }) {
      return eq(model.id, postId);
    },
    with: {
      comments: true,
    },
  });

  if (post == null) {
    throw new Response("Not Found", { status: 404 });
  }

  return json(post);
}

export async function action(args: ActionFunctionArgs) {
  const data = await args.request.formData();
  const content = data.get("content");

  if (typeof content !== "string" || content.trim().length === 0) {
    return json({ error: "Content is required" });
  }

  const postId = String(args.params.post_id);
  await db.insert(comments).values({
    postId,
    content,
  });

  return null;
}

export default function PostDetailsPage() {
  const post = useLoaderData<typeof loader>();
  const actionResult = useActionData<typeof action>();
  const { state } = useNavigation();
  const isSubmitting = state === "submitting";

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

        <Form method="post">
          <textarea name="content" placeholder="Comment..." required></textarea>
          <br />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Comment"}
          </button>

          <br />
          {actionResult?.error && (
            <small style={{ color: "red" }}>{actionResult.error}</small>
          )}
        </Form>
      </div>
    </div>
  );
}
