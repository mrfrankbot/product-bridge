import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { PassThrough } from 'node:stream';
import { createReadableStreamFromReadable, json, unstable_createMemoryUploadHandler, unstable_parseMultipartFormData, redirect } from '@remix-run/node';
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useSearchParams, Link, useFetcher, useRouteError, useActionData, Form, useLocation } from '@remix-run/react';
import * as isbotModule from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Page, Layout, InlineStack, Card, Box, Icon, BlockStack, Text, Tabs, TextField, ResourceList, ResourceItem, Badge, Button, Thumbnail, EmptyState, DataTable, Banner, Autocomplete, DropZone, Spinner, Divider, Modal, AppProvider, FormLayout, Navigation, Frame } from '@shopify/polaris';
import { ImportIcon, CheckCircleIcon, AlertCircleIcon, SearchIcon, XCircleIcon, ProductIcon, ClockIcon, CheckIcon, MagicIcon, LinkIcon, PlusIcon, DeleteIcon, HomeIcon, SettingsIcon } from '@shopify/polaris-icons';
import '@shopify/shopify-app-remix/adapters/node';
import { shopifyApp, AppDistribution, LATEST_API_VERSION, boundary } from '@shopify/shopify-app-remix/server';
import { MemorySessionStorage } from '@shopify/shopify-app-session-storage-memory';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import * as cheerio from 'cheerio';
import { AppProvider as AppProvider$1 } from '@shopify/shopify-app-remix/react';

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

const sessionStorage = new MemorySessionStorage();
console.log("Using Memory session storage");
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES?.split(",") || ["read_products", "write_products", "read_metafields", "write_metafields"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage,
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

const ALL_PRODUCTS_QUERY = `#graphql
  query AllProducts {
    products(first: 100, sortKey: TITLE) {
      edges {
        node {
          id
          title
          handle
          updatedAt
          featuredImage {
            url
            altText
          }
          metafields(namespace: "product_bridge", first: 10) {
            edges {
              node {
                key
                value
              }
            }
          }
        }
      }
    }
  }
`;
function formatDate$1(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}
const loader$8 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(ALL_PRODUCTS_QUERY);
  const data = await response.json();
  const products = data.data?.products?.edges?.map((edge) => {
    const product = edge.node;
    const metafields = product.metafields.edges.reduce(
      (acc, metafield) => {
        acc[metafield.node.key] = metafield.node.value;
        return acc;
      },
      {}
    );
    const hasSpecs = !!metafields.specs;
    const hasHighlights = !!metafields.highlights;
    const isEnhanced = hasSpecs || hasHighlights;
    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      updatedAtLabel: formatDate$1(product.updatedAt),
      featuredImage: product.featuredImage,
      isEnhanced,
      contentStatus: {
        hasSpecs,
        hasHighlights
      }
    };
  }) || [];
  return json({ products });
};
function ProductsPage() {
  const { products } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("filter") || "all";
  const [selectedTab, setSelectedTab] = useState(
    initialTab === "enhanced" ? 1 : initialTab === "needs" ? 2 : 0
  );
  const [searchQuery, setSearchQuery] = useState("");
  const handleTabChange = useCallback(
    (selectedTabIndex) => {
      setSelectedTab(selectedTabIndex);
      const filterValue = selectedTabIndex === 1 ? "enhanced" : selectedTabIndex === 2 ? "needs" : "all";
      setSearchParams({ filter: filterValue });
    },
    [setSearchParams]
  );
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedTab === 1) {
      filtered = filtered.filter((p) => p.isEnhanced);
    } else if (selectedTab === 2) {
      filtered = filtered.filter((p) => !p.isEnhanced);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.title.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [products, selectedTab, searchQuery]);
  const enhancedCount = products.filter((p) => p.isEnhanced).length;
  const needsContentCount = products.filter((p) => !p.isEnhanced).length;
  const tabs = [
    {
      id: "all",
      content: `All Products (${products.length})`,
      accessibilityLabel: "All products",
      panelID: "all-products"
    },
    {
      id: "enhanced",
      content: `Enhanced (${enhancedCount})`,
      accessibilityLabel: "Enhanced products",
      panelID: "enhanced-products"
    },
    {
      id: "needs",
      content: `Needs Content (${needsContentCount})`,
      accessibilityLabel: "Products needing content",
      panelID: "needs-content-products"
    }
  ];
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Products",
      subtitle: "Browse your catalog and enhance product content",
      primaryAction: {
        content: "Import Specs",
        url: "/app/import",
        icon: ImportIcon
      },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(InlineStack, { gap: "400", wrap: false, children: [
          /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "300", align: "center", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(
              Box,
              {
                background: "bg-fill-success",
                padding: "200",
                borderRadius: "full",
                children: /* @__PURE__ */ jsx(Icon, { source: CheckCircleIcon, tone: "base" })
              }
            ),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingMd", children: enhancedCount }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Enhanced" })
            ] })
          ] }) }) }),
          /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "300", align: "center", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(
              Box,
              {
                background: "bg-fill-warning",
                padding: "200",
                borderRadius: "full",
                children: /* @__PURE__ */ jsx(Icon, { source: AlertCircleIcon, tone: "base" })
              }
            ),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingMd", children: needsContentCount }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Needs Content" })
            ] })
          ] }) }) })
        ] }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "0", children: /* @__PURE__ */ jsx(Tabs, { tabs, selected: selectedTab, onSelect: handleTabChange, children: /* @__PURE__ */ jsx(Box, { padding: "400", children: /* @__PURE__ */ jsx(
          TextField,
          {
            label: "",
            labelHidden: true,
            placeholder: "Search products...",
            value: searchQuery,
            onChange: handleSearchChange,
            prefix: /* @__PURE__ */ jsx(Icon, { source: SearchIcon }),
            clearButton: true,
            onClearButtonClick: () => setSearchQuery(""),
            autoComplete: "off"
          }
        ) }) }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "0", children: filteredProducts.length > 0 ? /* @__PURE__ */ jsx(
          ResourceList,
          {
            resourceName: { singular: "product", plural: "products" },
            items: filteredProducts,
            renderItem: (product) => {
              const {
                id,
                title,
                handle,
                featuredImage,
                updatedAtLabel,
                isEnhanced,
                contentStatus
              } = product;
              return /* @__PURE__ */ jsx(
                ResourceItem,
                {
                  id,
                  url: `/app/import?product=${handle}`,
                  media: /* @__PURE__ */ jsx(
                    Thumbnail,
                    {
                      source: featuredImage?.url || "",
                      alt: featuredImage?.altText || title,
                      size: "medium"
                    }
                  ),
                  accessibilityLabel: `Enhance ${title}`,
                  children: /* @__PURE__ */ jsxs(
                    InlineStack,
                    {
                      align: "space-between",
                      blockAlign: "center",
                      wrap: false,
                      children: [
                        /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                          /* @__PURE__ */ jsx(Text, { as: "h3", variant: "bodyMd", fontWeight: "semibold", children: title }),
                          /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                            "Updated ",
                            updatedAtLabel,
                            isEnhanced && /* @__PURE__ */ jsxs(Fragment, { children: [
                              " ",
                              "•",
                              " ",
                              contentStatus.hasSpecs && contentStatus.hasHighlights ? "Specs + Highlights" : contentStatus.hasSpecs ? "Specs" : "Highlights"
                            ] })
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                          /* @__PURE__ */ jsx(
                            Badge,
                            {
                              tone: isEnhanced ? "success" : "attention",
                              icon: isEnhanced ? CheckCircleIcon : AlertCircleIcon,
                              children: isEnhanced ? "Enhanced" : "Needs Content"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            Link,
                            {
                              to: `/app/import?product=${handle}`,
                              style: { textDecoration: "none" },
                              children: /* @__PURE__ */ jsx(Button, { variant: "primary", size: "slim", children: isEnhanced ? "Update" : "Enhance" })
                            }
                          )
                        ] })
                      ]
                    }
                  )
                }
              );
            }
          }
        ) : /* @__PURE__ */ jsx(Box, { padding: "600", children: /* @__PURE__ */ jsx(
          EmptyState,
          {
            heading: searchQuery ? "No products match your search" : selectedTab === 1 ? "No enhanced products yet" : selectedTab === 2 ? "All products are enhanced!" : "No products in your store",
            action: searchQuery ? { content: "Clear search", onAction: () => setSearchQuery("") } : selectedTab === 2 ? void 0 : { content: "Import Specs", url: "/app/import" },
            image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
            children: /* @__PURE__ */ jsx("p", { children: searchQuery ? "Try a different search term." : selectedTab === 2 ? "Great job! All your products have been enhanced." : "Start by importing specs for your products." })
          }
        ) }) }) })
      ] })
    }
  );
}

