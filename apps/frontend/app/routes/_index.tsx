import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Resource } from "sst";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { wisdom } = await fetch(`${Resource.Backend.url}/wisdom`, {
    headers: {
      Authorization: `Bearer ${Resource.ApiKey.value}`,
    },
  }).then((res) => res.json() as Promise<{ wisdom: string }>);
  return { wisdom };
};

export default function Index() {
  const { wisdom } = useLoaderData<typeof loader>();

  return <div>{wisdom}</div>;
}
