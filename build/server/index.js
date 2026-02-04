import { jsx, jsxs } from 'react/jsx-runtime';
import { PassThrough } from 'node:stream';
import { createReadableStreamFromReadable, json, unstable_createMemoryUploadHandler, unstable_parseMultipartFormData, redirect } from '@remix-run/node';
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useFetcher, useRouteError, useActionData, Form, Link } from '@remix-run/react';
import * as isbotModule from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import OpenAI from 'openai';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Thumbnail, Page, BlockStack, Banner, Card, Text, Autocomplete, Icon, InlineStack, Badge, Tabs, TextField, Button, DropZone, Divider, Modal, AppProvider, FormLayout } from '@shopify/polaris';
import { SearchIcon, ImportIcon, LinkIcon, PlusIcon, DeleteIcon, CheckIcon } from '@shopify/polaris-icons';
import '@shopify/shopify-app-remix/adapters/node';
import { shopifyApp, AppDistribution, LATEST_API_VERSION, boundary } from '@shopify/shopify-app-remix/server';
import { MemorySessionStorage } from '@shopify/shopify-app-session-storage-memory';
import pdf from 'pdf-parse';
import * as cheerio from 'cheerio';
import { AppProvider as AppProvider$1 } from '@shopify/shopify-app-remix/react';
import { NavMenu } from '@shopify/app-bridge-react';

const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  let prohibitOutOfOrderStreaming = isBotRequest(request.headers.get("user-agent")) || remixContext.isSpaMode;
  return prohibitOutOfOrderStreaming ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function isBotRequest(userAgent) {
  if (!userAgent) {
    return false;
  }
  if ("isbot" in isbotModule && typeof isbotModule.isbot === "function") {
    return isbotModule.isbot(userAgent);
  }
  if ("default" in isbotModule && typeof isbotModule.default === "function") {
    return isbotModule.default(userAgent);
  }
  return false;
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}

const entryServer = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: 'Module' }));

function App$1() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}

const route0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: App$1
}, Symbol.toStringTag, { value: 'Module' }));

const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  baseDelayMs: 1e3,
  maxDelayMs: 1e4,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return true;
    }
    if (error?.status >= 500) {
      return true;
    }
    if (error?.status === 429) {
      return true;
    }
    if (error?.message?.includes("timeout")) {
      return true;
    }
    return false;
  },
  onRetry: () => {
  }
  // No-op by default
};
async function withRetry(operation, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === config.maxAttempts || !config.retryCondition(error)) {
        break;
      }
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      config.onRetry(attempt, error);
      await sleep(delay);
    }
  }
  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    totalTime: Date.now() - startTime
  };
}
async function retryFetch(url, init, options = {}) {
  const operation = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3e4);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  };
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 1e3,
    ...options,
    onRetry: (attempt, error) => {
      console.log(`Retrying fetch to ${url} (attempt ${attempt}):`, error.message);
      options.onRetry?.(attempt, error);
    }
  });
}
async function retryOpenAI(operation, options = {}) {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 2e3,
    maxDelayMs: 3e4,
    ...options,
    retryCondition: (error) => {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return true;
      }
      if (error?.status >= 500) {
        return true;
      }
      if (error?.status === 429) {
        return true;
      }
      if (error?.message?.includes("timeout")) {
        return true;
      }
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return false;
    },
    onRetry: (attempt, error) => {
      console.log(`Retrying OpenAI call (attempt ${attempt}):`, error.message);
      options.onRetry?.(attempt, error);
    }
  });
}
async function retryShopify(operation, options = {}) {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 1e3,
    ...options,
    retryCondition: (error) => {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return true;
      }
      if (error?.status >= 500) {
        return true;
      }
      if (error?.status === 429) {
        return true;
      }
      if (error?.status === 503) {
        return true;
      }
      if (error?.status === 401 || error?.status === 403 || error?.status === 400) {
        return false;
      }
      return false;
    },
    onRetry: (attempt, error) => {
      console.log(`Retrying Shopify API call (attempt ${attempt}):`, error.message);
      options.onRetry?.(attempt, error);
    }
  });
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
async function extractProductContent(rawText) {
  if (!rawText?.trim()) {
    const error = {
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
            content: `Extract structured product content from this manufacturer text:

${rawText}`
          }
        ]
      })
    );
    if (!result.success) {
      const error = {
        code: "ai.retry_failed",
        message: result.error?.message || "AI extraction failed after retries.",
        suggestion: "Check your internet connection and try again. If the problem persists, try different source content."
      };
      throw error;
    }
    const response = result.data;
    const content = response.choices[0]?.message?.content;
    if (!content) {
      const error = {
        code: "ai.no_response",
        message: "AI extraction returned no content.",
        suggestion: "Try again with different text or contact support."
      };
      throw error;
    }
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      const error = {
        code: "ai.invalid_json",
        message: "AI returned invalid data format.",
        suggestion: "The extraction failed due to format issues. Try again or use different source text."
      };
      throw error;
    }
    const extractedContent = {
      specs: Array.isArray(parsed.specs) ? parsed.specs.filter((s) => s.heading && Array.isArray(s.lines)) : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.filter((h) => typeof h === "string" && h.trim()) : [],
      included: Array.isArray(parsed.included) ? parsed.included.filter((i) => i.title && typeof i.title === "string") : [],
      featured: Array.isArray(parsed.featured) ? parsed.featured.filter((f) => f.title && f.value) : []
    };
    const hasContent = extractedContent.specs.length > 0 || extractedContent.highlights.length > 0 || extractedContent.included.length > 0 || extractedContent.featured.length > 0;
    if (!hasContent) {
      const error = {
        code: "ai.no_content",
        message: "No product specifications could be extracted.",
        suggestion: "Try using text with more detailed specs, or check if this is camera/photography equipment."
      };
      throw error;
    }
    return extractedContent;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      throw error;
    }
    console.error("Content extraction failed:", error);
    const userError = {
      code: "ai.extraction_failed",
      message: "Content extraction failed.",
      suggestion: "Check your internet connection and try again. If the problem persists, try different source content."
    };
    throw userError;
  }
}

