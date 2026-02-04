import { json, type ActionFunctionArgs } from "@remix-run/node";
import { extractProductContent } from "../services/content-extractor.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return json({ error: "Missing or invalid 'text' field" }, { status: 400 });
    }

    const result = await extractProductContent(text);
    return json(result);
  } catch (error) {
    console.error("API extraction error:", error);
    return json({ error: "Extraction failed" }, { status: 500 });
  }
}
