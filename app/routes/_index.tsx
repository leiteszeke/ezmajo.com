import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Ezmajo" }, { name: "description", content: "Ezmajo" }];
};

export default function Index() {
  return <div className="flex h-screen items-center justify-center"></div>;
}