async function action$3({ request }) {
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

const route1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$3
}, Symbol.toStringTag, { value: 'Module' }));

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES?.split(",") || ["read_products", "write_products", "read_metafields", "write_metafields"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new MemorySessionStorage(),
  distribution: AppDistribution.AppStore,
  isEmbeddedApp: true,
  future: {
    unstable_newEmbeddedAuthStrategy: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;

async function parsePdf(buffer) {
  try {
    const data = await pdf(buffer);
    if (!data.text || data.text.trim().length < 50) {
      const error = {
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
        subject: data.info?.Subject
      }
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      throw error;
    }
    console.error("PDF parsing failed:", error);
    const userError = {
      code: "pdf.parsing_failed",
      message: "Failed to parse PDF file.",
      suggestion: "The file may be corrupted or in an unsupported format. Try re-exporting or downloading the PDF again."
    };
    throw userError;
  }
}

const SPEC_SELECTORS = [
  // Generic specs tables
  'table[class*="spec"]',
  'table[class*="Spec"]',
  'div[class*="spec"]',
  'div[class*="Spec"]',
  'section[class*="spec"]',
  '[data-testid*="spec"]',
  // Product descriptions
  'div[class*="product-description"]',
  'div[class*="ProductDescription"]',
  'div[class*="description"]',
  '[itemprop="description"]',
  // Features
  'div[class*="feature"]',
  'div[class*="Feature"]',
  'ul[class*="feature"]',
  // Canon specific
  ".productSpec",
  ".product-spec",
  "#productSpec",
  ".specifications",
  // Sony specific
  ".ProductSpecification",
  ".spec-table",
  '[class*="SpecList"]',
  // Nikon specific
  ".productSpecs",
  ".specificationTable",
  // Generic fallbacks
  "article",
  "main",
  ".product-detail",
  ".product-info"
];
const SKIP_SELECTORS = [
  "nav",
  "header",
  "footer",
  ".nav",
  ".header",
  ".footer",
  ".menu",
  ".sidebar",
  ".cookie",
  ".newsletter",
  ".social",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  "script",
  "style",
  "noscript"
];
function detectManufacturer(url) {
  const hostname = new URL(url).hostname.toLowerCase();
  const manufacturers = {
    "canon": "Canon",
    "sony": "Sony",
    "nikon": "Nikon",
    "fujifilm": "Fujifilm",
    "panasonic": "Panasonic",
    "olympus": "Olympus",
    "leica": "Leica",
    "sigma": "Sigma",
    "tamron": "Tamron",
    "zeiss": "Zeiss",
    "hasselblad": "Hasselblad",
    "dji": "DJI",
    "gopro": "GoPro",
    "blackmagic": "Blackmagic",
    "rode": "Rode",
    "sennheiser": "Sennheiser",
    "manfrotto": "Manfrotto",
    "gitzo": "Gitzo",
    "profoto": "Profoto",
    "godox": "Godox",
    "peak design": "Peak Design",
    "peakdesign": "Peak Design",
    "benq": "BenQ"
  };
  for (const [key, name] of Object.entries(manufacturers)) {
    if (hostname.includes(key)) {
      return name;
    }
  }
  return void 0;
}
function cleanText(text) {
  return text.replace(/[\t\r]+/g, " ").replace(/\n{3,}/g, "\n\n").replace(/ {2,}/g, " ").split("\n").map((line) => line.trim()).join("\n").trim();
}
function extractSpecText($) {
  SKIP_SELECTORS.forEach((selector) => {
    $(selector).remove();
  });
  const textParts = [];
  for (const selector of SPEC_SELECTORS) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((_, el) => {
        const text = $(el).text();
        if (text.length > 50) {
          textParts.push(text);
        }
      });
      if (textParts.join("").length > 500) {
        break;
      }
    }
  }
  if (textParts.length === 0) {
    const bodyText = $("body").text();
    textParts.push(bodyText);
  }
  return cleanText(textParts.join("\n\n"));
}
function extractTables($) {
  const tableParts = [];
  $("table").each((_, table) => {
    const rows = [];
    $(table).find("tr").each((_2, tr) => {
      const cells = [];
      $(tr).find("th, td").each((_3, cell) => {
        cells.push($(cell).text().trim());
      });
      if (cells.length > 0) {
        rows.push(cells.join(": "));
      }
    });
    if (rows.length > 0) {
      tableParts.push(rows.join("\n"));
    }
  });
  return tableParts.join("\n\n");
}
async function scrapeProductPage(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    const error = {
      code: "url.invalid",
      message: "That URL doesn't look valid.",
      suggestion: "Include the full https:// address."
    };
    throw error;
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    const error = {
      code: "url.protocol",
      message: "Only HTTP and HTTPS URLs are supported.",
      suggestion: "Use an https:// product page."
    };
    throw error;
  }
  const host = parsedUrl.hostname.toLowerCase();
  const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "10.", "192.168.", "172."];
  if (blocked.some((b) => host.includes(b)) || host.endsWith(".local") || host.endsWith(".internal")) {
    const error = {
      code: "url.blocked",
      message: "Local or internal URLs are not allowed.",
      suggestion: "Use a public manufacturer product page."
    };
    throw error;
  }
  try {
    const fetchResult = await retryFetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!fetchResult.success) {
      const error = fetchResult.error;
      let errorMsg;
      const status = error?.status;
      switch (status) {
        case 403:
          errorMsg = {
            code: "url.blocked",
            message: "This site blocked automated access.",
            suggestion: "Try another product page or paste specs directly."
          };
          break;
        case 404:
          errorMsg = {
            code: "url.not_found",
            message: "The product page was not found.",
            suggestion: "Check the URL or try a different product page."
          };
          break;
        case 429:
          errorMsg = {
            code: "url.rate_limited",
            message: "Too many requests to this site.",
            suggestion: "Wait a few minutes and try again."
          };
          break;
        default:
          errorMsg = {
            code: "url.fetch_failed",
            message: `Failed to fetch page: ${error.message}`,
            suggestion: "Check the URL or try again later."
          };
      }
      throw errorMsg;
    }
    const response = fetchResult.data;
    if (!response.ok) {
      let errorMsg;
      switch (response.status) {
        case 403:
          errorMsg = {
            code: "url.blocked",
            message: "This site blocked automated access.",
            suggestion: "Try another product page or paste specs directly."
          };
          break;
        case 404:
          errorMsg = {
            code: "url.not_found",
            message: "The product page was not found.",
            suggestion: "Check the URL or try a different product page."
          };
          break;
        case 429:
          errorMsg = {
            code: "url.rate_limited",
            message: "Too many requests to this site.",
            suggestion: "Wait a few minutes and try again."
          };
          break;
        default:
          errorMsg = {
            code: "url.server_error",
            message: `Manufacturer site error: ${response.status}`,
            suggestion: "Try again later or use a different source."
          };
      }
      throw errorMsg;
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $("title").text().trim() || $("h1").first().text().trim() || "Unknown Product";
    const tableText = extractTables($);
    const specText = extractSpecText($);
    const combinedText = [tableText, specText].filter((t) => t.length > 0).join("\n\n---\n\n");
    if (!combinedText.trim()) {
      const error = {
        code: "url.no_content",
        message: "No content could be extracted from this page.",
        suggestion: "Try a different product page or paste specs directly."
      };
      throw error;
    }
    const maxLength = 3e4;
    const text = combinedText.length > maxLength ? combinedText.slice(0, maxLength) + "\n\n[Content truncated...]" : combinedText;
    return {
      title,
      text,
      url,
      manufacturer: detectManufacturer(url)
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      throw error;
    }
    console.error("URL scraping failed:", error);
    const userError = {
      code: "url.scraping_failed",
      message: "Failed to scrape the URL.",
      suggestion: "Check the URL or try again later."
    };
    throw userError;
  }
}

