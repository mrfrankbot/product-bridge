import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Icon,
  ResourceList,
  ResourceItem,
  Thumbnail,
  EmptyState,
  Box,
} from "@shopify/polaris";
import {
  ImportIcon,
  CheckCircleIcon,
  ClockIcon,
  ProductIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

interface EnhancedProduct {
  id: string;
  title: string;
  handle: string;
  updatedAtLabel: string;
  updatedAtRelative: string;
  featuredImage?: { url: string; altText?: string } | null;
  contentStatus: {
    hasSpecs: boolean;
    hasHighlights: boolean;
  };
}

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

function getRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(DASHBOARD_QUERY);
  const data = await response.json();

  const shopName = data.data?.shop?.name || "Your Store";
  const totalEnhanced = data.data?.productsCount?.count || 0;

  const recentProducts: EnhancedProduct[] =
    data.data?.products?.edges?.map((edge: any) => {
      const product = edge.node;
      const metafields = product.metafields.edges.reduce(
        (acc: any, metafield: any) => {
          acc[metafield.node.key] = metafield.node.value;
          return acc;
        },
        {} as Record<string, string>
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
          hasHighlights: !!metafields.highlights,
        },
      };
    }) || [];

  const specsCount = recentProducts.filter(
    (p) => p.contentStatus.hasSpecs
  ).length;
  const lastActivity =
    recentProducts.length > 0 ? recentProducts[0].updatedAtRelative : "Never";

  return json({
    shopName,
    totalEnhanced,
    specsCount,
    lastActivity,
    recentProducts,
  });
};

function StatCard({
  value,
  label,
  icon,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Card padding="400">
      <BlockStack gap="200" align="center">
        <Box
          background="bg-surface-secondary"
          padding="300"
          borderRadius="full"
        >
          {icon}
        </Box>
        <Text as="p" variant="headingXl" alignment="center">
          {value}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued" alignment="center">
          {label}
        </Text>
      </BlockStack>
    </Card>
  );
}

export default function Dashboard() {
  const { shopName, totalEnhanced, specsCount, lastActivity, recentProducts } =
    useLoaderData<typeof loader>();

  return (
    <Page title="Product Bridge">
      <Layout>
        {/* Welcome Banner */}
        <Layout.Section>
          <Card padding="600">
            <BlockStack gap="200">
              <Text as="h1" variant="headingLg">
                Welcome back, {shopName}! 👋
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Product Bridge is ready to enhance your catalog with structured
                specs and highlights.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Stats Row */}
        <Layout.Section>
          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 1 }}>
              <StatCard
                value={totalEnhanced}
                label="Products Enhanced"
                icon={<Icon source={ProductIcon} tone="base" />}
              />
            </div>
            <div style={{ flex: 1 }}>
              <StatCard
                value={specsCount}
                label="Specs Extracted"
                icon={<Icon source={CheckCircleIcon} tone="success" />}
              />
            </div>
            <div style={{ flex: 1 }}>
              <StatCard
                value={lastActivity}
                label="Last Activity"
                icon={<Icon source={ClockIcon} tone="base" />}
              />
            </div>
          </InlineStack>
        </Layout.Section>

        {/* Big CTA */}
        <Layout.Section>
          <Card padding="600" background="bg-surface-success">
            <BlockStack gap="400" align="center">
              <BlockStack gap="200">
                <Text as="h2" variant="headingLg" alignment="center">
                  🚀 Enhance a Product
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  Import specs from manufacturer PDFs, URLs, or text — AI
                  extracts the structure automatically.
                </Text>
              </BlockStack>
              <Link to="/app/import" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="large" icon={ImportIcon}>
                  Start Import
                </Button>
              </Link>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent Activity */}
        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Recent Activity
                </Text>
                <Link to="/app/products" style={{ textDecoration: "none" }}>
                  <Button variant="plain">View all products</Button>
                </Link>
              </InlineStack>

              {recentProducts.length > 0 ? (
                <ResourceList
                  resourceName={{ singular: "product", plural: "products" }}
                  items={recentProducts}
                  renderItem={(product) => {
                    const {
                      id,
                      title,
                      handle,
                      featuredImage,
                      updatedAtRelative,
                      contentStatus,
                    } = product;

                    const statusText =
                      contentStatus.hasSpecs && contentStatus.hasHighlights
                        ? "✅ Fully enhanced"
                        : contentStatus.hasSpecs
                          ? "✅ Specs added"
                          : contentStatus.hasHighlights
                            ? "✅ Highlights added"
                            : "📝 Partially enhanced";

                    return (
                      <ResourceItem
                        id={id}
                        url={`/app/import?product=${handle}`}
                        media={
                          <Thumbnail
                            source={featuredImage?.url || ""}
                            alt={featuredImage?.altText || title}
                            size="small"
                          />
                        }
                        accessibilityLabel={`View ${title}`}
                      >
                        <InlineStack
                          align="space-between"
                          blockAlign="center"
                          wrap={false}
                        >
                          <BlockStack gap="050">
                            <Text as="h3" variant="bodyMd" fontWeight="semibold">
                              {title}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {updatedAtRelative} • {statusText}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </ResourceItem>
                    );
                  }}
                />
              ) : (
                <EmptyState
                  heading="No products enhanced yet"
                  action={{ content: "Import Specs", url: "/app/import" }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Start by importing specs for your first product to see
                    activity here.
                  </p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
