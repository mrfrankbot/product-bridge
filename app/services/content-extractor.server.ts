import OpenAI from "openai";
import { retryOpenAI } from "../utils/retry";
import type { UserError } from "../utils/errors.server";

// Validate OpenAI API key at startup
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SpecGroup {
  heading: string;
  lines: { title: string; text: string }[];
}

export interface ProductContent {
  specs: SpecGroup[];
  highlights: string[];
  included: { title: string; link: string }[];
  featured: { title: string; value: string }[];
}

const EMPTY: ProductContent = {
  specs: [],
  highlights: [],
  included: [],
  featured: [],
};

const SYSTEM_PROMPT = `You are an expert at extracting structured product information from manufacturer spec sheets.
You specialize in camera equipment: cameras, lenses, flashes, tripods, etc.

Given raw manufacturer text, extract and return JSON with:
1. specs: Array of spec groups, each with a heading and lines of title/text pairs
   - Group by category: Camera, Image Sensor, Autofocus, Video, Monitor, Connectivity, etc.
2. highlights: Array of key marketing bullet points (5-8 items)
3. included: Array of what's in the box (title and optional link)
4. featured: Array of 5 key specs for quick reference (title and value)

For camera specs, use these standard headings:
- Camera (Format, Mount, Crop Factor)
- Image Sensor (Type, Size, Megapixels, ISO, Stabilization)
- Autofocus (Methods, Modes, Coverage, Points)
- Shutter (Speed Range, Continuous Shooting)
- Video (Resolution, Frame Rates, Formats)
- Monitor and Viewfinder (Type, Size, Resolution)
- Connectivity (Ports, Wireless)
- Physical (Dimensions, Weight)

Keep values clean and consistent. Use common abbreviations (MP, fps, mm).
Return only valid JSON matching the ProductContent schema.`;

export async function extractProductContent(rawText: string): Promise<ProductContent> {
  if (!rawText?.trim()) {
    const error: UserError = {
      code: "text.empty",
      message: "No text provided for extraction.",
      suggestion: "Paste the product specifications or upload a PDF."
    };
    throw error;
  }

  try {
    const result = await retryOpenAI(
      () => client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract structured product content from this manufacturer text:\n\n${rawText}`,
          },
        ],
      })
    );

    if (!result.success) {
      const error: UserError = {
        code: "ai.retry_failed",
        message: result.error?.message || "AI extraction failed after retries.",
        suggestion: "Check your internet connection and try again. If the problem persists, try different source content."
      };
      throw error;
    }

    const response = result.data!

    const content = response.choices[0]?.message?.content;
    if (!content) {
      const error: UserError = {
        code: "ai.no_response",
        message: "AI extraction returned no content.",
        suggestion: "Try again with different text or contact support."
      };
      throw error;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      const error: UserError = {
        code: "ai.invalid_json",
        message: "AI returned invalid data format.",
        suggestion: "The extraction failed due to format issues. Try again or use different source text."
      };
      throw error;
    }
    
    // Normalize and validate the response
    const result = {
      specs: Array.isArray(parsed.specs) ? parsed.specs.filter((s: any) => s.heading && Array.isArray(s.lines)) : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.filter((h: any) => typeof h === 'string' && h.trim()) : [],
      included: Array.isArray(parsed.included) ? parsed.included.filter((i: any) => i.title && typeof i.title === 'string') : [],
      featured: Array.isArray(parsed.featured) ? parsed.featured.filter((f: any) => f.title && f.value) : [],
    };

    // Check if we got any meaningful content
    const hasContent = result.specs.length > 0 || result.highlights.length > 0 || 
                      result.included.length > 0 || result.featured.length > 0;
    
    if (!hasContent) {
      const error: UserError = {
        code: "ai.no_content",
        message: "No product specifications could be extracted.",
        suggestion: "Try using text with more detailed specs, or check if this is camera/photography equipment."
      };
      throw error;
    }

    return result;
  } catch (error) {
    // If it's already a UserError, re-throw it
    if (error && typeof error === "object" && "code" in error) {
      throw error;
    }

    // Convert unknown errors to UserError
    console.error("Content extraction failed:", error);
    const userError: UserError = {
      code: "ai.extraction_failed",
      message: "Content extraction failed.",
      suggestion: "Check your internet connection and try again. If the problem persists, try different source content."
    };
    throw userError;
  }
}