function validateUrlInput(raw) {
  const value = raw?.trim();
  if (!value) return { ok: false, error: { code: "url.empty", message: "URL is required.", suggestion: "Paste a full https:// product page URL." } };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
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
async function validatePdfFile(file) {
  if (!file || file.size === 0) return { ok: false, error: { code: "pdf.missing", message: "No PDF file provided.", suggestion: "Upload a PDF spec sheet or brochure." } };
  if (file.size > 2e7) return { ok: false, error: { code: "pdf.too_large", message: "PDF is larger than 20MB.", suggestion: "Export a smaller PDF or split it into parts." } };
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
function validateTextInput(text) {
  const value = text?.trim() || "";
  if (value.length < 50) {
    return { ok: false, error: { code: "text.short", message: "Text is too short to extract reliable specs.", suggestion: "Paste the full spec sheet or at least a few paragraphs." } };
  }
  if (value.length > 6e4) {
    return { ok: false, error: { code: "text.long", message: "Text is too long to process in one pass.", suggestion: "Trim to the spec section only or split into parts." } };
  }
  return { ok: true, value };
}
function validateContentPayload(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: { code: "content.invalid", message: "Content payload is invalid.", suggestion: "Re‑extract content before saving." } };
  }
  const c = raw;
  const okArray = (v) => Array.isArray(v);
  if (!okArray(c.specs) || !okArray(c.highlights) || !okArray(c.included) || !okArray(c.featured)) {
    return { ok: false, error: { code: "content.shape", message: "Extracted content is incomplete.", suggestion: "Re‑extract content and try saving again." } };
  }
  return { ok: true, value: c };
}

function asUserError(err, fallback) {
  if (typeof err === "object" && err && "code" in err && "message" in err) {
    return err;
  }
  return fallback;
}

