import * as cheerio from "cheerio";
import { retryFetch } from "../utils/retry";
import type { UserError } from "../utils/errors.server";

export interface ScrapeResult {
  title: string;
  text: string;
  url: string;
  manufacturer?: string;
}

// Common selectors for manufacturer product pages
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
  '.productSpec',
  '.product-spec',
  '#productSpec',
  '.specifications',
  
  // Sony specific
  '.ProductSpecification',
  '.spec-table',
  '[class*="SpecList"]',
  
  // Nikon specific
  '.productSpecs',
  '.specificationTable',
  
  // Generic fallbacks
  'article',
  'main',
  '.product-detail',
  '.product-info',
];

// Selectors to skip (navigation, footer, etc.)
const SKIP_SELECTORS = [
  'nav',
  'header',
  'footer',
  '.nav',
  '.header',
  '.footer',
  '.menu',
  '.sidebar',
  '.cookie',
  '.newsletter',
  '.social',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  'script',
  'style',
  'noscript',
];

/**
 * Detect manufacturer from URL
 */
function detectManufacturer(url: string): string | undefined {
  const hostname = new URL(url).hostname.toLowerCase();
  
  const manufacturers: Record<string, string> = {
    'canon': 'Canon',
    'sony': 'Sony',
    'nikon': 'Nikon',
    'fujifilm': 'Fujifilm',
    'panasonic': 'Panasonic',
    'olympus': 'Olympus',
    'leica': 'Leica',
    'sigma': 'Sigma',
    'tamron': 'Tamron',
    'zeiss': 'Zeiss',
    'hasselblad': 'Hasselblad',
    'dji': 'DJI',
    'gopro': 'GoPro',
    'blackmagic': 'Blackmagic',
    'rode': 'Rode',
    'sennheiser': 'Sennheiser',
    'manfrotto': 'Manfrotto',
    'gitzo': 'Gitzo',
    'profoto': 'Profoto',
    'godox': 'Godox',
    'peak design': 'Peak Design',
    'peakdesign': 'Peak Design',
    'benq': 'BenQ',
  };
  
  for (const [key, name] of Object.entries(manufacturers)) {
    if (hostname.includes(key)) {
      return name;
    }
  }
  
  return undefined;
}

/**
 * Clean up extracted text
 */
function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/[\t\r]+/g, ' ')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Collapse multiple spaces
    .replace(/ {2,}/g, ' ')
    // Remove leading/trailing whitespace from lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Extract text from HTML, focusing on product spec content
 */
function extractSpecText($: cheerio.CheerioAPI): string {
  // Remove elements we don't want
  SKIP_SELECTORS.forEach(selector => {
    $(selector).remove();
  });
  
  const textParts: string[] = [];
  
  // Try each spec selector in order of specificity
  for (const selector of SPEC_SELECTORS) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((_, el) => {
        const text = $(el).text();
        if (text.length > 50) { // Only include substantial content
          textParts.push(text);
        }
      });
      
      // If we found good content, we can stop
      if (textParts.join('').length > 500) {
        break;
      }
    }
  }
  
  // Fallback: if no specs found, get body text
  if (textParts.length === 0) {
    const bodyText = $('body').text();
    textParts.push(bodyText);
  }
  
  return cleanText(textParts.join('\n\n'));
}

/**
 * Extract tables as structured text
 */
function extractTables($: cheerio.CheerioAPI): string {
  const tableParts: string[] = [];
  
  $('table').each((_, table) => {
    const rows: string[] = [];
    $(table).find('tr').each((_, tr) => {
      const cells: string[] = [];
      $(tr).find('th, td').each((_, cell) => {
        cells.push($(cell).text().trim());
      });
      if (cells.length > 0) {
        rows.push(cells.join(': '));
      }
    });
    if (rows.length > 0) {
      tableParts.push(rows.join('\n'));
    }
  });
  
  return tableParts.join('\n\n');
}

/**
 * Scrape a manufacturer product page and extract relevant content
 */
export async function scrapeProductPage(url: string): Promise<ScrapeResult> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    const error: UserError = {
      code: "url.invalid",
      message: "That URL doesn't look valid.",
      suggestion: "Include the full https:// address."
    };
    throw error;
  }
  
  // Only allow HTTP/HTTPS
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    const error: UserError = {
      code: "url.protocol",
      message: "Only HTTP and HTTPS URLs are supported.",
      suggestion: "Use an https:// product page."
    };
    throw error;
  }

  // Additional SSRF protection
  const host = parsedUrl.hostname.toLowerCase();
  const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "10.", "192.168.", "172."];
  if (blocked.some(b => host.includes(b)) || host.endsWith(".local") || host.endsWith(".internal")) {
    const error: UserError = {
      code: "url.blocked",
      message: "Local or internal URLs are not allowed.",
      suggestion: "Use a public manufacturer product page."
    };
    throw error;
  }
  
  try {
    const fetchResult = await retryFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!fetchResult.success) {
      const error = fetchResult.error!;
      let errorMsg: UserError;
      
      const status = (error as any)?.status;
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

    const response = fetchResult.data!
    
    if (!response.ok) {
      let errorMsg: UserError;
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
    
    // Get page title
    const title = $('title').text().trim() || 
                  $('h1').first().text().trim() || 
                  'Unknown Product';
    
    // Extract tables separately (often contain specs)
    const tableText = extractTables($);
    
    // Extract other spec content
    const specText = extractSpecText($);
    
    // Combine all text
    const combinedText = [tableText, specText]
      .filter(t => t.length > 0)
      .join('\n\n---\n\n');
    
    if (!combinedText.trim()) {
      const error: UserError = {
        code: "url.no_content",
        message: "No content could be extracted from this page.",
        suggestion: "Try a different product page or paste specs directly."
      };
      throw error;
    }
    
    // Truncate if too long (GPT has token limits)
    const maxLength = 30000;
    const text = combinedText.length > maxLength 
      ? combinedText.slice(0, maxLength) + '\n\n[Content truncated...]'
      : combinedText;
    
    return {
      title,
      text,
      url,
      manufacturer: detectManufacturer(url),
    };
  } catch (error) {
    // If it's already a UserError, re-throw it
    if (error && typeof error === "object" && "code" in error) {
      throw error;
    }

    // Convert unknown errors to UserError
    console.error("URL scraping failed:", error);
    const userError: UserError = {
      code: "url.scraping_failed",
      message: "Failed to scrape the URL.",
      suggestion: "Check the URL or try again later."
    };
    throw userError;
  }
}
