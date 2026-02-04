import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  LegacyCard,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Thumbnail,
  EmptyState,
  Box,
} from "@shopify/polaris";
import { ImportIcon, ProductIcon, SettingsIcon, CheckIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

interface EnhancedProduct {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
  featuredImage?: { url: string; altText?: string } | null;
  contentStatus: {
    hasSpecs: boolean;
    hasHighlights: boolean;
  };
}

const DASHBOARD_QUERY = `#graphql
  query ProductBridgeDashboard {
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
          metafields(first: 10, namespace: "product_bridge") {
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(DASHBOARD_QUERY);
  const data = await response.json();

  const recentProducts: EnhancedProduct[] =
    data.data?.products?.edges?.map((edge: any) => {
      const product = edge.node;
      const metafields = product.metafields.edges.reduce((acc: any, metafield: any) => {
        acc[metafield.node.key] = metafield.node.value;
        return acc;
      }, {} as Record<string, string>);

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        updatedAt: product.updatedAt,
        featuredImage: product.featuredImage,
        contentStatus: {
          hasSpecs: !!metafields.specs,
          hasHighlights: !!metafields.highlights,
        },
      };
    }) || [];

  return json({
    totalEnhanced: data.data?.productsCount?.count || 0,
    recentProducts,
  });
};

export default function Dashboard() {
  const { totalEnhanced, recentProducts } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Product Bridge"
      primaryAction={{
        content: "Import Specs",
        icon: ImportIcon,
        url: "/app/import",
      }}
      secondaryActions={[
        {
          content: "View Products",
          icon: ProductIcon,
          url: "/app/products",
        },
        {
          content: "Settings",
          icon: SettingsIcon,
          url: "/app/settings",
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">
                    Enhanced Products
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Products with imported specifications and highlights
                  </Text>
                </BlockStack>
                <Text variant="heading2xl" as="p">
                  {totalEnhanced}
                </Text>
              </InlineStack>
            </BlockStack>
          </LegacyCard>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <LegacyCard title="Quick Actions" sectioned>
            <BlockStack gap="300">
              <Link to="/app/import" style={{ textDecoration: "none" }}>
                <Box
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <InlineStack gap="300" blockAlign="center">
                    <div style={{ color: "var(--p-color-icon-emphasis)" }}>
                      <ImportIcon />
                    </div>
                    <BlockStack gap="050">
                      <Text variant="bodyMd" fontWeight="semibold">
                        Import Specs
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        Extract from PDFs or URLs
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>
              </Link>
              <Link to="/app/products" style={{ textDecoration: "none" }}>
                <Box
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <InlineStack gap="300" blockAlign="center">
                    <div style={{ color: "var(--p-color-icon-emphasis)" }}>
                      <ProductIcon />
                    </div>
                    <BlockStack gap="050">
                      <Text variant="bodyMd" fontWeight="semibold">
                        View Products
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        See enhanced products
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>
              </Link>
            </BlockStack>
          </LegacyCard>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <LegacyCard title="What is Product Bridge?" sectioned>
            <BlockStack gap="200">
              <Text variant="bodyMd" tone="subdued">
                Product Bridge extracts structured specs, highlights, and included
                items from PDFs, URLs, or raw text — then saves directly to product
                metafields.
              </Text>
              <InlineStack gap="200">
                <Badge tone="success">AI-Powered</Badge>
                <Badge>Shopify Native</Badge>
              </InlineStack>
            </BlockStack>
          </LegacyCard>
        </Layout.Section>

        <Layout.Section>
          <LegacyCard title="Recently Enhanced">
            {recentProducts.length === 0 ? (
              <LegacyCard.Section>
                <EmptyState
                  heading="No enhanced products yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  action={{
                    content: "Import your first specs",
                    url: "/app/import",
                  }}
                >
                  <p>
                    Start by importing specs from a manufacturer PDF or product
                    page.
                  </p>
                </EmptyState>
              </LegacyCard.Section>
            ) : (
              recentProducts.map((product) => (
                <LegacyCard.Section key={product.id}>
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Thumbnail
                        source={product.featuredImage?.url || ""}
                        alt={product.featuredImage?.altText || product.title}
                        size="small"
                      />
                      <BlockStack gap="050">
                        <Text variant="bodyMd" fontWeight="semibold">
                          {product.title}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          Updated {product.updatedAt.split("T")[0]}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Badge
                        tone={
                          product.contentStatus.hasSpecs ? "success" : "attention"
                        }
                        icon={product.contentStatus.hasSpecs ? CheckIcon : undefined}
                      >
                        Specs
                      </Badge>
                      <Badge
                        tone={
                          product.contentStatus.hasHighlights
                            ? "success"
                            : "attention"
                        }
                        icon={
                          product.contentStatus.hasHighlights ? CheckIcon : undefined
                        }
                      >
                        Highlights
                      </Badge>
                    </InlineStack>
                  </InlineStack>
                </LegacyCard.Section>
              ))
            )}
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