const PRODUCTS_QUERY = `#graphql
  query ProductsQuery($query: String, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          featuredImage {
            url
            altText
          }
        }
      }
    }
  }
`;
const METAFIELDS_SET_MUTATION = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;
const loader$4 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("search") || "";
  const response = await admin.graphql(PRODUCTS_QUERY, {
    variables: {
      query: searchQuery ? `title:*${searchQuery}*` : "",
      first: 25
    }
  });
  const data = await response.json();
  const products = data.data?.products?.edges?.map((edge) => edge.node) || [];
  return json({ products });
};
const action$2 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const contentType = request.headers.get("content-type") || "";
  let formData;
  if (contentType.includes("multipart/form-data")) {
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 2e7
      // 20MB max
    });
    formData = await unstable_parseMultipartFormData(request, uploadHandler);
  } else {
    formData = await request.formData();
  }
  const intent = formData.get("intent");
  if (intent === "extract-pdf") {
    const file = formData.get("pdf");
    const fileValidation = await validatePdfFile(file);
    if (!fileValidation.ok) {
      return json({ error: fileValidation.error }, { status: 400 });
    }
    try {
      const arrayBuffer = await fileValidation.file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfResult = await parsePdf(buffer);
      const result = await extractProductContent(pdfResult.text);
      return json({
        extracted: result,
        source: {
          type: "pdf",
          filename: fileValidation.file.name,
          pages: pdfResult.numPages
        }
      });
    } catch (error) {
      console.error("PDF extraction error:", error);
      const userError = asUserError(error, {
        code: "pdf.processing_failed",
        message: "Failed to process PDF",
        suggestion: "Try a different PDF or paste specs directly."
      });
      return json({ error: userError }, { status: 500 });
    }
  }
  if (intent === "extract-url") {
    const urlInput = formData.get("url");
    const urlValidation = validateUrlInput(urlInput);
    if (!urlValidation.ok) {
      return json({ error: urlValidation.error }, { status: 400 });
    }
    try {
      const scrapeResult = await scrapeProductPage(urlValidation.value);
      const result = await extractProductContent(scrapeResult.text);
      return json({
        extracted: result,
        source: {
          type: "url",
          url: scrapeResult.url,
          title: scrapeResult.title,
          manufacturer: scrapeResult.manufacturer
        }
      });
    } catch (error) {
      console.error("URL scraping error:", error);
      const userError = asUserError(error, {
        code: "url.processing_failed",
        message: "Failed to scrape URL",
        suggestion: "Check the URL or try again later."
      });
      return json({ error: userError }, { status: 500 });
    }
  }
  if (intent === "extract") {
    const textInput = formData.get("text");
    const textValidation = validateTextInput(textInput);
    if (!textValidation.ok) {
      return json({ error: textValidation.error }, { status: 400 });
    }
    try {
      const result = await extractProductContent(textValidation.value);
      return json({ extracted: result, source: { type: "text" } });
    } catch (error) {
      console.error("Text extraction error:", error);
      const userError = asUserError(error, {
        code: "text.processing_failed",
        message: "Failed to extract content from text",
        suggestion: "Try different text or check your internet connection."
      });
      return json({ error: userError }, { status: 500 });
    }
  }
  if (intent === "save") {
    const productId = formData.get("productId");
    const contentJson = formData.get("content");
    if (!productId) {
      return json({
        error: {
          code: "save.no_product",
          message: "No product selected.",
          suggestion: "Select a product in Step 1 before saving."
        }
      }, { status: 400 });
    }
    if (!contentJson) {
      return json({
        error: {
          code: "save.no_content",
          message: "No content to save.",
          suggestion: "Extract content first before saving."
        }
      }, { status: 400 });
    }
    try {
      let parsedContent;
      try {
        parsedContent = JSON.parse(contentJson);
      } catch {
        return json({
          error: {
            code: "save.invalid_json",
            message: "Content data is corrupted.",
            suggestion: "Re-extract content and try saving again."
          }
        }, { status: 400 });
      }
      const contentValidation = validateContentPayload(parsedContent);
      if (!contentValidation.ok) {
        return json({ error: contentValidation.error }, { status: 400 });
      }
      const content = contentValidation.value;
      const metafields = [
        {
          ownerId: productId,
          namespace: "product_bridge",
          key: "specs",
          type: "json",
          value: JSON.stringify(content.specs)
        },
        {
          ownerId: productId,
          namespace: "product_bridge",
          key: "highlights",
          type: "json",
          value: JSON.stringify(content.highlights)
        },
        {
          ownerId: productId,
          namespace: "product_bridge",
          key: "included",
          type: "json",
          value: JSON.stringify(content.included)
        },
        {
          ownerId: productId,
          namespace: "product_bridge",
          key: "featured",
          type: "json",
          value: JSON.stringify(content.featured)
        }
      ];
      const shopifyResult = await retryShopify(
        () => admin.graphql(METAFIELDS_SET_MUTATION, {
          variables: { metafields }
        })
      );
      if (!shopifyResult.success) {
        const userError = {
          code: "save.shopify_failed",
          message: "Failed to save to Shopify after retries.",
          suggestion: "Check your connection and try again."
        };
        throw userError;
      }
      const response = shopifyResult.data;
      const result = await response.json();
      const errors = result.data?.metafieldsSet?.userErrors;
      if (errors?.length > 0) {
        const errorMessages = errors.map((e) => e.message).join(", ");
        return json({
          error: {
            code: "save.shopify_error",
            message: `Shopify rejected the metafields: ${errorMessages}`,
            suggestion: "Check that all fields contain valid values and try again."
          }
        }, { status: 400 });
      }
      return json({ success: true, saved: result.data?.metafieldsSet?.metafields });
    } catch (error) {
      console.error("Save error:", error);
      const userError = asUserError(error, {
        code: "save.failed",
        message: "Failed to save metafields",
        suggestion: "Check your connection and try again."
      });
      return json({ error: userError }, { status: 500 });
    }
  }
  return json({ error: "Invalid intent" }, { status: 400 });
};
function AppIndex() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  useRef(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [specsText, setSpecsText] = useState("");
  const [content, setContent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [inputTab, setInputTab] = useState(0);
  const [urlValue, setUrlValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [sourceInfo, setSourceInfo] = useState(null);
  const isExtracting = fetcher.state === "submitting" && (fetcher.formData?.get("intent") === "extract" || fetcher.formData?.get("intent") === "extract-pdf" || fetcher.formData?.get("intent") === "extract-url");
  const isSaving = fetcher.state === "submitting" && fetcher.formData?.get("intent") === "save";
  const extractResult = fetcher.data;
  useEffect(() => {
    if (extractResult?.extracted) {
      setContent(extractResult.extracted);
      if (extractResult.source) {
        setSourceInfo(extractResult.source);
      }
    }
  }, [extractResult]);
  const handleFileDrop = useCallback((_dropFiles, acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
    }
  }, []);
  const handlePdfExtract = () => {
    if (!uploadedFile) return;
    const formData = new FormData();
    formData.append("intent", "extract-pdf");
    formData.append("pdf", uploadedFile);
    fetcher.submit(formData, {
      method: "post",
      encType: "multipart/form-data"
    });
  };
  const handleUrlExtract = () => {
    if (!urlValue.trim()) return;
    const formData = new FormData();
    formData.append("intent", "extract-url");
    formData.append("url", urlValue.trim());
    fetcher.submit(formData, { method: "post" });
  };
  const inputTabs = [
    { id: "text", content: "📝 Paste Text" },
    { id: "pdf", content: "📄 Upload PDF" },
    { id: "url", content: "🔗 Scrape URL" }
  ];
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.title,
    media: p.featuredImage?.url ? /* @__PURE__ */ jsx(Thumbnail, { source: p.featuredImage.url, alt: p.featuredImage.altText || p.title, size: "small" }) : void 0
  }));
  const handleProductSelect = useCallback(
    (selected) => {
      const product = products.find((p) => p.id === selected[0]);
      if (product) {
        setSelectedProduct(product);
        setSearchValue(product.title);
      }
    },
    [products]
  );
  const updateHighlight = (index, value) => {
    if (!content) return;
    const newHighlights = [...content.highlights];
    newHighlights[index] = value;
    setContent({ ...content, highlights: newHighlights });
  };
  const removeHighlight = (index) => {
    if (!content) return;
    setContent({ ...content, highlights: content.highlights.filter((_, i) => i !== index) });
  };
  const addHighlight = () => {
    if (!content) return;
    setContent({ ...content, highlights: [...content.highlights, ""] });
  };
  const updateFeatured = (index, field, value) => {
    if (!content) return;
    const newFeatured = [...content.featured];
    newFeatured[index] = { ...newFeatured[index], [field]: value };
    setContent({ ...content, featured: newFeatured });
  };
  const removeFeatured = (index) => {
    if (!content) return;
    setContent({ ...content, featured: content.featured.filter((_, i) => i !== index) });
  };
  const addFeatured = () => {
    if (!content) return;
    setContent({ ...content, featured: [...content.featured, { title: "", value: "" }] });
  };
  const updateIncluded = (index, field, value) => {
    if (!content) return;
    const newIncluded = [...content.included];
    newIncluded[index] = { ...newIncluded[index], [field]: value };
    setContent({ ...content, included: newIncluded });
  };
  const removeIncluded = (index) => {
    if (!content) return;
    setContent({ ...content, included: content.included.filter((_, i) => i !== index) });
  };
  const addIncluded = () => {
    if (!content) return;
    setContent({ ...content, included: [...content.included, { title: "", link: "" }] });
  };
  const updateSpecLine = (groupIndex, lineIndex, field, value) => {
    if (!content) return;
    const newSpecs = [...content.specs];
    newSpecs[groupIndex] = {
      ...newSpecs[groupIndex],
      lines: newSpecs[groupIndex].lines.map(
        (line, i) => i === lineIndex ? { ...line, [field]: value } : line
      )
    };
    setContent({ ...content, specs: newSpecs });
  };
  const removeSpecLine = (groupIndex, lineIndex) => {
    if (!content) return;
    const newSpecs = [...content.specs];
    newSpecs[groupIndex] = {
      ...newSpecs[groupIndex],
      lines: newSpecs[groupIndex].lines.filter((_, i) => i !== lineIndex)
    };
    setContent({ ...content, specs: newSpecs });
  };
  const handleSave = () => {
    if (!selectedProduct || !content) return;
    const formData = new FormData();
    formData.append("intent", "save");
    formData.append("productId", selectedProduct.id);
    formData.append("content", JSON.stringify(content));
    fetcher.submit(formData, { method: "post" });
  };
  return /* @__PURE__ */ jsx(Page, { title: "Product Bridge", subtitle: "AI-powered product content automation", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
    extractResult?.success && /* @__PURE__ */ jsx(
      Banner,
      {
        title: "Metafields saved successfully!",
        tone: "success",
        onDismiss: () => {
        }
      }
    ),
    extractResult?.error && /* @__PURE__ */ jsx(
      Banner,
      {
        title: "Error",
        tone: "critical",
        children: extractResult.error
      }
    ),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Step 1: Select Product" }),
      /* @__PURE__ */ jsx(
        Autocomplete,
        {
          options: productOptions,
          selected: selectedProduct ? [selectedProduct.id] : [],
          onSelect: handleProductSelect,
          textField: /* @__PURE__ */ jsx(
            Autocomplete.TextField,
            {
              onChange: setSearchValue,
              label: "Search products",
              value: searchValue,
              prefix: /* @__PURE__ */ jsx(Icon, { source: SearchIcon }),
              placeholder: "Start typing to search...",
              autoComplete: "off"
            }
          )
        }
      ),
      selectedProduct && /* @__PURE__ */ jsxs(InlineStack, { gap: "400", align: "start", blockAlign: "center", children: [
        selectedProduct.featuredImage?.url && /* @__PURE__ */ jsx(
          Thumbnail,
          {
            source: selectedProduct.featuredImage.url,
            alt: selectedProduct.title,
            size: "medium"
          }
        ),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", fontWeight: "semibold", children: selectedProduct.title }),
          /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
            "ID: ",
            selectedProduct.id.replace("gid://shopify/Product/", "")
          ] })
        ] }),
        /* @__PURE__ */ jsx(Badge, { tone: "info", children: "Selected" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Step 2: Import Product Specs" }),
      /* @__PURE__ */ jsx(Tabs, { tabs: inputTabs, selected: inputTab, onSelect: setInputTab }),
      inputTab === 0 && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "Raw specs from manufacturer",
            multiline: 8,
            value: specsText,
            onChange: setSpecsText,
            placeholder: "Paste the full specification sheet from the manufacturer website...",
            autoComplete: "off"
          }
        ),
        /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "extract" }),
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "text", value: specsText }),
          /* @__PURE__ */ jsx(Button, { variant: "primary", submit: true, loading: isExtracting, disabled: !specsText.trim(), children: "Extract Content with AI" })
        ] })
      ] }),
      inputTab === 1 && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(
          DropZone,
          {
            onDrop: handleFileDrop,
            accept: ".pdf,application/pdf",
            type: "file",
            allowMultiple: false,
            children: uploadedFile ? /* @__PURE__ */ jsxs(BlockStack, { gap: "200", inlineAlign: "center", children: [
              /* @__PURE__ */ jsx(Icon, { source: ImportIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", fontWeight: "semibold", children: uploadedFile.name }),
              /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                (uploadedFile.size / 1024 / 1024).toFixed(2),
                " MB"
              ] }),
              /* @__PURE__ */ jsx(Button, { variant: "plain", onClick: () => setUploadedFile(null), children: "Remove" })
            ] }) : /* @__PURE__ */ jsx(DropZone.FileUpload, { actionTitle: "Upload PDF", actionHint: "or drag and drop" })
          }
        ),
        /* @__PURE__ */ jsx(InlineStack, { gap: "200", children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            onClick: handlePdfExtract,
            loading: isExtracting && fetcher.formData?.get("intent") === "extract-pdf",
            disabled: !uploadedFile,
            children: "Extract Content from PDF"
          }
        ) }),
        /* @__PURE__ */ jsx(Banner, { tone: "info", children: /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Upload manufacturer spec sheets or product brochures. Works best with text-based PDFs. Image-only PDFs may not extract correctly." }) })
      ] }),
      inputTab === 2 && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "Manufacturer product page URL",
            value: urlValue,
            onChange: setUrlValue,
            placeholder: "https://www.usa.canon.com/shop/p/eos-r5-mark-ii",
            autoComplete: "off",
            prefix: /* @__PURE__ */ jsx(Icon, { source: LinkIcon })
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            onClick: handleUrlExtract,
            loading: isExtracting && fetcher.formData?.get("intent") === "extract-url",
            disabled: !urlValue.trim(),
            children: "Scrape & Extract Content"
          }
        ),
        /* @__PURE__ */ jsx(Banner, { tone: "info", children: /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Supported manufacturers: Canon, Sony, Nikon, Fujifilm, Panasonic, Leica, Sigma, Tamron, DJI, GoPro, and more. Works best with product specification pages." }) })
      ] }),
      sourceInfo && content && /* @__PURE__ */ jsx(Banner, { tone: "success", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
        /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", fontWeight: "semibold", children: "Content extracted successfully!" }),
        sourceInfo.type === "pdf" && /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
          "Source: ",
          sourceInfo.filename,
          " (",
          sourceInfo.pages,
          " pages)"
        ] }),
        sourceInfo.type === "url" && /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
          "Source: ",
          sourceInfo.title || sourceInfo.url,
          sourceInfo.manufacturer && ` (${sourceInfo.manufacturer})`
        ] })
      ] }) })
    ] }) }),
    content && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Step 3: Review & Edit Content" }),
        /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setShowPreview(true), children: "Preview JSON" })
      ] }),
      /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsxs(Text, { as: "h3", variant: "headingSm", children: [
            "Highlights (",
            content.highlights.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "plain", onClick: addHighlight, icon: PlusIcon, children: "Add" })
        ] }),
        content.highlights.map((highlight, index) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", blockAlign: "center", children: [
          /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
            TextField,
            {
              label: "",
              labelHidden: true,
              value: highlight,
              onChange: (v) => updateHighlight(index, v),
              autoComplete: "off"
            }
          ) }),
          /* @__PURE__ */ jsx(Button, { variant: "plain", tone: "critical", onClick: () => removeHighlight(index), icon: DeleteIcon })
        ] }, index))
      ] }),
      /* @__PURE__ */ jsx(Divider, {}),
      /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsxs(Text, { as: "h3", variant: "headingSm", children: [
            "Featured Specs (",
            content.featured.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "plain", onClick: addFeatured, icon: PlusIcon, children: "Add" })
        ] }),
        content.featured.map((spec, index) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", blockAlign: "end", children: [
          /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Title",
              value: spec.title,
              onChange: (v) => updateFeatured(index, "title", v),
              autoComplete: "off"
            }
          ) }),
          /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Value",
              value: spec.value,
              onChange: (v) => updateFeatured(index, "value", v),
              autoComplete: "off"
            }
          ) }),
          /* @__PURE__ */ jsx(Button, { variant: "plain", tone: "critical", onClick: () => removeFeatured(index), icon: DeleteIcon })
        ] }, index))
      ] }),
      /* @__PURE__ */ jsx(Divider, {}),
      /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsxs(Text, { as: "h3", variant: "headingSm", children: [
            "What's Included (",
            content.included.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "plain", onClick: addIncluded, icon: PlusIcon, children: "Add" })
        ] }),
        content.included.map((item, index) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", blockAlign: "end", children: [
          /* @__PURE__ */ jsx("div", { style: { flex: 2 }, children: /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Item",
              value: item.title,
              onChange: (v) => updateIncluded(index, "title", v),
              autoComplete: "off"
            }
          ) }),
          /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Link (optional)",
              value: item.link,
              onChange: (v) => updateIncluded(index, "link", v),
              autoComplete: "off",
              placeholder: "/products/..."
            }
          ) }),
          /* @__PURE__ */ jsx(Button, { variant: "plain", tone: "critical", onClick: () => removeIncluded(index), icon: DeleteIcon })
        ] }, index))
      ] }),
      /* @__PURE__ */ jsx(Divider, {}),
      /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsxs(Text, { as: "h3", variant: "headingSm", children: [
          "Specifications (",
          content.specs.length,
          " groups)"
        ] }),
        content.specs.map((group, groupIndex) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { as: "h4", variant: "headingSm", children: group.heading }),
          group.lines.map((line, lineIndex) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", blockAlign: "end", children: [
            /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Spec",
                value: line.title,
                onChange: (v) => updateSpecLine(groupIndex, lineIndex, "title", v),
                autoComplete: "off",
                size: "slim"
              }
            ) }),
            /* @__PURE__ */ jsx("div", { style: { flex: 2 }, children: /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Value",
                value: line.text,
                onChange: (v) => updateSpecLine(groupIndex, lineIndex, "text", v),
                autoComplete: "off",
                size: "slim"
              }
            ) }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "plain",
                tone: "critical",
                onClick: () => removeSpecLine(groupIndex, lineIndex),
                icon: DeleteIcon
              }
            )
          ] }, lineIndex))
        ] }) }, groupIndex))
      ] }),
      /* @__PURE__ */ jsx(Divider, {}),
      /* @__PURE__ */ jsx(InlineStack, { align: "end", children: /* @__PURE__ */ jsx(
        Button,
        {
          variant: "primary",
          onClick: handleSave,
          loading: isSaving,
          disabled: !selectedProduct,
          icon: CheckIcon,
          children: "Save to Product Metafields"
        }
      ) }),
      !selectedProduct && /* @__PURE__ */ jsx(Banner, { tone: "warning", children: "Please select a product in Step 1 before saving." })
    ] }) }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showPreview,
        onClose: () => setShowPreview(false),
        title: "JSON Preview",
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsx("pre", { style: { fontSize: "12px", overflow: "auto", maxHeight: "500px", background: "#f6f6f7", padding: "16px", borderRadius: "8px" }, children: JSON.stringify(content, null, 2) }) })
      }
    )
  ] }) });
}
function ErrorBoundary$1() {
  const error = useRouteError();
  const getErrorInfo = () => {
    if (error && typeof error === "object" && "message" in error && "suggestion" in error) {
      return error;
    }
    return {
      message: "Something went wrong.",
      suggestion: "Try refreshing the page or re-opening the app."
    };
  };
  const { message, suggestion } = getErrorInfo();
  return /* @__PURE__ */ jsx(Page, { title: "Product Bridge", children: /* @__PURE__ */ jsx(Banner, { tone: "critical", title: message, children: suggestion }) });
}