const route1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: ProductsPage,
  loader: loader$8
}, Symbol.toStringTag, { value: 'Module' }));

const loader$7 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const shopResponse = await admin.graphql(`#graphql
    query SettingsShopInfo {
      shop {
        name
        email
        myshopifyDomain
        primaryDomain {
          host
          url
        }
        currencyCode
        ianaTimezone
      }
    }
  `);
  const shopPayload = await shopResponse.json();
  const shop = shopPayload.data?.shop;
  return json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    shop: shop ? {
      name: shop.name,
      email: shop.email,
      myshopifyDomain: shop.myshopifyDomain,
      primaryDomain: shop.primaryDomain?.host ?? null,
      primaryUrl: shop.primaryDomain?.url ?? null,
      currencyCode: shop.currencyCode,
      ianaTimezone: shop.ianaTimezone
    } : null
  });
};
function SettingsPage() {
  const { openaiConfigured, shop } = useLoaderData();
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Settings",
      subtitle: "Manage connections and store context",
      primaryAction: { content: "Save", disabled: true },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Store connection" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Live data pulled from your Shopify Admin API." })
            ] }),
            /* @__PURE__ */ jsx(Badge, { tone: shop ? "success" : "critical", icon: shop ? CheckCircleIcon : XCircleIcon, children: shop ? "Connected" : "Unavailable" })
          ] }),
          shop ? /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "text"],
              headings: ["Store detail", "Value"],
              rows: [
                ["Store name", shop.name],
                ["Primary domain", shop.primaryDomain ?? "Not set"],
                ["myshopify domain", shop.myshopifyDomain],
                ["Contact email", shop.email || "Not set"],
                ["Currency", shop.currencyCode],
                ["Timezone", shop.ianaTimezone]
              ]
            }
          ) : /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Store data unavailable", children: "Check your Shopify connection and try reloading the app." })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "OpenAI connection" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Used for AI extraction in the import workflow." })
            ] }),
            /* @__PURE__ */ jsx(
              Badge,
              {
                tone: openaiConfigured ? "success" : "attention",
                icon: openaiConfigured ? CheckCircleIcon : XCircleIcon,
                children: openaiConfigured ? "Connected" : "Not configured"
              }
            )
          ] }),
          !openaiConfigured && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "OpenAI API key missing", children: "Add an API key to enable AI extraction for manufacturer content." })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "More settings coming soon" }),
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "This section will include defaults for extraction, automations, and notifications." })
        ] }) }) })
      ] })
    }
  );
}

