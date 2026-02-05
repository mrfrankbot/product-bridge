import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useState, useMemo, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  ResourceList,
  ResourceItem,
  Thumbnail,
  EmptyState,
  Tabs,
  TextField,
  Icon,
  Box,
} from "@shopify/polaris";
import {
  ImportIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SearchIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

interface ProductWithContent {
  id: string;
  title: string;
  handle: string;
  updatedAtLabel: string;
  featuredImage?: { url: string; altText?: string } | null;
  isEnhanced: boolean;
  contentStatus: {
    hasSpecs: boolean;
    hasHighlights: boolean;
  };
}

// Query ALL products, check which have our metafields
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(ALL_PRODUCTS_QUERY);
  const data = await response.json();

  const products: ProductWithContent[] =
    data.data?.products?.edges?.map((edge: any) => {
      const product = edge.node;
      const metafields = product.metafields.edges.reduce(
        (acc: any, metafield: any) => {
          acc[metafield.node.key] = metafield.node.value;
          return acc;
        },
        {} as Record<string, string>
      );

      const hasSpecs = !!metafields.specs;
      const hasHighlights = !!metafields.highlights;
      const isEnhanced = hasSpecs || hasHighlights;

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        updatedAtLabel: formatDate(product.updatedAt),
        featuredImage: product.featuredImage,
        isEnhanced,
        contentStatus: {
          hasSpecs,
          hasHighlights,
        },
      };
    }) || [];

  return json({ products });
};

export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get("filter") || "all";
  const [selectedTab, setSelectedTab] = useState(
    initialTab === "enhanced" ? 1 : initialTab === "needs" ? 2 : 0
  );
  const [searchQuery, setSearchQuery] = useState("");

  const handleTabChange = useCallback(
    (selectedTabIndex: number) => {
      setSelectedTab(selectedTabIndex);
      const filterValue =
        selectedTabIndex === 1
          ? "enhanced"
          : selectedTabIndex === 2
            ? "needs"
            : "all";
      setSearchParams({ filter: filterValue });
    },
    [setSearchParams]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by tab
    if (selectedTab === 1) {
      filtered = filtered.filter((p) => p.isEnhanced);
    } else if (selectedTab === 2) {
      filtered = filtered.filter((p) => !p.isEnhanced);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(query)
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
      panelID: "all-products",
    },
    {
      id: "enhanced",
      content: `Enhanced (${enhancedCount})`,
      accessibilityLabel: "Enhanced products",
      panelID: "enhanced-products",
    },
    {
      id: "needs",
      content: `Needs Content (${needsContentCount})`,
      accessibilityLabel: "Products needing content",
      panelID: "needs-content-products",
    },
  ];

  return (
    <Page
      title="Products"
      subtitle="Browse your catalog and enhance product content"
      primaryAction={{
        content: "Import Specs",
        url: "/app/import",
        icon: ImportIcon,
      }}
    >
      <Layout>
        {/* Summary Stats */}
        <Layout.Section>
          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 1 }}>
              <Card padding="400">
                <InlineStack gap="300" align="center" blockAlign="center">
                  <Box
                    background="bg-fill-success"
                    padding="200"
                    borderRadius="full"
                  >
                    <Icon source={CheckCircleIcon} tone="base" />
                  </Box>
                  <BlockStack gap="050">
                    <Text as="p" variant="headingMd">
                      {enhancedCount}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Enhanced
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </div>
            <div style={{ flex: 1 }}>
              <Card padding="400">
                <InlineStack gap="300" align="center" blockAlign="center">
                  <Box
                    background="bg-fill-warning"
                    padding="200"
                    borderRadius="full"
                  >
                    <Icon source={AlertCircleIcon} tone="base" />
                  </Box>
                  <BlockStack gap="050">
                    <Text as="p" variant="headingMd">
                      {needsContentCount}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Needs Content
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </div>
          </InlineStack>
        </Layout.Section>

        {/* Filters and Search */}
        <Layout.Section>
          <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
              <Box padding="400">
                <TextField
                  label=""
                  labelHidden
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  prefix={<Icon source={SearchIcon} />}
                  clearButton
                  onClearButtonClick={() => setSearchQuery("")}
                  autoComplete="off"
                />
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>

        {/* Product List */}
        <Layout.Section>
          <Card padding="0">
            {filteredProducts.length > 0 ? (
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={filteredProducts}
                renderItem={(product) => {
                  const {
                    id,
                    title,
                    handle,
                    featuredImage,
                    updatedAtLabel,
                    isEnhanced,
                    contentStatus,
                  } = product;

                  return (
                    <ResourceItem
                      id={id}
                      url={`/app/import?product=${handle}`}
                      media={
                        <Thumbnail
                          source={featuredImage?.url || ""}
                          alt={featuredImage?.altText || title}
                          size="medium"
                        />
                      }
                      accessibilityLabel={`Enhance ${title}`}
                    >
                      <InlineStack
                        align="space-between"
                        blockAlign="center"
                        wrap={false}
                      >
                        <BlockStack gap="100">
                          <Text as="h3" variant="bodyMd" fontWeight="semibold">
                            {title}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Updated {updatedAtLabel}
                            {isEnhanced && (
                              <>
                                {" "}
                                •{" "}
                                {contentStatus.hasSpecs &&
                                contentStatus.hasHighlights
                                  ? "Specs + Highlights"
                                  : contentStatus.hasSpecs
                                    ? "Specs"
                                    : "Highlights"}
                              </>
                            )}
                          </Text>
                        </BlockStack>
                        <InlineStack gap="200" blockAlign="center">
                          <Badge
                            tone={isEnhanced ? "success" : "attention"}
                            icon={
                              isEnhanced
                                ? CheckCircleIcon
                                : AlertCircleIcon
                            }
                          >
                            {isEnhanced ? "Enhanced" : "Needs Content"}
                          </Badge>
                          <Link
                            to={`/app/import?product=${handle}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Button variant="primary" size="slim">
                              {isEnhanced ? "Update" : "Enhance"}
                            </Button>
                          </Link>
                        </InlineStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            ) : (
              <Box padding="600">
                <EmptyState
                  heading={
                    searchQuery
                      ? "No products match your search"
                      : selectedTab === 1
                        ? "No enhanced products yet"
                        : selectedTab === 2
                          ? "All products are enhanced!"
                          : "No products in your store"
                  }
                  action={
                    searchQuery
                      ? { content: "Clear search", onAction: () => setSearchQuery("") }
                      : selectedTab === 2
                        ? undefined
                        : { content: "Import Specs", url: "/app/import" }
                  }
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {searchQuery
                      ? "Try a different search term."
                      : selectedTab === 2
                        ? "Great job! All your products have been enhanced."
                        : "Start by importing specs for your products."}
                  </p>
                </EmptyState>
              </Box>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
