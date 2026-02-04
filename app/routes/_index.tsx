import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

// Root route redirects to the app route which handles authentication
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return redirect("/app");
};

export default function Index() {
  return null;
}