const route2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary$1,
  action: action$2,
  default: AppIndex,
  loader: loader$4
}, Symbol.toStringTag, { value: 'Module' }));

const Polaris = {
	ActionMenu: {
		Actions: {
			moreActions: "More actions"
		},
		RollupActions: {
			rollupButton: "View actions"
		}
	},
	ActionList: {
		SearchField: {
			clearButtonLabel: "Clear",
			search: "Search",
			placeholder: "Search actions"
		}
	},
	Avatar: {
		label: "Avatar",
		labelWithInitials: "Avatar with initials {initials}"
	},
	Autocomplete: {
		spinnerAccessibilityLabel: "Loading",
		ellipsis: "{content}…"
	},
	Badge: {
		PROGRESS_LABELS: {
			incomplete: "Incomplete",
			partiallyComplete: "Partially complete",
			complete: "Complete"
		},
		TONE_LABELS: {
			info: "Info",
			success: "Success",
			warning: "Warning",
			critical: "Critical",
			attention: "Attention",
			"new": "New",
			readOnly: "Read-only",
			enabled: "Enabled"
		},
		progressAndTone: "{toneLabel} {progressLabel}"
	},
	Banner: {
		dismissButton: "Dismiss notification"
	},
	Button: {
		spinnerAccessibilityLabel: "Loading"
	},
	Common: {
		checkbox: "checkbox",
		undo: "Undo",
		cancel: "Cancel",
		clear: "Clear",
		close: "Close",
		submit: "Submit",
		more: "More"
	},
	ContextualSaveBar: {
		save: "Save",
		discard: "Discard"
	},
	DataTable: {
		sortAccessibilityLabel: "sort {direction} by",
		navAccessibilityLabel: "Scroll table {direction} one column",
		totalsRowHeading: "Totals",
		totalRowHeading: "Total"
	},
	DatePicker: {
		previousMonth: "Show previous month, {previousMonthName} {showPreviousYear}",
		nextMonth: "Show next month, {nextMonth} {nextYear}",
		today: "Today ",
		start: "Start of range",
		end: "End of range",
		months: {
			january: "January",
			february: "February",
			march: "March",
			april: "April",
			may: "May",
			june: "June",
			july: "July",
			august: "August",
			september: "September",
			october: "October",
			november: "November",
			december: "December"
		},
		days: {
			monday: "Monday",
			tuesday: "Tuesday",
			wednesday: "Wednesday",
			thursday: "Thursday",
			friday: "Friday",
			saturday: "Saturday",
			sunday: "Sunday"
		},
		daysAbbreviated: {
			monday: "Mo",
			tuesday: "Tu",
			wednesday: "We",
			thursday: "Th",
			friday: "Fr",
			saturday: "Sa",
			sunday: "Su"
		}
	},
	DiscardConfirmationModal: {
		title: "Discard all unsaved changes",
		message: "If you discard changes, you’ll delete any edits you made since you last saved.",
		primaryAction: "Discard changes",
		secondaryAction: "Continue editing"
	},
	DropZone: {
		single: {
			overlayTextFile: "Drop file to upload",
			overlayTextImage: "Drop image to upload",
			overlayTextVideo: "Drop video to upload",
			actionTitleFile: "Add file",
			actionTitleImage: "Add image",
			actionTitleVideo: "Add video",
			actionHintFile: "or drop file to upload",
			actionHintImage: "or drop image to upload",
			actionHintVideo: "or drop video to upload",
			labelFile: "Upload file",
			labelImage: "Upload image",
			labelVideo: "Upload video"
		},
		allowMultiple: {
			overlayTextFile: "Drop files to upload",
			overlayTextImage: "Drop images to upload",
			overlayTextVideo: "Drop videos to upload",
			actionTitleFile: "Add files",
			actionTitleImage: "Add images",
			actionTitleVideo: "Add videos",
			actionHintFile: "or drop files to upload",
			actionHintImage: "or drop images to upload",
			actionHintVideo: "or drop videos to upload",
			labelFile: "Upload files",
			labelImage: "Upload images",
			labelVideo: "Upload videos"
		},
		errorOverlayTextFile: "File type is not valid",
		errorOverlayTextImage: "Image type is not valid",
		errorOverlayTextVideo: "Video type is not valid"
	},
	EmptySearchResult: {
		altText: "Empty search results"
	},
	Frame: {
		skipToContent: "Skip to content",
		navigationLabel: "Navigation",
		Navigation: {
			closeMobileNavigationLabel: "Close navigation"
		}
	},
	FullscreenBar: {
		back: "Back",
		accessibilityLabel: "Exit fullscreen mode"
	},
	Filters: {
		moreFilters: "More filters",
		moreFiltersWithCount: "More filters ({count})",
		filter: "Filter {resourceName}",
		noFiltersApplied: "No filters applied",
		cancel: "Cancel",
		done: "Done",
		clearAllFilters: "Clear all filters",
		clear: "Clear",
		clearLabel: "Clear {filterName}",
		addFilter: "Add filter",
		clearFilters: "Clear all",
		searchInView: "in:{viewName}"
	},
	FilterPill: {
		clear: "Clear",
		unsavedChanges: "Unsaved changes - {label}"
	},
	IndexFilters: {
		searchFilterTooltip: "Search and filter",
		searchFilterTooltipWithShortcut: "Search and filter (F)",
		searchFilterAccessibilityLabel: "Search and filter results",
		sort: "Sort your results",
		addView: "Add a new view",
		newView: "Custom search",
		SortButton: {
			ariaLabel: "Sort the results",
			tooltip: "Sort",
			title: "Sort by",
			sorting: {
				asc: "Ascending",
				desc: "Descending",
				az: "A-Z",
				za: "Z-A"
			}
		},
		EditColumnsButton: {
			tooltip: "Edit columns",
			accessibilityLabel: "Customize table column order and visibility"
		},
		UpdateButtons: {
			cancel: "Cancel",
			update: "Update",
			save: "Save",
			saveAs: "Save as",
			modal: {
				title: "Save view as",
				label: "Name",
				sameName: "A view with this name already exists. Please choose a different name.",
				save: "Save",
				cancel: "Cancel"
			}
		}
	},
	IndexProvider: {
		defaultItemSingular: "Item",
		defaultItemPlural: "Items",
		allItemsSelected: "All {itemsLength}+ {resourceNamePlural} are selected",
		selected: "{selectedItemsCount} selected",
		a11yCheckboxDeselectAllSingle: "Deselect {resourceNameSingular}",
		a11yCheckboxSelectAllSingle: "Select {resourceNameSingular}",
		a11yCheckboxDeselectAllMultiple: "Deselect all {itemsLength} {resourceNamePlural}",
		a11yCheckboxSelectAllMultiple: "Select all {itemsLength} {resourceNamePlural}"
	},
	IndexTable: {
		emptySearchTitle: "No {resourceNamePlural} found",
		emptySearchDescription: "Try changing the filters or search term",
		onboardingBadgeText: "New",
		resourceLoadingAccessibilityLabel: "Loading {resourceNamePlural}…",
		selectAllLabel: "Select all {resourceNamePlural}",
		selected: "{selectedItemsCount} selected",
		undo: "Undo",
		selectAllItems: "Select all {itemsLength}+ {resourceNamePlural}",
		selectItem: "Select {resourceName}",
		selectButtonText: "Select",
		sortAccessibilityLabel: "sort {direction} by"
	},
	Loading: {
		label: "Page loading bar"
	},
	Modal: {
		iFrameTitle: "body markup",
		modalWarning: "These required properties are missing from Modal: {missingProps}"
	},
	Page: {
		Header: {
			rollupActionsLabel: "View actions for {title}",
			pageReadyAccessibilityLabel: "{title}. This page is ready"
		}
	},
	Pagination: {
		previous: "Previous",
		next: "Next",
		pagination: "Pagination"
	},
	ProgressBar: {
		negativeWarningMessage: "Values passed to the progress prop shouldn’t be negative. Resetting {progress} to 0.",
		exceedWarningMessage: "Values passed to the progress prop shouldn’t exceed 100. Setting {progress} to 100."
	},
	ResourceList: {
		sortingLabel: "Sort by",
		defaultItemSingular: "item",
		defaultItemPlural: "items",
		showing: "Showing {itemsCount} {resource}",
		showingTotalCount: "Showing {itemsCount} of {totalItemsCount} {resource}",
		loading: "Loading {resource}",
		selected: "{selectedItemsCount} selected",
		allItemsSelected: "All {itemsLength}+ {resourceNamePlural} in your store are selected",
		allFilteredItemsSelected: "All {itemsLength}+ {resourceNamePlural} in this filter are selected",
		selectAllItems: "Select all {itemsLength}+ {resourceNamePlural} in your store",
		selectAllFilteredItems: "Select all {itemsLength}+ {resourceNamePlural} in this filter",
		emptySearchResultTitle: "No {resourceNamePlural} found",
		emptySearchResultDescription: "Try changing the filters or search term",
		selectButtonText: "Select",
		a11yCheckboxDeselectAllSingle: "Deselect {resourceNameSingular}",
		a11yCheckboxSelectAllSingle: "Select {resourceNameSingular}",
		a11yCheckboxDeselectAllMultiple: "Deselect all {itemsLength} {resourceNamePlural}",
		a11yCheckboxSelectAllMultiple: "Select all {itemsLength} {resourceNamePlural}",
		Item: {
			actionsDropdownLabel: "Actions for {accessibilityLabel}",
			actionsDropdown: "Actions dropdown",
			viewItem: "View details for {itemName}"
		},
		BulkActions: {
			actionsActivatorLabel: "Actions",
			moreActionsActivatorLabel: "More actions"
		}
	},
	SkeletonPage: {
		loadingLabel: "Page loading"
	},
	Tabs: {
		newViewAccessibilityLabel: "Create new view",
		newViewTooltip: "Create view",
		toggleTabsLabel: "More views",
		Tab: {
			rename: "Rename view",
			duplicate: "Duplicate view",
			edit: "Edit view",
			editColumns: "Edit columns",
			"delete": "Delete view",
			copy: "Copy of {name}",
			deleteModal: {
				title: "Delete view?",
				description: "This can’t be undone. {viewName} view will no longer be available in your admin.",
				cancel: "Cancel",
				"delete": "Delete view"
			}
		},
		RenameModal: {
			title: "Rename view",
			label: "Name",
			cancel: "Cancel",
			create: "Save",
			errors: {
				sameName: "A view with this name already exists. Please choose a different name."
			}
		},
		DuplicateModal: {
			title: "Duplicate view",
			label: "Name",
			cancel: "Cancel",
			create: "Create view",
			errors: {
				sameName: "A view with this name already exists. Please choose a different name."
			}
		},
		CreateViewModal: {
			title: "Create new view",
			label: "Name",
			cancel: "Cancel",
			create: "Create view",
			errors: {
				sameName: "A view with this name already exists. Please choose a different name."
			}
		}
	},
	Tag: {
		ariaLabel: "Remove {children}"
	},
	TextField: {
		characterCount: "{count} characters",
		characterCountWithMaxLength: "{count} of {limit} characters used"
	},
	TooltipOverlay: {
		accessibilityLabel: "Tooltip: {label}"
	},
	TopBar: {
		toggleMenuLabel: "Toggle menu",
		SearchField: {
			clearButtonLabel: "Clear",
			search: "Search"
		}
	},
	MediaCard: {
		dismissButton: "Dismiss",
		popoverButton: "Actions"
	},
	VideoThumbnail: {
		playButtonA11yLabel: {
			"default": "Play video",
			defaultWithDuration: "Play video of length {duration}",
			duration: {
				hours: {
					other: {
						only: "{hourCount} hours",
						andMinutes: "{hourCount} hours and {minuteCount} minutes",
						andMinute: "{hourCount} hours and {minuteCount} minute",
						minutesAndSeconds: "{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds",
						minutesAndSecond: "{hourCount} hours, {minuteCount} minutes, and {secondCount} second",
						minuteAndSeconds: "{hourCount} hours, {minuteCount} minute, and {secondCount} seconds",
						minuteAndSecond: "{hourCount} hours, {minuteCount} minute, and {secondCount} second",
						andSeconds: "{hourCount} hours and {secondCount} seconds",
						andSecond: "{hourCount} hours and {secondCount} second"
					},
					one: {
						only: "{hourCount} hour",
						andMinutes: "{hourCount} hour and {minuteCount} minutes",
						andMinute: "{hourCount} hour and {minuteCount} minute",
						minutesAndSeconds: "{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds",
						minutesAndSecond: "{hourCount} hour, {minuteCount} minutes, and {secondCount} second",
						minuteAndSeconds: "{hourCount} hour, {minuteCount} minute, and {secondCount} seconds",
						minuteAndSecond: "{hourCount} hour, {minuteCount} minute, and {secondCount} second",
						andSeconds: "{hourCount} hour and {secondCount} seconds",
						andSecond: "{hourCount} hour and {secondCount} second"
					}
				},
				minutes: {
					other: {
						only: "{minuteCount} minutes",
						andSeconds: "{minuteCount} minutes and {secondCount} seconds",
						andSecond: "{minuteCount} minutes and {secondCount} second"
					},
					one: {
						only: "{minuteCount} minute",
						andSeconds: "{minuteCount} minute and {secondCount} seconds",
						andSecond: "{minuteCount} minute and {secondCount} second"
					}
				},
				seconds: {
					other: "{secondCount} seconds",
					one: "{secondCount} second"
				}
			}
		}
	}
};
const enTranslations = {
	Polaris: Polaris
};

