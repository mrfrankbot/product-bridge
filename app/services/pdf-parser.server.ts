import pdf from "pdf-parse";
import type { UserError } from "../utils/errors.server";

export interface PdfParseResult {
  text: string;
  numPages: number;
  info?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

/**
 * Parse a PDF buffer and extract text content
 */
export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  try {
    const data = await pdf(buffer);
    
    if (!data.text || data.text.trim().length < 50) {
      const error: UserError = {
        code: "pdf.no_text",
        message: "Could not extract text from PDF.",
        suggestion: "The file may be image-based or encrypted. Try an OCR-processed PDF or paste specs directly."
      };
      throw error;
    }
    
    return {
      text: data.text,
      numPages: data.numpages,
      info: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
      },
    };
  } catch (error) {
    // If it's already a UserError, re-throw it
    if (error && typeof error === "object" && "code" in error) {
      throw error;
    }

    console.error("PDF parsing failed:", error);
    const userError: UserError = {
      code: "pdf.parsing_failed",
      message: "Failed to parse PDF file.",
      suggestion: "The file may be corrupted or in an unsupported format. Try re-exporting or downloading the PDF again."
    };
    throw userError;
  }
}

/**
 * Parse PDF from a File Upload (multipart form data)
 */
export async function parsePdfFromUpload(file: File): Promise<PdfParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return parsePdf(buffer);
}
