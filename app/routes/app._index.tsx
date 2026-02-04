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
import { 
  SearchIcon, 
  EditIcon, 
  DeleteIcon, 
  PlusIcon, 
  CheckIcon, 
  ImportIcon, 
  LinkIcon,
  NoteIcon,
  FileIcon,
  GlobeIcon,
  MagicIcon
} from "@shopify/polaris-icons";

// Import our enhanced components
import { ProgressIndicator } from "../components/ProgressIndicator";
import { StepCard, type StepState } from "../components/StepCard";
import { MethodCard } from "../components/MethodCard";
import { ExtractionProgress } from "../components/ExtractionProgress";
import { ProductSelector } from "../components/ProductSelector";

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
  const [specsText, setSpecsText] = useState("");
  const [content, setContent] = useState<ProductContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [inputMethod, setInputMethod] = useState<'text' | 'pdf' | 'url'>('text');
  const [urlValue, setUrlValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

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

  // Step states
  const getStepState = (step: number): StepState => {
    if (step < currentStep) return 'complete';
    if (step === currentStep) return 'active';
    return 'inactive';
  };

  const steps = [
    { title: "Select Product", description: "Choose which product to enhance" },
    { title: "Import Specs", description: "Extract content with AI" },
    { title: "Review & Save", description: "Edit and save to metafields" }
  ];

  // Update content when extraction completes
  useEffect(() => {
    if (extractResult?.extracted) {
      setContent(extractResult.extracted);
      if (extractResult.source) {
        setSourceInfo(extractResult.source);
      }
      setCurrentStep(3); // Move to review step
    }
  }, [extractResult]);

  // Update current step based on progress
  useEffect(() => {
    if (selectedProduct && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [selectedProduct]);

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
    <Page 
      title="Product Bridge" 
      subtitle="AI-powered product content automation"
      primaryAction={
        <InlineStack gap="200">
          <Badge tone="info" icon={MagicIcon}>AI-Powered</Badge>
        </InlineStack>
      }
    >
      <BlockStack gap="500">
        {/* Progress Indicator */}
        <ProgressIndicator current={currentStep} steps={steps} />

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
        <StepCard
          step={1}
          title="Select Product"
          description="Choose which product to enhance with AI-extracted content"
          state={getStepState(1)}
        >
          <ProductSelector
            products={products}
            selectedProduct={selectedProduct}
            onSelect={setSelectedProduct}
          />
        </StepCard>

        {/* Step 2: Input Method Selection */}
        <StepCard
          step={2}
          title="Import Product Specs"
          description="Choose how to provide product information"
          state={getStepState(2)}
          disabled={!selectedProduct}
        >
          <BlockStack gap="400">
            {/* Method Selection */}
            <InlineStack gap="300">
              <MethodCard
                icon={NoteIcon}
                title="Paste Text"
                description="Copy specs from manufacturer websites"
                active={inputMethod === 'text'}
                onClick={() => setInputMethod('text')}
              />
              <MethodCard
                icon={FileIcon}
                title="Upload PDF"
                description="Extract from brochures and spec sheets"
                active={inputMethod === 'pdf'}
                onClick={() => setInputMethod('pdf')}
                supportedFormats={['.pdf', 'up to 20MB']}
              />
              <MethodCard
                icon={GlobeIcon}
                title="Scrape URL"
                description="Auto-extract from manufacturer pages"
                active={inputMethod === 'url'}
                onClick={() => setInputMethod('url')}
                supportedSites={['Canon', 'Sony', 'Nikon', '+8 more']}
              />
            </InlineStack>

            {/* Method-specific inputs */}
            <Box paddingBlockStart="300">
              {inputMethod === 'text' && (
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
                    <Button 
                      variant="primary" 
                      submit 
                      loading={isExtracting && fetcher.formData?.get("intent") === "extract"} 
                      disabled={!specsText.trim()}
                      icon={MagicIcon}
                    >
                      Extract Content with AI
                    </Button>
                  </fetcher.Form>
                </BlockStack>
              )}
              
              {inputMethod === 'pdf' && (
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
                  
                  <Button 
                    variant="primary" 
                    onClick={handlePdfExtract} 
                    loading={isExtracting && fetcher.formData?.get("intent") === "extract-pdf"}
                    disabled={!uploadedFile}
                    icon={MagicIcon}
                  >
                    Extract Content from PDF
                  </Button>
                  
                  <Banner tone="info">
                    <Text as="p" variant="bodySm">
                      Upload manufacturer spec sheets or product brochures. Works best with text-based PDFs.
                    </Text>
                  </Banner>
                </BlockStack>
              )}
              
              {inputMethod === 'url' && (
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
                    icon={MagicIcon}
                  >
                    Scrape & Extract Content
                  </Button>
                  
                  <Banner tone="info">
                    <Text as="p" variant="bodySm">
                      Supported manufacturers: Canon, Sony, Nikon, Fujifilm, Panasonic, Leica, and more.
                    </Text>
                  </Banner>
                </BlockStack>
              )}
            </Box>

            {/* AI Extraction Progress */}
            {isExtracting && (
              <ExtractionProgress
                isActive={isExtracting}
                stages={[
                  { name: 'Reading content', duration: 2000 },
                  { name: 'AI analysis', duration: 3000 },
                  { name: 'Structuring data', duration: 1000 }
                ]}
                insights={[
                  'Analyzing content structure...',
                  'Identifying key specifications...',
                  'Organizing product highlights...',
                  'Extracting included items...'
                ]}
              />
            )}

            {/* Source info after extraction */}
            {sourceInfo && content && (
              <Banner tone="success">
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    ✨ Content extracted successfully!
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
        </StepCard>

        {/* Step 3: Review & Edit Content */}
        <StepCard
          step={3}
          title="Review & Edit Content"
          description="Fine-tune the AI-extracted content before saving"
          state={getStepState(3)}
          disabled={!content}
        >
          {content && (
            <BlockStack gap="500">
              <InlineStack align="space-between">
                <Text as="h3" variant="headingMd">
                  Extracted Content
                </Text>
                <InlineStack gap="200">
                  <Button variant="tertiary" onClick={() => setShowPreview(true)}>
                    Preview JSON
                  </Button>
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
              </InlineStack>

              {/* Highlights */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h4" variant="headingSm">
                      Product Highlights ({content.highlights.length})
                    </Text>
                    <Button variant="plain" onClick={addHighlight} icon={PlusIcon}>
                      Add Highlight
                    </Button>
                  </InlineStack>
                  
                  {content.highlights.length === 0 ? (
                    <Box
                      padding="400"
                      background="bg-fill-tertiary"
                      borderRadius="base"
                    >
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        No highlights extracted. Click "Add Highlight" to create one manually.
                      </Text>
                    </Box>
                  ) : (
                    content.highlights.map((highlight, index) => (
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
                        <Button 
                          variant="plain" 
                          tone="critical" 
                          onClick={() => removeHighlight(index)} 
                          icon={DeleteIcon}
                          accessibilityLabel="Remove highlight"
                        />
                      </InlineStack>
                    ))
                  )}
                </BlockStack>
              </Card>

              {/* Featured Specs */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h4" variant="headingSm">
                      Featured Specifications ({content.featured.length})
                    </Text>
                    <Button variant="plain" onClick={addFeatured} icon={PlusIcon}>
                      Add Spec
                    </Button>
                  </InlineStack>
                  
                  {content.featured.length === 0 ? (
                    <Box
                      padding="400"
                      background="bg-fill-tertiary"
                      borderRadius="base"
                    >
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        No featured specs extracted. These are key specs shown prominently.
                      </Text>
                    </Box>
                  ) : (
                    content.featured.map((spec, index) => (
                      <InlineStack key={index} gap="200" align="start" blockAlign="end">
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Specification"
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
                        <Button 
                          variant="plain" 
                          tone="critical" 
                          onClick={() => removeFeatured(index)} 
                          icon={DeleteIcon}
                          accessibilityLabel="Remove featured spec"
                        />
                      </InlineStack>
                    ))
                  )}
                </BlockStack>
              </Card>

              {/* Included Items */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h4" variant="headingSm">
                      What's Included ({content.included.length})
                    </Text>
                    <Button variant="plain" onClick={addIncluded} icon={PlusIcon}>
                      Add Item
                    </Button>
                  </InlineStack>
                  
                  {content.included.length === 0 ? (
                    <Box
                      padding="400"
                      background="bg-fill-tertiary"
                      borderRadius="base"
                    >
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        No included items found. List accessories and components included with the product.
                      </Text>
                    </Box>
                  ) : (
                    content.included.map((item, index) => (
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
                        <Button 
                          variant="plain" 
                          tone="critical" 
                          onClick={() => removeIncluded(index)} 
                          icon={DeleteIcon}
                          accessibilityLabel="Remove included item"
                        />
                      </InlineStack>
                    ))
                  )}
                </BlockStack>
              </Card>

              {/* Specifications */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h4" variant="headingSm">
                    Detailed Specifications ({content.specs.length} groups)
                  </Text>
                  
                  {content.specs.length === 0 ? (
                    <Box
                      padding="400"
                      background="bg-fill-tertiary"
                      borderRadius="base"
                    >
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        No specifications extracted. The detailed tech specs will appear here.
                      </Text>
                    </Box>
                  ) : (
                    content.specs.map((group, groupIndex) => (
                      <Card key={groupIndex} background="bg-surface-secondary">
                        <BlockStack gap="300">
                          <Text as="h5" variant="bodyMd" fontWeight="semibold">
                            {group.heading}
                          </Text>
                          {group.lines.map((line, lineIndex) => (
                            <InlineStack key={lineIndex} gap="200" align="start" blockAlign="end">
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="Specification"
                                  labelHidden
                                  value={line.title}
                                  onChange={(v) => updateSpecLine(groupIndex, lineIndex, "title", v)}
                                  autoComplete="off"
                                  size="slim"
                                />
                              </div>
                              <div style={{ flex: 2 }}>
                                <TextField
                                  label="Value"
                                  labelHidden
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
                                accessibilityLabel="Remove specification"
                              />
                            </InlineStack>
                          ))}
                        </BlockStack>
                      </Card>
                    ))
                  )}
                </BlockStack>
              </Card>

              {!selectedProduct && (
                <Banner tone="warning">
                  Please select a product in Step 1 before saving.
                </Banner>
              )}
            </BlockStack>
          )}
        </StepCard>

        {/* JSON Preview Modal */}
        <Modal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          title="JSON Preview"
        >
          <Modal.Section>
            <pre style={{ 
              fontSize: "12px", 
              overflow: "auto", 
              maxHeight: "500px", 
              background: "#f6f6f7", 
              padding: "16px", 
              borderRadius: "8px",
              border: "1px solid #e1e3e5"
            }}>
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