const loader$3 = async ({ request }) => {
  const url = new URL(request.url);
  const shopError = url.searchParams.get("shop-error");
  return json({ shopError });
};
const action$1 = async ({ request }) => {
  const errors = await login(request);
  return json({ errors });
};
function Auth() {
  const { shopError } = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const errorMessage = shopError || actionData?.errors?.shop;
  return /* @__PURE__ */ jsx(AppProvider, { i18n: enTranslations, children: /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(FormLayout, { children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Log in to Product Bridge" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        type: "text",
        name: "shop",
        label: "Shop domain",
        helpText: "yourshop.myshopify.com",
        value: shop,
        onChange: setShop,
        autoComplete: "on",
        error: errorMessage || void 0
      }
    ),
    /* @__PURE__ */ jsx(Button, { submit: true, children: "Log in" })
  ] }) }) }) }) });
}

const route3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: Auth,
  loader: loader$3
}, Symbol.toStringTag, { value: 'Module' }));

const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);
  if (!admin) {
    throw new Response();
  }
  switch (topic) {
    case "APP_UNINSTALLED":
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }
  throw new Response();
};

const route4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action
}, Symbol.toStringTag, { value: 'Module' }));

const loader$2 = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return login(request);
};

const route5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$2
}, Symbol.toStringTag, { value: 'Module' }));

