import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    // If shop parameter exists, redirect to app
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return login(request);
};