const route2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: SettingsPage,
  loader: loader$7
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
      if (error instanceof Error && error.name === "AbortError") {
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

const route3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$3
}, Symbol.toStringTag, { value: 'Module' }));

const DASHBOARD_QUERY = `#graphql
  query ProductBridgeDashboard {
    shop {
      name
    }
    productsCount(query: "metafields.namespace:product_bridge") { count }
    products(
      first: 5
      sortKey: UPDATED_AT
      reverse: true
      query: "metafields.namespace:product_bridge"
    ) {
      edges {
        node {
          id
          title
          handle
          updatedAt
          featuredImage {
            url
            altText
          }
          metafields(namespace: "product_bridge", first: 10) {
            edges {
              node {
                key
                value
              }
            }
          }
        }
      }
    }
  }
`;
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}
function getRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const now = /* @__PURE__ */ new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 6e4);
  const diffHours = Math.floor(diffMs / 36e5);
  const diffDays = Math.floor(diffMs / 864e5);
  if (diffMins < 60) {
    return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return formatDate(value);
}
const loader$6 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(DASHBOARD_QUERY);
  const data = await response.json();
  const shopName = data.data?.shop?.name || "Your Store";
  const totalEnhanced = data.data?.productsCount?.count || 0;
  const recentProducts = data.data?.products?.edges?.map((edge) => {
    const product = edge.node;
    const metafields = product.metafields.edges.reduce(
      (acc, metafield) => {
        acc[metafield.node.key] = metafield.node.value;
        return acc;
      },
      {}
    );
    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      updatedAtLabel: formatDate(product.updatedAt),
      updatedAtRelative: getRelativeTime(product.updatedAt),
      featuredImage: product.featuredImage,
      contentStatus: {
        hasSpecs: !!metafields.specs,
        hasHighlights: !!metafields.highlights
      }
    };
  }) || [];
  const specsCount = recentProducts.filter(
    (p) => p.contentStatus.hasSpecs
  ).length;
  const lastActivity = recentProducts.length > 0 ? recentProducts[0].updatedAtRelative : "Never";
  return json({
    shopName,
    totalEnhanced,
    specsCount,
    lastActivity,
    recentProducts
  });
};
function StatCard({
  value,
  label,
  icon
}) {
  return /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", align: "center", children: [
    /* @__PURE__ */ jsx(
      Box,
      {
        background: "bg-surface-secondary",
        padding: "300",
        borderRadius: "full",
        children: icon
      }
    ),
    /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingXl", alignment: "center", children: value }),
    /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", alignment: "center", children: label })
  ] }) });
}
function Dashboard() {
  const { shopName, totalEnhanced, specsCount, lastActivity, recentProducts } = useLoaderData();
  return /* @__PURE__ */ jsx(Page, { title: "Product Bridge", children: /* @__PURE__ */ jsxs(Layout, { children: [
    /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "600", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
      /* @__PURE__ */ jsxs(Text, { as: "h1", variant: "headingLg", children: [
        "Welcome back, ",
        shopName,
        "! 👋"
      ] }),
      /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", tone: "subdued", children: "Product Bridge is ready to enhance your catalog with structured specs and highlights." })
    ] }) }) }),
    /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(InlineStack, { gap: "400", wrap: false, children: [
      /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
        StatCard,
        {
          value: totalEnhanced,
          label: "Products Enhanced",
          icon: /* @__PURE__ */ jsx(Icon, { source: ProductIcon, tone: "base" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
        StatCard,
        {
          value: specsCount,
          label: "Specs Extracted",
          icon: /* @__PURE__ */ jsx(Icon, { source: CheckCircleIcon, tone: "success" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
        StatCard,
        {
          value: lastActivity,
          label: "Last Activity",
          icon: /* @__PURE__ */ jsx(Icon, { source: ClockIcon, tone: "base" })
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "600", background: "bg-surface-success", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", align: "center", children: [
      /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingLg", alignment: "center", children: "🚀 Enhance a Product" }),
        /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", tone: "subdued", alignment: "center", children: "Import specs from manufacturer PDFs, URLs, or text — AI extracts the structure automatically." })
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/app/import", style: { textDecoration: "none" }, children: /* @__PURE__ */ jsx(Button, { variant: "primary", size: "large", icon: ImportIcon, children: "Start Import" }) })
    ] }) }) }),
    /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Recent Activity" }),
        /* @__PURE__ */ jsx(Link, { to: "/app/products", style: { textDecoration: "none" }, children: /* @__PURE__ */ jsx(Button, { variant: "plain", children: "View all products" }) })
      ] }),
      recentProducts.length > 0 ? /* @__PURE__ */ jsx(
        ResourceList,
        {
          resourceName: { singular: "product", plural: "products" },
          items: recentProducts,
          renderItem: (product) => {
            const {
              id,
              title,
              handle,
              featuredImage,
              updatedAtRelative,
              contentStatus
            } = product;
            const statusText = contentStatus.hasSpecs && contentStatus.hasHighlights ? "✅ Fully enhanced" : contentStatus.hasSpecs ? "✅ Specs added" : contentStatus.hasHighlights ? "✅ Highlights added" : "📝 Partially enhanced";
            return /* @__PURE__ */ jsx(
              ResourceItem,
              {
                id,
                url: `/app/import?product=${handle}`,
                media: /* @__PURE__ */ jsx(
                  Thumbnail,
                  {
                    source: featuredImage?.url || "",
                    alt: featuredImage?.altText || title,
                    size: "small"
                  }
                ),
                accessibilityLabel: `View ${title}`,
                children: /* @__PURE__ */ jsx(
                  InlineStack,
                  {
                    align: "space-between",
                    blockAlign: "center",
                    wrap: false,
                    children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                      /* @__PURE__ */ jsx(Text, { as: "h3", variant: "bodyMd", fontWeight: "semibold", children: title }),
                      /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                        updatedAtRelative,
                        " • ",
                        statusText
                      ] })
                    ] })
                  }
                )
              }
            );
          }
        }
      ) : /* @__PURE__ */ jsx(
        EmptyState,
        {
          heading: "No products enhanced yet",
          action: { content: "Import Specs", url: "/app/import" },
          image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
          children: /* @__PURE__ */ jsx("p", { children: "Start by importing specs for your first product to see activity here." })
        }
      )
    ] }) }) })
  ] }) });
}

