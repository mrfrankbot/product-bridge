import { useState, useCallback, useEffect } from "react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from "@remix-run/node";
import { useLoaderData, useFetcher, useRouteError } from "@remix-run/react";
import {
  Page,
  Card,
  TextField,
  Button,
  Banner,
  Layout,
  BlockStack,
  InlineStack,
  Text,
  Icon,
  Box,
  Divider,
  Spinner,
  Modal,
  Badge,
  DropZone,
  Tabs,
  DataTable,
} from "@shopify/polaris";
import { 
  DeleteIcon, 
  PlusIcon, 
  CheckIcon, 
  ImportIcon, 
  LinkIcon,
  MagicIcon
} from "@shopify/polaris-icons";

import { ProductSelector } from "../components/ProductSelector";

import { authenticate } from "../shopify.server";
import { extractProductContent, type ProductContent, type SpecGroup } from "../services/content-extractor.server";
import { parsePdf } from "../services/pdf-parser.server";
import { scrapeProductPage } from "../services/url-scraper.server";
import { validateUrlInput, validatePdfFile, validateTextInput, validateContentPayload } from "../utils/validation.server";
import { asUserError, type UserError } from "../utils/errors.server";
import { retryShopify } from "../utils/retry";

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
export default function ImportPage() {
  const { products } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();

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
    error?: string | UserError;
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

  // Update current step based on progress
  useEffect(() => {
    if (!selectedProduct) {
      setCurrentStep(1);
      return;
    }
    if (selectedProduct && !content) {
      setCurrentStep(2);
      return;
    }
    if (selectedProduct && content) {
      setCurrentStep(3);
    }
  }, [selectedProduct, content]);

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

  const errorMessage =
    typeof extractResult?.error === "string"
      ? extractResult.error
      : extractResult?.error?.message;
  const errorSuggestion =
    typeof extractResult?.error === "object" && extractResult?.error && "suggestion" in extractResult.error
      ? extractResult.error.suggestion
      : undefined;

  const tabs = [
    { id: "text", content: "Paste text", panelID: "text-panel" },
    { id: "pdf", content: "Upload PDF", panelID: "pdf-panel" },
    { id: "url", content: "Scrape URL", panelID: "url-panel" },
  ];
  const selectedTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === inputMethod)
  );

  return (
    <Page 
      title="Import content"
      subtitle="Bring manufacturer specs into Shopify with AI-assisted extraction."
      primaryAction={{
        content: "Save to Shopify",
        onAction: handleSave,
        loading: isSaving,
        disabled: !selectedProduct || !content,
      }}
      secondaryActions={[
        { content: "Preview JSON", onAction: () => setShowPreview(true), disabled: !content },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card padding="500">
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Workflow status
                </Text>
                <Badge tone="info">Step {currentStep} of 3</Badge>
              </InlineStack>
              <DataTable
                columnContentTypes={["text", "text"]}
                headings={["Field", "Status"]}
                rows={[
                  ["Selected product", selectedProduct ? selectedProduct.title : "Not selected"],
                  ["Import method", inputMethod.toUpperCase()],
                  ["Content extracted", content ? "Ready for review" : "Not started"],
                  [
                    "Source",
                    sourceInfo?.type === "pdf"
                      ? `${sourceInfo.filename} (${sourceInfo.pages} pages)`
                      : sourceInfo?.type === "url"
                        ? sourceInfo.title || sourceInfo.url || "URL"
                        : sourceInfo?.type === "text"
                          ? "Pasted text"
                          : "—",
                  ],
                ]}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {(extractResult?.success || errorMessage) && (
          <Layout.Section>
            <BlockStack gap="200">
              {extractResult?.success && (
                <Banner title="Metafields saved successfully" tone="success" />
              )}
              {errorMessage && (
                <Banner title="Action failed" tone="critical">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm">
                      {errorMessage}
                    </Text>
                    {errorSuggestion && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        {errorSuggestion}
                      </Text>
                    )}
                  </BlockStack>
                </Banner>
              )}
            </BlockStack>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="500">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  1. Select product
                </Text>
                {selectedProduct && (
                  <Badge tone="success" icon={CheckIcon}>
                    Selected
                  </Badge>
                )}
              </InlineStack>
              <ProductSelector
                products={products}
                selectedProduct={selectedProduct}
                onSelect={setSelectedProduct}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="500">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  2. Import manufacturer specs
                </Text>
                <Badge tone={selectedProduct ? "info" : "attention"}>
                  {selectedProduct ? "Ready" : "Select a product first"}
                </Badge>
              </InlineStack>
              <Tabs
                tabs={tabs}
                selected={selectedTabIndex}
                onSelect={(index) => setInputMethod(tabs[index].id as typeof inputMethod)}
              >
                <Box paddingBlockStart="300">
                  {inputMethod === "text" && (
                    <BlockStack gap="400">
                      <TextField
                        label="Paste raw specs"
                        multiline={8}
                        value={specsText}
                        onChange={setSpecsText}
                        placeholder="Paste the full specification sheet from the manufacturer website..."
                        autoComplete="off"
                        disabled={!selectedProduct}
                      />
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="extract" />
                        <input type="hidden" name="text" value={specsText} />
                        <Button
                          variant="primary"
                          submit
                          loading={isExtracting && fetcher.formData?.get("intent") === "extract"}
                          disabled={!specsText.trim() || !selectedProduct}
                          icon={MagicIcon}
                        >
                          Extract with AI
                        </Button>
                      </fetcher.Form>
                    </BlockStack>
                  )}

                  {inputMethod === "pdf" && (
                    <BlockStack gap="400">
                      <DropZone
                        onDrop={handleFileDrop}
                        accept=".pdf,application/pdf"
                        type="file"
                        allowMultiple={false}
                        disabled={!selectedProduct}
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
                        disabled={!uploadedFile || !selectedProduct}
                        icon={MagicIcon}
                      >
                        Extract from PDF
                      </Button>

                      <Banner tone="info">
                        Upload manufacturer spec sheets or product brochures. Works best with text-based PDFs.
                      </Banner>
                    </BlockStack>
                  )}

                  {inputMethod === "url" && (
                    <BlockStack gap="400">
                      <TextField
                        label="Manufacturer product page URL"
                        value={urlValue}
                        onChange={setUrlValue}
                        placeholder="https://www.usa.canon.com/shop/p/eos-r5-mark-ii"
                        autoComplete="off"
                        prefix={<Icon source={LinkIcon} />}
                        disabled={!selectedProduct}
                      />

                      <Button
                        variant="primary"
                        onClick={handleUrlExtract}
                        loading={isExtracting && fetcher.formData?.get("intent") === "extract-url"}
                        disabled={!urlValue.trim() || !selectedProduct}
                        icon={MagicIcon}
                      >
                        Scrape & extract with AI
                      </Button>

                      <Banner tone="info">
                        Supported manufacturers: Canon, Sony, Nikon, Fujifilm, Panasonic, Leica, and more.
                      </Banner>
                    </BlockStack>
                  )}
                </Box>
              </Tabs>

              {isExtracting && (
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <InlineStack gap="300" blockAlign="center">
                    <Spinner size="small" />
                    <Text as="p" variant="bodySm">
                      Processing manufacturer content with AI…
                    </Text>
                  </InlineStack>
                </Box>
              )}

              {sourceInfo && content && (
                <Banner tone="success" title="Content extracted">
                  <BlockStack gap="100">
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
                    {sourceInfo.type === "text" && (
                      <Text as="p" variant="bodySm">
                        Source: Pasted text input
                      </Text>
                    )}
                  </BlockStack>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="500">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  3. Review & edit
                </Text>
                <InlineStack gap="200">
                  <Button variant="tertiary" onClick={() => setShowPreview(true)} disabled={!content}>
                    Preview JSON
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={!selectedProduct || !content}
                    icon={CheckIcon}
                  >
                    Save to Shopify
                  </Button>
                </InlineStack>
              </InlineStack>

              {!content && (
                <Banner tone="warning" title="No content to review yet">
                  Extract content in step 2 to continue.
                </Banner>
              )}

              {content && (
                <>
                  <DataTable
                    columnContentTypes={["text", "numeric"]}
                    headings={["Section", "Items"]}
                    rows={[
                      ["Highlights", content.highlights.length],
                      ["Featured specs", content.featured.length],
                      ["Included items", content.included.length],
                      ["Spec groups", content.specs.length],
                    ]}
                  />

                  <Divider />

                  <Card padding="400">
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="h4" variant="headingSm">
                          Product highlights
                        </Text>
                        <Button variant="plain" onClick={addHighlight} icon={PlusIcon}>
                          Add highlight
                        </Button>
                      </InlineStack>

                      {content.highlights.length === 0 ? (
                        <Box padding="400" background="bg-fill-tertiary" borderRadius="200">
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            No highlights extracted. Add one to get started.
                          </Text>
                        </Box>
                      ) : (
                        content.highlights.map((highlight, index) => (
                          <InlineStack key={index} gap="200" align="start" blockAlign="center">
                            <div style={{ flex: 1 }}>
                              <TextField
                                label="Highlight"
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

                  <Card padding="400">
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="h4" variant="headingSm">
                          Featured specifications
                        </Text>
                        <Button variant="plain" onClick={addFeatured} icon={PlusIcon}>
                          Add spec
                        </Button>
                      </InlineStack>

                      {content.featured.length === 0 ? (
                        <Box padding="400" background="bg-fill-tertiary" borderRadius="200">
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            No featured specs extracted yet.
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

                  <Card padding="400">
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="h4" variant="headingSm">
                          What's included
                        </Text>
                        <Button variant="plain" onClick={addIncluded} icon={PlusIcon}>
                          Add item
                        </Button>
                      </InlineStack>

                      {content.included.length === 0 ? (
                        <Box padding="400" background="bg-fill-tertiary" borderRadius="200">
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            No included items found.
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

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">
                        Detailed specifications
                      </Text>

                      {content.specs.length === 0 ? (
                        <Box padding="400" background="bg-fill-tertiary" borderRadius="200">
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            No specifications extracted yet.
                          </Text>
                        </Box>
                      ) : (
                        <BlockStack gap="300">
                          {content.specs.map((group, groupIndex) => (
                            <Box key={groupIndex} padding="300" background="bg-surface-secondary" borderRadius="200">
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
                            </Box>
                          ))}
                        </BlockStack>
                      )}
                    </BlockStack>
                  </Card>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Modal open={showPreview} onClose={() => setShowPreview(false)} title="JSON Preview">
          <Modal.Section>
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <pre style={{ fontSize: "12px", overflow: "auto", maxHeight: "500px" }}>
                {JSON.stringify(content, null, 2)}
              </pre>
            </Box>
          </Modal.Section>
        </Modal>
      </Layout>
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
    <Page title="Import Content">
      <Banner tone="critical" title={message}>
        {suggestion}
      </Banner>
    </Page>
  );
}
