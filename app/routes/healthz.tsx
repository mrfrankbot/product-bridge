import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  return json({ status: "ok" }, { status: 200 });
};

export default function HealthCheck() {
  return <div>OK</div>;
}
