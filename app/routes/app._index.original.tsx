import { useState, useCallback, useEffect, useRef } from "react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from "@remix-run/node";
import { useLoaderData, useFetcher, useRouteError } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Thumbnail,
  Icon,
  Autocomplete,
  Tag,
  Box,
  Divider,
  Spinner,
  Modal,
  Badge,
  ProgressBar,
  DropZone,
  Tabs,
} from "@shopify/polaris";
import { SearchIcon, EditIcon, DeleteIcon, PlusIcon, CheckIcon, ImportIcon, LinkIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { extractProductContent, type ProductContent, type SpecGroup } from "../services/content-extractor.server";
import { parsePdf } from "../services/pdf-parser.server";
import { scrapeProductPage } from "../services/url-scraper.server";
import { validateUrlInput, validatePdfFile, validateTextInput, validateContentPayload } from "../utils/validation.server";
import { asUserError, type UserError } from "../utils/errors.server";
import { retryShopify } from "../utils/retry";
import { SectionErrorBoundary } from "../components/SectionErrorBoundary";

// Types
interface Product {
  id: string;
  title: string;
  handle: string;
  featuredImage?: { url: string; altText?: string } | null;
}

interface LoaderData {
  products: Product[];
}

interface FeaturedSpec {
  title: string;
  value: string;
}

interface IncludedItem {
  title: string;
  link: string;
}

// GraphQL queries
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

// Loader - fetch products
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("search") || "";

  const response = await admin.graphql(PRODUCTS_QUERY, {
    variables: {
      query: searchQuery ? `title:*${searchQuery}*` : "",
      first: 25,
    },
  });

  const data = await response.json();
  const products: Product[] = data.data?.products?.edges?.map((edge: any) => edge.node) || [];

  return json({ products });
};

