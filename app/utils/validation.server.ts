import type { ProductContent } from "../services/content-extractor.server";
import type { UserError } from "./errors.server";

export function validateUrlInput(raw: string): { ok: true; value: string } | { ok: false; error: UserError } {
  const value = raw?.trim();
  if (!value) return { ok: false, error: { code: "url.empty", message: "URL is required.", suggestion: "Paste a full https:// product page URL." } };

  let parsed: URL;
  try { parsed = new URL(value); } catch {
    return { ok: false, error: { code: "url.invalid", message: "That URL doesn't look valid.", suggestion: "Include https:// at the beginning." } };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: { code: "url.protocol", message: "Only HTTP/HTTPS URLs are supported.", suggestion: "Use an https:// product page." } };
  }

  const host = parsed.hostname.toLowerCase();
  const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
  if (blocked.includes(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, error: { code: "url.blocked", message: "Local or internal URLs are not allowed.", suggestion: "Use a public manufacturer product page." } };
  }

  return { ok: true, value: parsed.toString() };
}

export async function validatePdfFile(file: File | null): Promise<{ ok: true; file: File } | { ok: false; error: UserError }> {
  if (!file || file.size === 0) return { ok: false, error: { code: "pdf.missing", message: "No PDF file provided.", suggestion: "Upload a PDF spec sheet or brochure." } };
  if (file.size > 20_000_000) return { ok: false, error: { code: "pdf.too_large", message: "PDF is larger than 20MB.", suggestion: "Export a smaller PDF or split it into parts." } };
  if (file.type && file.type !== "application/pdf") {
    return { ok: false, error: { code: "pdf.type", message: "Only PDF files are supported.", suggestion: "Upload a .pdf file." } };
  }

  const buf = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const signature = String.fromCharCode(...buf);
  if (signature !== "%PDF") {
    return { ok: false, error: { code: "pdf.invalid", message: "This file doesn't look like a valid PDF.", suggestion: "Re‑export or download the PDF again." } };
  }

  return { ok: true, file };
}

export function validateTextInput(text: string): { ok: true; value: string } | { ok: false; error: UserError } {
  const value = text?.trim() || "";
  if (value.length < 50) {
    return { ok: false, error: { code: "text.short", message: "Text is too short to extract reliable specs.", suggestion: "Paste the full spec sheet or at least a few paragraphs." } };
  }
  if (value.length > 60_000) {
    return { ok: false, error: { code: "text.long", message: "Text is too long to process in one pass.", suggestion: "Trim to the spec section only or split into parts." } };
  }
  return { ok: true, value };
}

export function validateContentPayload(raw: unknown): { ok: true; value: ProductContent } | { ok: false; error: UserError } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: { code: "content.invalid", message: "Content payload is invalid.", suggestion: "Re‑extract content before saving." } };
  }
  const c = raw as ProductContent;
  const okArray = (v: unknown) => Array.isArray(v);
  if (!okArray(c.specs) || !okArray(c.highlights) || !okArray(c.included) || !okArray(c.featured)) {
    return { ok: false, error: { code: "content.shape", message: "Extracted content is incomplete.", suggestion: "Re‑extract content and try saving again." } };
  }
  return { ok: true, value: c };
}