const route4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: Dashboard,
  loader: loader$6
}, Symbol.toStringTag, { value: 'Module' }));

function ProductSelector({
  products,
  selectedProduct,
  onSelect,
  placeholder = "Search by product name, SKU, or handle...",
  loading = false
}) {
  const [searchValue, setSearchValue] = useState(selectedProduct?.title || "");
  const productOptions = products.map((product) => ({
    value: product.id,
    label: product.title,
    media: product.featuredImage?.url ? /* @__PURE__ */ jsx(
      Thumbnail,
      {
        source: product.featuredImage.url,
        alt: product.featuredImage.altText || product.title,
        size: "small"
      }
    ) : void 0
  }));
  const handleProductSelect = useCallback(
    (selected) => {
      const product = products.find((p) => p.id === selected[0]);
      if (product) {
        onSelect(product);
        setSearchValue(product.title);
      }
    },
    [products, onSelect]
  );
  const handleInputChange = useCallback((value) => {
    setSearchValue(value);
  }, []);
  const EmptyStateMarkup = () => /* @__PURE__ */ jsx(
    EmptyState,
    {
      heading: "No products found",
      image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
      children: /* @__PURE__ */ jsx("p", { children: "Try adjusting your search or add products in Shopify Admin." })
    }
  );
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
    /* @__PURE__ */ jsx(
      Autocomplete,
      {
        options: productOptions,
        selected: selectedProduct ? [selectedProduct.id] : [],
        onSelect: handleProductSelect,
        loading,
        emptyState: /* @__PURE__ */ jsx(EmptyStateMarkup, {}),
        listTitle: "Products",
        textField: /* @__PURE__ */ jsx(
          Autocomplete.TextField,
          {
            onChange: handleInputChange,
            label: "Select a product",
            value: searchValue,
            prefix: /* @__PURE__ */ jsx(Icon, { source: SearchIcon }),
            placeholder,
            autoComplete: "off"
          }
        )
      }
    ),
    selectedProduct && /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "400", align: "space-between", blockAlign: "center", children: [
      /* @__PURE__ */ jsxs(InlineStack, { gap: "300", align: "start", blockAlign: "center", children: [
        selectedProduct.featuredImage?.url && /* @__PURE__ */ jsx(
          Thumbnail,
          {
            source: selectedProduct.featuredImage.url,
            alt: selectedProduct.title,
            size: "medium"
          }
        ),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsx(Text, { as: "h4", variant: "bodyMd", fontWeight: "semibold", children: selectedProduct.title }),
          /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
            "Handle: /",
            selectedProduct.handle
          ] }),
          /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
            "ID: ",
            selectedProduct.id.replace("gid://shopify/Product/", "")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "end", blockAlign: "center", children: [
        /* @__PURE__ */ jsx(Badge, { tone: "success", icon: CheckIcon, children: "Selected" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "plain",
            size: "micro",
            onClick: () => {
              onSelect(null);
              setSearchValue("");
            },
            children: "Change"
          }
        )
      ] })
    ] }) }),
    !selectedProduct && products.length === 0 && /* @__PURE__ */ jsx(Banner, { tone: "info", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
      /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
        /* @__PURE__ */ jsx("strong", { children: "No products found." }),
        " Make sure you have products in your Shopify store."
      ] }),
      /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "You can import products from your admin dashboard or create them manually." })
    ] }) }),
    searchValue && !loading && products.length > 0 && productOptions.length === 0 && /* @__PURE__ */ jsx(Banner, { tone: "warning", children: /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
      /* @__PURE__ */ jsxs("strong", { children: [
        'No matches for "',
        searchValue,
        '".'
      ] }),
      " Try searching by product name, SKU, or handle."
    ] }) })
  ] });
}

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
const loader$5 = async ({ request }) => {
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
function ImportPage() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [specsText, setSpecsText] = useState("");
  const [content, setContent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [inputMethod, setInputMethod] = useState("text");
  const [urlValue, setUrlValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [sourceInfo, setSourceInfo] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
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
  const errorMessage = typeof extractResult?.error === "string" ? extractResult.error : extractResult?.error?.message;
  const errorSuggestion = typeof extractResult?.error === "object" && extractResult?.error && "suggestion" in extractResult.error ? extractResult.error.suggestion : void 0;
  const tabs = [
    { id: "text", content: "Paste text", panelID: "text-panel" },
    { id: "pdf", content: "Upload PDF", panelID: "pdf-panel" },
    { id: "url", content: "Scrape URL", panelID: "url-panel" }
  ];
  const selectedTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === inputMethod)
  );
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Import content",
      subtitle: "Bring manufacturer specs into Shopify with AI-assisted extraction.",
      primaryAction: {
        content: "Save to Shopify",
        onAction: handleSave,
        loading: isSaving,
        disabled: !selectedProduct || !content
      },
      secondaryActions: [
        { content: "Preview JSON", onAction: () => setShowPreview(true), disabled: !content }
      ],
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "500", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Workflow status" }),
            /* @__PURE__ */ jsx(Badge, { tone: "info", children: `Step ${currentStep} of 3` })
          ] }),
          /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "text"],
              headings: ["Field", "Status"],
              rows: [
                ["Selected product", selectedProduct ? selectedProduct.title : "Not selected"],
                ["Import method", inputMethod.toUpperCase()],
                ["Content extracted", content ? "Ready for review" : "Not started"],
                [
                  "Source",
                  sourceInfo?.type === "pdf" ? `${sourceInfo.filename} (${sourceInfo.pages} pages)` : sourceInfo?.type === "url" ? sourceInfo.title || sourceInfo.url || "URL" : sourceInfo?.type === "text" ? "Pasted text" : "—"
                ]
              ]
            }
          )
        ] }) }) }),
        (extractResult?.success || errorMessage) && /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          extractResult?.success && /* @__PURE__ */ jsx(Banner, { title: "Metafields saved successfully", tone: "success" }),
          errorMessage && /* @__PURE__ */ jsx(Banner, { title: "Action failed", tone: "critical", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: errorMessage }),
            errorSuggestion && /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: errorSuggestion })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "500", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "1. Select product" }),
            selectedProduct && /* @__PURE__ */ jsx(Badge, { tone: "success", icon: CheckIcon, children: "Selected" })
          ] }),
          /* @__PURE__ */ jsx(
            ProductSelector,
            {
              products,
              selectedProduct,
              onSelect: setSelectedProduct
            }
          )
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "500", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "2. Import manufacturer specs" }),
            /* @__PURE__ */ jsx(Badge, { tone: selectedProduct ? "info" : "attention", children: selectedProduct ? "Ready" : "Select a product first" })
          ] }),
          /* @__PURE__ */ jsx(
            Tabs,
            {
              tabs,
              selected: selectedTabIndex,
              onSelect: (index) => setInputMethod(tabs[index].id),
              children: /* @__PURE__ */ jsxs(Box, { paddingBlockStart: "300", children: [
                inputMethod === "text" && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Paste raw specs",
                      multiline: 8,
                      value: specsText,
                      onChange: setSpecsText,
                      placeholder: "Paste the full specification sheet from the manufacturer website...",
                      autoComplete: "off",
                      disabled: !selectedProduct
                    }
                  ),
                  /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "extract" }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "text", value: specsText }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "primary",
                        submit: true,
                        loading: isExtracting && fetcher.formData?.get("intent") === "extract",
                        disabled: !specsText.trim() || !selectedProduct,
                        icon: MagicIcon,
                        children: "Extract with AI"
                      }
                    )
                  ] })
                ] }),
                inputMethod === "pdf" && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
                  /* @__PURE__ */ jsx(
                    DropZone,
                    {
                      onDrop: handleFileDrop,
                      accept: ".pdf,application/pdf",
                      type: "file",
                      allowMultiple: false,
                      disabled: !selectedProduct,
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
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      variant: "primary",
                      onClick: handlePdfExtract,
                      loading: isExtracting && fetcher.formData?.get("intent") === "extract-pdf",
                      disabled: !uploadedFile || !selectedProduct,
                      icon: MagicIcon,
                      children: "Extract from PDF"
                    }
                  ),
                  /* @__PURE__ */ jsx(Banner, { tone: "info", children: "Upload manufacturer spec sheets or product brochures. Works best with text-based PDFs." })
                ] }),
                inputMethod === "url" && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Manufacturer product page URL",
                      value: urlValue,
                      onChange: setUrlValue,
                      placeholder: "https://www.usa.canon.com/shop/p/eos-r5-mark-ii",
                      autoComplete: "off",
                      prefix: /* @__PURE__ */ jsx(Icon, { source: LinkIcon }),
                      disabled: !selectedProduct
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      variant: "primary",
                      onClick: handleUrlExtract,
                      loading: isExtracting && fetcher.formData?.get("intent") === "extract-url",
                      disabled: !urlValue.trim() || !selectedProduct,
                      icon: MagicIcon,
                      children: "Scrape & extract with AI"
                    }
                  ),
                  /* @__PURE__ */ jsx(Banner, { tone: "info", children: "Supported manufacturers: Canon, Sony, Nikon, Fujifilm, Panasonic, Leica, and more." })
                ] })
              ] })
            }
          ),
          isExtracting && /* @__PURE__ */ jsx(Box, { padding: "400", background: "bg-surface-secondary", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "300", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Spinner, { size: "small" }),
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Processing manufacturer content with AI…" })
          ] }) }),
          sourceInfo && content && /* @__PURE__ */ jsx(Banner, { tone: "success", title: "Content extracted", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
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
            ] }),
            sourceInfo.type === "text" && /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Source: Pasted text input" })
          ] }) })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { padding: "500", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "3. Review & edit" }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setShowPreview(true), disabled: !content, children: "Preview JSON" }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "primary",
                  onClick: handleSave,
                  loading: isSaving,
                  disabled: !selectedProduct || !content,
                  icon: CheckIcon,
                  children: "Save to Shopify"
                }
              )
            ] })
          ] }),
          !content && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "No content to review yet", children: "Extract content in step 2 to continue." }),
          content && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: ["text", "numeric"],
                headings: ["Section", "Items"],
                rows: [
                  ["Highlights", content.highlights.length],
                  ["Featured specs", content.featured.length],
                  ["Included items", content.included.length],
                  ["Spec groups", content.specs.length]
                ]
              }
            ),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { as: "h4", variant: "headingSm", children: "Product highlights" }),
                /* @__PURE__ */ jsx(Button, { variant: "plain", onClick: addHighlight, icon: PlusIcon, children: "Add highlight" })
              ] }),
              content.highlights.length === 0 ? /* @__PURE__ */ jsx(Box, { padding: "400", background: "bg-fill-tertiary", borderRadius: "200", children: /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", alignment: "center", children: "No highlights extracted. Add one to get started." }) }) : content.highlights.map((highlight, index) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", blockAlign: "center", children: [
                /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Highlight",
                    labelHidden: true,
                    value: highlight,
                    onChange: (v) => updateHighlight(index, v),
                    autoComplete: "off"
                  }
                ) }),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "plain",
                    tone: "critical",
                    onClick: () => removeHighlight(index),
                    icon: DeleteIcon,
                    accessibilityLabel: "Remove highlight"
                  }
                )
              ] }, index))
            ] }) }),
            /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { as: "h4", variant: "headingSm", children: "Featured specifications" }),
                /* @__PURE__ */ jsx(Button, { variant: "plain", onClick: addFeatured, icon: PlusIcon, children: "Add spec" })
              ] }),
              content.featured.length === 0 ? /* @__PURE__ */ jsx(Box, { padding: "400", background: "bg-fill-tertiary", borderRadius: "200", children: /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", alignment: "center", children: "No featured specs extracted yet." }) }) : content.featured.map((spec, index) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", blockAlign: "end", children: [
                /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Specification",
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
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "plain",
                    tone: "critical",
                    onClick: () => removeFeatured(index),
                    icon: DeleteIcon,
                    accessibilityLabel: "Remove featured spec"
                  }
                )
              ] }, index))
            ] }) }),
            /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { as: "h4", variant: "headingSm", children: "What's included" }),
                /* @__PURE__ */ jsx(Button, { variant: "plain", onClick: addIncluded, icon: PlusIcon, children: "Add item" })
              ] }),
              content.included.length === 0 ? /* @__PURE__ */ jsx(Box, { padding: "400", background: "bg-fill-tertiary", borderRadius: "200", children: /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", alignment: "center", children: "No included items found." }) }) : content.included.map((item, index) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", blockAlign: "end", children: [
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
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "plain",
                    tone: "critical",
                    onClick: () => removeIncluded(index),
                    icon: DeleteIcon,
                    accessibilityLabel: "Remove included item"
                  }
                )
              ] }, index))
            ] }) }),
            /* @__PURE__ */ jsx(Card, { padding: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Text, { as: "h4", variant: "headingSm", children: "Detailed specifications" }),
              content.specs.length === 0 ? /* @__PURE__ */ jsx(Box, { padding: "400", background: "bg-fill-tertiary", borderRadius: "200", children: /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", alignment: "center", children: "No specifications extracted yet." }) }) : /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: content.specs.map((group, groupIndex) => /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-secondary", borderRadius: "200", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                /* @__PURE__ */ jsx(Text, { as: "h5", variant: "bodyMd", fontWeight: "semibold", children: group.heading }),
                group.lines.map((line, lineIndex) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", blockAlign: "end", children: [
                  /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Specification",
                      labelHidden: true,
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
                      labelHidden: true,
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
                      icon: DeleteIcon,
                      accessibilityLabel: "Remove specification"
                    }
                  )
                ] }, lineIndex))
              ] }) }, groupIndex)) })
            ] }) })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Modal, { open: showPreview, onClose: () => setShowPreview(false), title: "JSON Preview", children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-secondary", borderRadius: "200", children: /* @__PURE__ */ jsx("pre", { style: { fontSize: "12px", overflow: "auto", maxHeight: "500px" }, children: JSON.stringify(content, null, 2) }) }) }) })
      ] })
    }
  );
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
  return /* @__PURE__ */ jsx(Page, { title: "Import Content", children: /* @__PURE__ */ jsx(Banner, { tone: "critical", title: message, children: suggestion }) });
}