const loader$1 = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const route6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$1
}, Symbol.toStringTag, { value: 'Module' }));

const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};
function App() {
  const { apiKey } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider$1, { isEmbeddedApp: true, apiKey, children: [
    /* @__PURE__ */ jsx(NavMenu, { children: /* @__PURE__ */ jsx(Link, { to: "/app", rel: "home", children: "Home" }) }),
    /* @__PURE__ */ jsx(Outlet, {})
  ] });
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

const route7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  loader
}, Symbol.toStringTag, { value: 'Module' }));

const serverManifest = {'entry':{'module':'/assets/entry.client-Cl0odWUN.js','imports':['/assets/components-bfDKBDPN.js'],'css':[]},'routes':{'root':{'id':'root','parentId':undefined,'path':'','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/root-DHzqGsh7.js','imports':['/assets/components-bfDKBDPN.js'],'css':[]},'routes/api.extract':{'id':'routes/api.extract','parentId':'root','path':'api/extract','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.extract-l0sNRNKZ.js','imports':[],'css':[]},'routes/app._index':{'id':'routes/app._index','parentId':'routes/app','path':undefined,'index':true,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':true,'module':'/assets/app._index-LAMYE4sL.js','imports':['/assets/components-bfDKBDPN.js','/assets/Page-BapPfwum.js','/assets/context-fvRqhjvj.js'],'css':[]},'routes/auth.login':{'id':'routes/auth.login','parentId':'root','path':'auth/login','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/route-DC0inYcF.js','imports':['/assets/components-bfDKBDPN.js','/assets/en-lBrUGu9Q.js','/assets/Page-BapPfwum.js','/assets/context-fvRqhjvj.js'],'css':[]},'routes/webhooks':{'id':'routes/webhooks','parentId':'root','path':'webhooks','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/webhooks-l0sNRNKZ.js','imports':[],'css':[]},'routes/_index':{'id':'routes/_index','parentId':'root','path':undefined,'index':true,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/_index-l0sNRNKZ.js','imports':[],'css':[]},'routes/auth.$':{'id':'routes/auth.$','parentId':'root','path':'auth/*','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/auth._-l0sNRNKZ.js','imports':[],'css':[]},'routes/app':{'id':'routes/app','parentId':'root','path':'app','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':true,'module':'/assets/app-CD3ikEgN.js','imports':['/assets/components-bfDKBDPN.js','/assets/en-lBrUGu9Q.js','/assets/context-fvRqhjvj.js'],'css':[]}},'url':'/assets/manifest-f226d393.js','version':'f226d393'};