// Action - handle extract, PDF, URL, and save
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  // Check content type for multipart (PDF upload)
  const contentType = request.headers.get("content-type") || "";
  
  let formData: FormData;
  
  if (contentType.includes("multipart/form-data")) {
    // Handle PDF upload
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 20_000_000, // 20MB max
    });
    formData = await unstable_parseMultipartFormData(request, uploadHandler);
  } else {
    formData = await request.formData();
  }
  
  const intent = formData.get("intent");

  // Handle PDF extraction
  if (intent === "extract-pdf") {
    const file = formData.get("pdf") as File;
    
    // Validate PDF file
    const fileValidation = await validatePdfFile(file);
    if (!fileValidation.ok) {
      return json({ error: fileValidation.error }, { status: 400 });
    }
    
    try {
      // Parse PDF
      const arrayBuffer = await fileValidation.file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfResult = await parsePdf(buffer);
      
      // Extract content with AI
      const result = await extractProductContent(pdfResult.text);
      return json({ 
        extracted: result,
        source: {
          type: "pdf",
          filename: fileValidation.file.name,
          pages: pdfResult.numPages,
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

  // Handle URL scraping
  if (intent === "extract-url") {
    const urlInput = formData.get("url") as string;
    
    // Validate URL
    const urlValidation = validateUrlInput(urlInput);
    if (!urlValidation.ok) {
      return json({ error: urlValidation.error }, { status: 400 });
    }
    
    try {
      // Scrape the page
      const scrapeResult = await scrapeProductPage(urlValidation.value);
      
      // Extract content with AI
      const result = await extractProductContent(scrapeResult.text);
      return json({ 
        extracted: result,
        source: {
          type: "url",
          url: scrapeResult.url,
          title: scrapeResult.title,
          manufacturer: scrapeResult.manufacturer,
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

  // Handle text extraction
  if (intent === "extract") {
    const textInput = formData.get("text") as string;
    
    // Validate text input
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
    const productId = formData.get("productId") as string;
    const contentJson = formData.get("content") as string;

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
      // Parse and validate content
      let parsedContent: any;
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

      // Save all metafields at once with retry logic
      const metafields = [
        {
          ownerId: productId,
          namespace: "product_bridge",
          key: "specs",
          type: "json",
          value: JSON.stringify(content.specs),
        },
        {
          ownerId: productId,
          namespace: "product_bridge",
          key: "highlights",
          type: "json",
          value: JSON.stringify(content.highlights),
        },
        {
          ownerId: productId,
          namespace: "product_bridge",
          key: "included",
          type: "json",
          value: JSON.stringify(content.included),
        },
        {
          ownerId: productId,
          namespace: "product_bridge",
          key: "featured",
          type: "json",
          value: JSON.stringify(content.featured),
        },
      ];

      const shopifyResult = await retryShopify(
        () => admin.graphql(METAFIELDS_SET_MUTATION, {
          variables: { metafields },
        })
      );

      if (!shopifyResult.success) {
        const userError: UserError = {
          code: "save.shopify_failed",
          message: "Failed to save to Shopify after retries.",
          suggestion: "Check your connection and try again."
        };
        throw userError;
      }

      const response = shopifyResult.data!

      const result = await response.json();
      const errors = result.data?.metafieldsSet?.userErrors;

      if (errors?.length > 0) {
        const errorMessages = errors.map((e: any) => e.message).join(", ");
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

// Source info type
interface SourceInfo {
  type: "text" | "pdf" | "url";
  filename?: string;
  pages?: number;
  url?: string;
  title?: string;
  manufacturer?: string;
}

// Main Component
export default function AppIndex() {
  const { products } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [specsText, setSpecsText] = useState("");
  const [content, setContent] = useState<ProductContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [inputTab, setInputTab] = useState(0);
  const [urlValue, setUrlValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);

  // Computed
  const isExtracting = fetcher.state === "submitting" && 
    (fetcher.formData?.get("intent") === "extract" || 
     fetcher.formData?.get("intent") === "extract-pdf" ||
     fetcher.formData?.get("intent") === "extract-url");
  const isSaving = fetcher.state === "submitting" && fetcher.formData?.get("intent") === "save";
  const extractResult = fetcher.data as { 
    extracted?: ProductContent; 
    success?: boolean; 
    error?: string;
    source?: SourceInfo;
  } | undefined;

  // Update content when extraction completes
  useEffect(() => {
    if (extractResult?.extracted) {
      setContent(extractResult.extracted);
      if (extractResult.source) {
        setSourceInfo(extractResult.source);
      }
    }
  }, [extractResult]);

  // Handle PDF file drop/select
  const handleFileDrop = useCallback((_dropFiles: File[], acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
    }
  }, []);

  // Handle PDF extraction
  const handlePdfExtract = () => {
    if (!uploadedFile) return;
    
    const formData = new FormData();
    formData.append("intent", "extract-pdf");
    formData.append("pdf", uploadedFile);
    
    fetcher.submit(formData, { 
      method: "post",
      encType: "multipart/form-data",
    });
  };

  // Handle URL extraction
  const handleUrlExtract = () => {
    if (!urlValue.trim()) return;
    
    const formData = new FormData();
    formData.append("intent", "extract-url");
    formData.append("url", urlValue.trim());
    
    fetcher.submit(formData, { method: "post" });
  };

  // Input tabs
  const inputTabs = [
    { id: "text", content: "📝 Paste Text" },
    { id: "pdf", content: "📄 Upload PDF" },
    { id: "url", content: "🔗 Scrape URL" },
  ];

  // Product search with autocomplete
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.title,
    media: p.featuredImage?.url ? (
      <Thumbnail source={p.featuredImage.url} alt={p.featuredImage.altText || p.title} size="small" />
    ) : undefined,
  }));

  const handleProductSelect = useCallback(
    (selected: string[]) => {
      const product = products.find((p) => p.id === selected[0]);
      if (product) {
        setSelectedProduct(product);
        setSearchValue(product.title);
      }
    },
    [products]
  );

  // Content editing handlers
  const updateHighlight = (index: number, value: string) => {
    if (!content) return;
    const newHighlights = [...content.highlights];
    newHighlights[index] = value;
    setContent({ ...content, highlights: newHighlights });
  };

  const removeHighlight = (index: number) => {
    if (!content) return;
    setContent({ ...content, highlights: content.highlights.filter((_, i) => i !== index) });
  };

  const addHighlight = () => {
    if (!content) return;
    setContent({ ...content, highlights: [...content.highlights, ""] });
  };

  const updateFeatured = (index: number, field: keyof FeaturedSpec, value: string) => {
    if (!content) return;
    const newFeatured = [...content.featured];
    newFeatured[index] = { ...newFeatured[index], [field]: value };
    setContent({ ...content, featured: newFeatured });
  };

  const removeFeatured = (index: number) => {
    if (!content) return;
    setContent({ ...content, featured: content.featured.filter((_, i) => i !== index) });
  };

  const addFeatured = () => {
    if (!content) return;
    setContent({ ...content, featured: [...content.featured, { title: "", value: "" }] });
  };

  const updateIncluded = (index: number, field: keyof IncludedItem, value: string) => {
    if (!content) return;
    const newIncluded = [...content.included];
    newIncluded[index] = { ...newIncluded[index], [field]: value };
    setContent({ ...content, included: newIncluded });
  };

  const removeIncluded = (index: number) => {
    if (!content) return;
    setContent({ ...content, included: content.included.filter((_, i) => i !== index) });
  };

  const addIncluded = () => {
    if (!content) return;
    setContent({ ...content, included: [...content.included, { title: "", link: "" }] });
  };

  const updateSpecLine = (groupIndex: number, lineIndex: number, field: "title" | "text", value: string) => {
    if (!content) return;
    const newSpecs = [...content.specs];
    newSpecs[groupIndex] = {
      ...newSpecs[groupIndex],
      lines: newSpecs[groupIndex].lines.map((line, i) =>
        i === lineIndex ? { ...line, [field]: value } : line
      ),
    };
    setContent({ ...content, specs: newSpecs });
  };

  const removeSpecLine = (groupIndex: number, lineIndex: number) => {
    if (!content) return;
    const newSpecs = [...content.specs];
    newSpecs[groupIndex] = {
      ...newSpecs[groupIndex],
      lines: newSpecs[groupIndex].lines.filter((_, i) => i !== lineIndex),
    };
    setContent({ ...content, specs: newSpecs });
  };

  // Handle save
  const handleSave = () => {
    if (!selectedProduct || !content) return;

    const formData = new FormData();
    formData.append("intent", "save");
    formData.append("productId", selectedProduct.id);
    formData.append("content", JSON.stringify(content));

    fetcher.submit(formData, { method: "post" });
  };

  return (
    <Page title="Product Bridge" subtitle="AI-powered product content automation">
      <BlockStack gap="400">
        {/* Success/Error banners */}
        {extractResult?.success && (
          <Banner
            title="Metafields saved successfully!"
            tone="success"
            onDismiss={() => {}}
          />
        )}
        {extractResult?.error && (
          <Banner
            title="Error"
            tone="critical"
          >
            {extractResult.error}
          </Banner>
        )}

        {/* Step 1: Product Selector */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Step 1: Select Product
            </Text>
            <Autocomplete
              options={productOptions}
              selected={selectedProduct ? [selectedProduct.id] : []}
              onSelect={handleProductSelect}
              textField={
                <Autocomplete.TextField
                  onChange={setSearchValue}
                  label="Search products"
                  value={searchValue}
                  prefix={<Icon source={SearchIcon} />}
                  placeholder="Start typing to search..."
                  autoComplete="off"
                />
              }
            />
            {selectedProduct && (
              <InlineStack gap="400" align="start" blockAlign="center">
                {selectedProduct.featuredImage?.url && (
                  <Thumbnail
                    source={selectedProduct.featuredImage.url}
                    alt={selectedProduct.title}
                    size="medium"
                  />
                )}
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {selectedProduct.title}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    ID: {selectedProduct.id.replace("gid://shopify/Product/", "")}
                  </Text>
                </BlockStack>
                <Badge tone="info">Selected</Badge>
              </InlineStack>
            )}
          </BlockStack>
        </Card>

        {/* Step 2: Input Source (Tabs: Text / PDF / URL) */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Step 2: Import Product Specs
            </Text>
            
            <Tabs tabs={inputTabs} selected={inputTab} onSelect={setInputTab} />
            
            {/* Text Input Tab */}
            {inputTab === 0 && (
              <BlockStack gap="400">
                <TextField
                  label="Raw specs from manufacturer"
                  multiline={8}
                  value={specsText}
                  onChange={setSpecsText}
                  placeholder="Paste the full specification sheet from the manufacturer website..."
                  autoComplete="off"
                />
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="extract" />
                  <input type="hidden" name="text" value={specsText} />
                  <Button variant="primary" submit loading={isExtracting} disabled={!specsText.trim()}>
                    Extract Content with AI
                  </Button>
                </fetcher.Form>
              </BlockStack>
            )}
            
            {/* PDF Upload Tab */}
            {inputTab === 1 && (
              <BlockStack gap="400">
                <DropZone
                  onDrop={handleFileDrop}
                  accept=".pdf,application/pdf"
                  type="file"
                  allowMultiple={false}
                >
                  {uploadedFile ? (
                    <BlockStack gap="200" inlineAlign="center">
                      <Icon source={ImportIcon} tone="success" />
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {uploadedFile.name}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                      <Button variant="plain" onClick={() => setUploadedFile(null)}>
                        Remove
                      </Button>
                    </BlockStack>
                  ) : (
                    <DropZone.FileUpload actionTitle="Upload PDF" actionHint="or drag and drop" />
                  )}
                </DropZone>
                
                <InlineStack gap="200">
                  <Button 
                    variant="primary" 
                    onClick={handlePdfExtract} 
                    loading={isExtracting && fetcher.formData?.get("intent") === "extract-pdf"}
                    disabled={!uploadedFile}
                  >
                    Extract Content from PDF
                  </Button>
                </InlineStack>
                
                <Banner tone="info">
                  <Text as="p" variant="bodySm">
                    Upload manufacturer spec sheets or product brochures. Works best with text-based PDFs. 
                    Image-only PDFs may not extract correctly.
                  </Text>
                </Banner>
              </BlockStack>
            )}
            
            {/* URL Scraping Tab */}
            {inputTab === 2 && (
              <BlockStack gap="400">
                <TextField
                  label="Manufacturer product page URL"
                  value={urlValue}
                  onChange={setUrlValue}
                  placeholder="https://www.usa.canon.com/shop/p/eos-r5-mark-ii"
                  autoComplete="off"
                  prefix={<Icon source={LinkIcon} />}
                />
                
                <Button 
                  variant="primary" 
                  onClick={handleUrlExtract}
                  loading={isExtracting && fetcher.formData?.get("intent") === "extract-url"}
                  disabled={!urlValue.trim()}
                >
                  Scrape & Extract Content
                </Button>
                
                <Banner tone="info">
                  <Text as="p" variant="bodySm">
                    Supported manufacturers: Canon, Sony, Nikon, Fujifilm, Panasonic, Leica, Sigma, Tamron, 
                    DJI, GoPro, and more. Works best with product specification pages.
                  </Text>
                </Banner>
              </BlockStack>
            )}
            
            {/* Show source info after extraction */}
            {sourceInfo && content && (
              <Banner tone="success">
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Content extracted successfully!
                  </Text>
                  {sourceInfo.type === "pdf" && (
                    <Text as="p" variant="bodySm">
                      Source: {sourceInfo.filename} ({sourceInfo.pages} pages)
                    </Text>
                  )}
                  {sourceInfo.type === "url" && (
                    <Text as="p" variant="bodySm">
                      Source: {sourceInfo.title || sourceInfo.url}
                      {sourceInfo.manufacturer && ` (${sourceInfo.manufacturer})`}
                    </Text>
                  )}
                </BlockStack>
              </Banner>
            )}
          </BlockStack>
        </Card>

        {/* Step 3: Edit Content */}
        {content && (
          <Card>
            <BlockStack gap="500">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  Step 3: Review & Edit Content
                </Text>
                <Button variant="tertiary" onClick={() => setShowPreview(true)}>
                  Preview JSON
                </Button>
              </InlineStack>

              {/* Highlights */}
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingSm">
                    Highlights ({content.highlights.length})
                  </Text>
                  <Button variant="plain" onClick={addHighlight} icon={PlusIcon}>
                    Add
                  </Button>
                </InlineStack>
                {content.highlights.map((highlight, index) => (
                  <InlineStack key={index} gap="200" align="start" blockAlign="center">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label=""
                        labelHidden
                        value={highlight}
                        onChange={(v) => updateHighlight(index, v)}
                        autoComplete="off"
                      />
                    </div>
                    <Button variant="plain" tone="critical" onClick={() => removeHighlight(index)} icon={DeleteIcon} />
                  </InlineStack>
                ))}
              </BlockStack>

              <Divider />

              {/* Featured Specs */}
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingSm">
                    Featured Specs ({content.featured.length})
                  </Text>
                  <Button variant="plain" onClick={addFeatured} icon={PlusIcon}>
                    Add
                  </Button>
                </InlineStack>
                {content.featured.map((spec, index) => (
                  <InlineStack key={index} gap="200" align="start" blockAlign="end">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Title"
                        value={spec.title}
                        onChange={(v) => updateFeatured(index, "title", v)}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Value"
                        value={spec.value}
                        onChange={(v) => updateFeatured(index, "value", v)}
                        autoComplete="off"
                      />
                    </div>
                    <Button variant="plain" tone="critical" onClick={() => removeFeatured(index)} icon={DeleteIcon} />
                  </InlineStack>
                ))}
              </BlockStack>

              <Divider />

              {/* Included Items */}
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingSm">
                    What's Included ({content.included.length})
                  </Text>
                  <Button variant="plain" onClick={addIncluded} icon={PlusIcon}>
                    Add
                  </Button>
                </InlineStack>
                {content.included.map((item, index) => (
                  <InlineStack key={index} gap="200" align="start" blockAlign="end">
                    <div style={{ flex: 2 }}>
                      <TextField
                        label="Item"
                        value={item.title}
                        onChange={(v) => updateIncluded(index, "title", v)}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Link (optional)"
                        value={item.link}
                        onChange={(v) => updateIncluded(index, "link", v)}
                        autoComplete="off"
                        placeholder="/products/..."
                      />
                    </div>
                    <Button variant="plain" tone="critical" onClick={() => removeIncluded(index)} icon={DeleteIcon} />
                  </InlineStack>
                ))}
              </BlockStack>

              <Divider />

              {/* Specs (collapsible by group) */}
              <BlockStack gap="400">
                <Text as="h3" variant="headingSm">
                  Specifications ({content.specs.length} groups)
                </Text>
                {content.specs.map((group, groupIndex) => (
                  <Card key={groupIndex}>
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">
                        {group.heading}
                      </Text>
                      {group.lines.map((line, lineIndex) => (
                        <InlineStack key={lineIndex} gap="200" align="start" blockAlign="end">
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Spec"
                              value={line.title}
                              onChange={(v) => updateSpecLine(groupIndex, lineIndex, "title", v)}
                              autoComplete="off"
                              size="slim"
                            />
                          </div>
                          <div style={{ flex: 2 }}>
                            <TextField
                              label="Value"
                              value={line.text}
                              onChange={(v) => updateSpecLine(groupIndex, lineIndex, "text", v)}
                              autoComplete="off"
                              size="slim"
                            />
                          </div>
                          <Button
                            variant="plain"
                            tone="critical"
                            onClick={() => removeSpecLine(groupIndex, lineIndex)}
                            icon={DeleteIcon}
                          />
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>

              <Divider />

              {/* Save Button */}
              <InlineStack align="end">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={!selectedProduct}
                  icon={CheckIcon}
                >
                  Save to Product Metafields
                </Button>
              </InlineStack>

              {!selectedProduct && (
                <Banner tone="warning">
                  Please select a product in Step 1 before saving.
                </Banner>
              )}
            </BlockStack>
          </Card>
        )}

        {/* JSON Preview Modal */}
        <Modal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          title="JSON Preview"
        >
          <Modal.Section>
            <pre style={{ fontSize: "12px", overflow: "auto", maxHeight: "500px", background: "#f6f6f7", padding: "16px", borderRadius: "8px" }}>
              {JSON.stringify(content, null, 2)}
            </pre>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}

// ErrorBoundary for route-level error handling
export function ErrorBoundary() {
  const error = useRouteError();
  
  const getErrorInfo = () => {
    if (error && typeof error === "object" && "message" in error && "suggestion" in error) {
      return error as UserError;
    }
    
    return {
      message: "Something went wrong.",
      suggestion: "Try refreshing the page or re-opening the app."
    };
  };

  const { message, suggestion } = getErrorInfo();

  return (
    <Page title="Product Bridge">
      <Banner tone="critical" title={message}>
        {suggestion}
      </Banner>
    </Page>
  );
}