const route5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary$1,
  action: action$2,
  default: ImportPage,
  loader: loader$5
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

const loader$4 = async ({ request }) => {
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

const route6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: Auth,
  loader: loader$4
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

const route7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action
}, Symbol.toStringTag, { value: 'Module' }));

const loader$3 = async () => {
  return json({ status: "ok" }, { status: 200 });
};
function HealthCheck() {
  return /* @__PURE__ */ jsx("div", { children: "OK" });
}

const route8 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: HealthCheck,
  loader: loader$3
}, Symbol.toStringTag, { value: 'Module' }));

const loader$2 = async ({ request }) => {
  return redirect("/app");
};
function Index() {
  return null;
}

const route9 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: Index,
  loader: loader$2
}, Symbol.toStringTag, { value: 'Module' }));

const loader$1 = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const route10 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$1
}, Symbol.toStringTag, { value: 'Module' }));

const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};
function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();
  const navigationMarkup = /* @__PURE__ */ jsx(Navigation, { location: location.pathname, children: /* @__PURE__ */ jsx(
    Navigation.Section,
    {
      items: [
        {
          label: "Home",
          icon: HomeIcon,
          url: "/app",
          exactMatch: true,
          selected: location.pathname === "/app"
        },
        {
          label: "Products",
          icon: ProductIcon,
          url: "/app/products",
          selected: location.pathname === "/app/products"
        },
        {
          label: "Import",
          icon: ImportIcon,
          url: "/app/import",
          selected: location.pathname === "/app/import"
        },
        {
          label: "Settings",
          icon: SettingsIcon,
          url: "/app/settings",
          selected: location.pathname === "/app/settings"
        }
      ]
    }
  ) });
  return /* @__PURE__ */ jsx(AppProvider$1, { isEmbeddedApp: true, apiKey, children: /* @__PURE__ */ jsx(Frame, { navigation: navigationMarkup, children: /* @__PURE__ */ jsx(Outlet, {}) }) });
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

