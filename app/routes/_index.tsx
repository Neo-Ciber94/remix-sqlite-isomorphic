import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Home Page" }];
};

export default function HomePage() {
  return <h1>Home</h1>;
}
