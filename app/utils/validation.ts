// Validation utilities for Product Bridge app

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

/**
 * Validate URL input for product page scraping
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim().length === 0) {
    return {
      isValid: false,
      error: "URL is required",
      suggestions: ["Enter a product page URL from a camera manufacturer"]
    };
  }

  const trimmedUrl = url.trim();

  // Basic URL format validation
  try {
    const parsedUrl = new URL(trimmedUrl);
    
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: "URL must use HTTP or HTTPS protocol",
        suggestions: ["Make sure URL starts with http:// or https://"]
      };
    }

    // Check for supported manufacturers
    const supportedDomains = [
      'canon.com', 'canon.ca', 'canon.co.uk',
      'sony.com', 'sony.ca', 'sony.co.uk', 
      'nikon.com', 'nikon.ca', 'nikonusa.com',
      'fujifilm.com', 'fujifilm.ca', 'fujifilmusa.com',
      'panasonic.com', 'panasonic.ca',
      'olympus.com', 'olympus-global.com',
      'leica-camera.com', 'leica-camera.us',
      'sigma-global.com', 'sigmaphoto.com',
      'tamron.com', 'tamron.eu',
      'zeiss.com', 'zeiss.ca'
    ];

    const hostname = parsedUrl.hostname.toLowerCase();
    const isSupported = supportedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isSupported) {
      return {
        isValid: true, // Still allow, but warn
        error: "This manufacturer may not be fully supported",
        suggestions: [
          "Supported manufacturers include Canon, Sony, Nikon, Fujifilm, Panasonic, Olympus, Leica",
          "You can still try scraping - it may work partially"
        ]
      };
    }

    return { isValid: true };

  } catch (error) {
    return {
      isValid: false,
      error: "Invalid URL format",
      suggestions: [
        "Make sure the URL is complete (e.g., https://example.com/product)",
        "Copy the URL directly from your browser's address bar"
      ]
    };
  }
}

/**
 * Validate file upload (PDF)
 */
export function validateFile(file: File): ValidationResult {
  if (!file) {
    return {
      isValid: false,
      error: "No file selected",
      suggestions: ["Select a PDF file to upload"]
    };
  }

  // Check file type
  const allowedTypes = ['application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "Invalid file type",
      suggestions: [
        "Only PDF files are supported",
        "Convert your document to PDF format first"
      ]
    };
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "File too large",
      suggestions: [
        "Maximum file size is 10MB",
        "Try compressing your PDF or splitting it into smaller files"
      ]
    };
  }

  // Check filename for suspicious patterns
  const suspiciousPatterns = ['.exe', '.zip', '.rar', '<script', 'javascript:'];
  const filename = file.name.toLowerCase();
  
  if (suspiciousPatterns.some(pattern => filename.includes(pattern))) {
    return {
      isValid: false,
      error: "Potentially unsafe file",
      suggestions: ["Upload only legitimate PDF documents"]
    };
  }

  return { isValid: true };
}

/**
 * Validate text input for AI extraction
 */
export function validateTextContent(text: string): ValidationResult {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: "Text content is required",
      suggestions: ["Paste or type product specifications to extract"]
    };
  }

  const trimmedText = text.trim();

  // Minimum length check
  if (trimmedText.length < 20) {
    return {
      isValid: false,
      error: "Text too short",
      suggestions: [
        "Please provide more detailed product information",
        "Include specifications, features, or technical details"
      ]
    };
  }

  // Maximum length check (100KB)
  const maxLength = 100 * 1024;
  if (trimmedText.length > maxLength) {
    return {
      isValid: false,
      error: "Text too long",
      suggestions: [
        "Maximum text length is 100KB",
        "Try breaking large documents into smaller sections"
      ]
    };
  }

  // Check for potentially harmful content
  const suspiciousPatterns = [
    '<script', 'javascript:', 'data:', 'vbscript:',
    'onload=', 'onerror=', 'onclick='
  ];
  
  const lowerText = trimmedText.toLowerCase();
  if (suspiciousPatterns.some(pattern => lowerText.includes(pattern))) {
    return {
      isValid: false,
      error: "Content contains potentially harmful code",
      suggestions: ["Please paste only plain text product specifications"]
    };
  }

  return { isValid: true };
}

/**
 * Validate product selection
 */
export function validateProductSelection(productId: string): ValidationResult {
  if (!productId || productId.trim().length === 0) {
    return {
      isValid: false,
      error: "No product selected",
      suggestions: [
        "Search for and select a product from your Shopify store",
        "Make sure the product exists and you have access to it"
      ]
    };
  }

  // Shopify product ID format validation (gid://shopify/Product/...)
  const shopifyIdPattern = /^gid:\/\/shopify\/Product\/\d+$/;
  if (!shopifyIdPattern.test(productId)) {
    return {
      isValid: false,
      error: "Invalid product ID format",
      suggestions: [
        "Select a product from the search results",
        "Don't manually type product IDs"
      ]
    };
  }

  return { isValid: true };
}

/**
 * Validate extracted content before saving
 */
export function validateExtractedContent(content: any): ValidationResult {
  if (!content || typeof content !== 'object') {
    return {
      isValid: false,
      error: "Invalid content format",
      suggestions: ["Re-extract content or contact support"]
    };
  }

  const { specs, highlights, included, featured } = content;

  // Check for at least some content
  const hasSpecs = Array.isArray(specs) && specs.length > 0;
  const hasHighlights = Array.isArray(highlights) && highlights.length > 0;
  const hasIncluded = Array.isArray(included) && included.length > 0;
  const hasFeatured = Array.isArray(featured) && featured.length > 0;

  if (!hasSpecs && !hasHighlights && !hasIncluded && !hasFeatured) {
    return {
      isValid: false,
      error: "No content extracted",
      suggestions: [
        "Try different source content with more product details",
        "Ensure the source contains specifications, features, or product information"
      ]
    };
  }

  // Validate individual content sections
  if (hasSpecs) {
    for (const spec of specs) {
      if (!spec.heading || typeof spec.heading !== 'string') {
        return {
          isValid: false,
          error: "Invalid specifications format",
          suggestions: ["Re-extract content with valid specifications"]
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Get validation summary for multiple fields
 */
export function getValidationSummary(validations: Record<string, ValidationResult>): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  for (const [field, result] of Object.entries(validations)) {
    if (!result.isValid && result.error) {
      errors.push(`${field}: ${result.error}`);
      if (result.suggestions) {
        suggestions.push(...result.suggestions);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}