const route11 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  loader
}, Symbol.toStringTag, { value: 'Module' }));

const serverManifest = {'entry':{'module':'/assets/entry.client-DtqnQvIh.js','imports':['/assets/jsx-runtime-BMrMXMSG.js','/assets/components-Dvb9KVwW.js'],'css':[]},'routes':{'root':{'id':'root','parentId':undefined,'path':'','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/root-B34ynAJs.js','imports':['/assets/jsx-runtime-BMrMXMSG.js','/assets/components-Dvb9KVwW.js'],'css':['/assets/root-IeE7GZlA.css']},'routes/app.products':{'id':'routes/app.products','parentId':'routes/app','path':'products','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/app.products-CAdBPT4w.js','imports':['/assets/jsx-runtime-BMrMXMSG.js','/assets/components-Dvb9KVwW.js','/assets/Page-BWnvOCwQ.js','/assets/ImportIcon.svg-BR89o-5L.js','/assets/Layout-B4k7uZ8d.js','/assets/hooks-CH4Wem6t.js','/assets/CheckCircleIcon.svg-D0eDWnhW.js','/assets/SearchIcon.svg-Bb2KU-mR.js','/assets/ResourceList-DJEmasaK.js','/assets/Thumbnail-FiD_o7yD.js','/assets/Modal-DXYaAOSt.js','/assets/context-C14cgRHY.js','/assets/XIcon.svg-DBW9YDlq.js','/assets/FormLayout-ClDX028a.js','/assets/InfoIcon.svg-j3ifrBq9.js','/assets/index-t3e3ic-v.js','/assets/LegacyStack-DRkhC-V7.js'],'css':[]},'routes/app.settings':{'id':'routes/app.settings','parentId':'routes/app','path':'settings','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/app.settings-Bu-OCY-P.js','imports':['/assets/jsx-runtime-BMrMXMSG.js','/assets/components-Dvb9KVwW.js','/assets/Page-BWnvOCwQ.js','/assets/Layout-B4k7uZ8d.js','/assets/hooks-CH4Wem6t.js','/assets/CheckCircleIcon.svg-D0eDWnhW.js','/assets/DataTable-Bfelh7yK.js','/assets/InfoIcon.svg-j3ifrBq9.js','/assets/AlertTriangleIcon.svg-CopEH-T6.js','/assets/XIcon.svg-DBW9YDlq.js','/assets/index-t3e3ic-v.js'],'css':[]},'routes/api.extract':{'id':'routes/api.extract','parentId':'root','path':'api/extract','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.extract-l0sNRNKZ.js','imports':[],'css':[]},'routes/app._index':{'id':'routes/app._index','parentId':'routes/app','path':undefined,'index':true,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/app._index-h37FCoOS.js','imports':['/assets/jsx-runtime-BMrMXMSG.js','/assets/components-Dvb9KVwW.js','/assets/Page-BWnvOCwQ.js','/assets/Layout-B4k7uZ8d.js','/assets/hooks-CH4Wem6t.js','/assets/ProductIcon.svg-QhpQ17Lf.js','/assets/CheckCircleIcon.svg-D0eDWnhW.js','/assets/ImportIcon.svg-BR89o-5L.js','/assets/ResourceList-DJEmasaK.js','/assets/Thumbnail-FiD_o7yD.js','/assets/index-t3e3ic-v.js','/assets/LegacyStack-DRkhC-V7.js'],'css':[]},'routes/app.import':{'id':'routes/app.import','parentId':'routes/app','path':'import','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':true,'module':'/assets/app.import-CZymsMjT.js','imports':['/assets/jsx-runtime-BMrMXMSG.js','/assets/Thumbnail-FiD_o7yD.js','/assets/Page-BWnvOCwQ.js','/assets/hooks-CH4Wem6t.js','/assets/DataTable-Bfelh7yK.js','/assets/SearchIcon.svg-Bb2KU-mR.js','/assets/components-Dvb9KVwW.js','/assets/Layout-B4k7uZ8d.js','/assets/ImportIcon.svg-BR89o-5L.js','/assets/Modal-DXYaAOSt.js','/assets/InfoIcon.svg-j3ifrBq9.js','/assets/AlertTriangleIcon.svg-CopEH-T6.js','/assets/XIcon.svg-DBW9YDlq.js','/assets/index-t3e3ic-v.js','/assets/FormLayout-ClDX028a.js','/assets/context-C14cgRHY.js'],'css':[]},'routes/auth.login':{'id':'routes/auth.login','parentId':'root','path':'auth/login','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/route-DPgWj-uy.js','imports':['/assets/jsx-runtime-BMrMXMSG.js','/assets/en-ankQ0CZY.js','/assets/components-Dvb9KVwW.js','/assets/Page-BWnvOCwQ.js','/assets/FormLayout-ClDX028a.js','/assets/hooks-CH4Wem6t.js','/assets/context-C14cgRHY.js'],'css':[]},'routes/webhooks':{'id':'routes/webhooks','parentId':'root','path':'webhooks','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/webhooks-l0sNRNKZ.js','imports':[],'css':[]},'routes/healthz':{'id':'routes/healthz','parentId':'root','path':'healthz','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/healthz-DuSwP-9t.js','imports':['/assets/jsx-runtime-BMrMXMSG.js'],'css':[]},'routes/_index':{'id':'routes/_index','parentId':'root','path':undefined,'index':true,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/_index-C6d-v1ok.js','imports':[],'css':[]},'routes/auth.$':{'id':'routes/auth.$','parentId':'root','path':'auth/*','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/auth._-l0sNRNKZ.js','imports':[],'css':[]},'routes/app':{'id':'routes/app','parentId':'root','path':'app','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':true,'module':'/assets/app-BVrtYbWt.js','imports':['/assets/jsx-runtime-BMrMXMSG.js','/assets/en-ankQ0CZY.js','/assets/components-Dvb9KVwW.js','/assets/hooks-CH4Wem6t.js','/assets/index-t3e3ic-v.js','/assets/LegacyStack-DRkhC-V7.js','/assets/Modal-DXYaAOSt.js','/assets/ImportIcon.svg-BR89o-5L.js','/assets/ProductIcon.svg-QhpQ17Lf.js','/assets/AlertTriangleIcon.svg-CopEH-T6.js','/assets/XIcon.svg-DBW9YDlq.js','/assets/context-C14cgRHY.js'],'css':[]}},'url':'/assets/manifest-3b76de71.js','version':'3b76de71'};

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
  "routes/app.products": {
          id: "routes/app.products",
          parentId: "routes/app",
          path: "products",
          index: undefined,
          caseSensitive: undefined,
          module: route1
        },
  "routes/app.settings": {
          id: "routes/app.settings",
          parentId: "routes/app",
          path: "settings",
          index: undefined,
          caseSensitive: undefined,
          module: route2
        },
  "routes/api.extract": {
          id: "routes/api.extract",
          parentId: "root",
          path: "api/extract",
          index: undefined,
          caseSensitive: undefined,
          module: route3
        },
  "routes/app._index": {
          id: "routes/app._index",
          parentId: "routes/app",
          path: undefined,
          index: true,
          caseSensitive: undefined,
          module: route4
        },
  "routes/app.import": {
          id: "routes/app.import",
          parentId: "routes/app",
          path: "import",
          index: undefined,
          caseSensitive: undefined,
          module: route5
        },
  "routes/auth.login": {
          id: "routes/auth.login",
          parentId: "root",
          path: "auth/login",
          index: undefined,
          caseSensitive: undefined,
          module: route6
        },
  "routes/webhooks": {
          id: "routes/webhooks",
          parentId: "root",
          path: "webhooks",
          index: undefined,
          caseSensitive: undefined,
          module: route7
        },
  "routes/healthz": {
          id: "routes/healthz",
          parentId: "root",
          path: "healthz",
          index: undefined,
          caseSensitive: undefined,
          module: route8
        },
  "routes/_index": {
          id: "routes/_index",
          parentId: "root",
          path: undefined,
          index: true,
          caseSensitive: undefined,
          module: route9
        },
  "routes/auth.$": {
          id: "routes/auth.$",
          parentId: "root",
          path: "auth/*",
          index: undefined,
          caseSensitive: undefined,
          module: route10
        },
  "routes/app": {
          id: "routes/app",
          parentId: "root",
          path: "app",
          index: undefined,
          caseSensitive: undefined,
          module: route11
        }
      };

export { serverManifest as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, mode, publicPath, routes };