/**
       * `mode` is only relevant for the old Remix compiler but
       * is included here to satisfy the `ServerBuild` typings.
       */
      const mode = "production";
      const assetsBuildDirectory = "build/client";
      const basename = "/";
      const future = {"v3_fetcherPersist":false,"v3_relativeSplatPath":false,"v3_throwAbortReason":false,"v3_routeConfig":false,"v3_singleFetch":false,"v3_lazyRouteDiscovery":false,"unstable_optimizeDeps":false};
      const isSpaMode = false;
      const publicPath = "/";
      const entry = { module: entryServer };
      const routes = {
        "root": {
          id: "root",
          parentId: undefined,
          path: "",
          index: undefined,
          caseSensitive: undefined,
          module: route0
        },
  "routes/api.extract": {
          id: "routes/api.extract",
          parentId: "root",
          path: "api/extract",
          index: undefined,
          caseSensitive: undefined,
          module: route1
        },
  "routes/app._index": {
          id: "routes/app._index",
          parentId: "routes/app",
          path: undefined,
          index: true,
          caseSensitive: undefined,
          module: route2
        },
  "routes/auth.login": {
          id: "routes/auth.login",
          parentId: "root",
          path: "auth/login",
          index: undefined,
          caseSensitive: undefined,
          module: route3
        },
  "routes/webhooks": {
          id: "routes/webhooks",
          parentId: "root",
          path: "webhooks",
          index: undefined,
          caseSensitive: undefined,
          module: route4
        },
  "routes/_index": {
          id: "routes/_index",
          parentId: "root",
          path: undefined,
          index: true,
          caseSensitive: undefined,
          module: route5
        },
  "routes/auth.$": {
          id: "routes/auth.$",
          parentId: "root",
          path: "auth/*",
          index: undefined,
          caseSensitive: undefined,
          module: route6
        },
  "routes/app": {
          id: "routes/app",
          parentId: "root",
          path: "app",
          index: undefined,
          caseSensitive: undefined,
          module: route7
        }
      };

export { serverManifest as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, mode, publicPath, routes };
