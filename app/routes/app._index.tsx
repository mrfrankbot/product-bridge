import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page,
  LegacyCard,
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
      subtitle="Turn manufacturer specs into polished Shopify product content."
      primaryAction={{ content: "Import Specs", url: "/app/import", icon: ImportIcon }}
    >
      <BlockStack gap="500">
        <LegacyCard sectioned>
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">
              Product Bridge
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Extract structured specs, highlights, and included items from PDFs, URLs, or raw
              text — then save directly to product metafields.
            </Text>
          </BlockStack>
        </LegacyCard>

        <LegacyCard title="Quick actions" sectioned>
          <InlineStack gap="400" wrap>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Import Specs
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Start the extraction wizard.
                </Text>
                <Link to="/app/import" style={{ textDecoration: "none" }}>
                  <Button variant="primary" icon={ImportIcon}>
                    Import Specs
                  </Button>
                </Link>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  View Products
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  See enhanced products.
                </Text>
                <Link to="/app/products" style={{ textDecoration: "none" }}>
                  <Button variant="secondary" icon={ProductIcon}>
                    View Products
                  </Button>
                </Link>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Settings
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Manage app preferences.
                </Text>
                <Link to="/app/settings" style={{ textDecoration: "none" }}>
                  <Button variant="secondary" icon={SettingsIcon}>
                    Settings
                  </Button>
                </Link>
              </BlockStack>
            </Card>
          </InlineStack>
        </LegacyCard>

        <LegacyCard title="Recent activity" sectioned>
          {recentProducts.length > 0 ? (
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={recentProducts}
              renderItem={(product) => {
                const { id, title, handle, featuredImage, updatedAt, contentStatus } = product;

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
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="h3" variant="bodyMd" fontWeight="semibold">
                          {title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Updated {new Date(updatedAt).toLocaleDateString()}
                        </Text>
                      </BlockStack>
                      <InlineStack gap="200">
                        <Badge
                          tone={contentStatus.hasSpecs ? "success" : "subdued"}
                          icon={contentStatus.hasSpecs ? CheckIcon : undefined}
                        >
                          Specs
                        </Badge>
                        <Badge
                          tone={contentStatus.hasHighlights ? "success" : "subdued"}
                          icon={contentStatus.hasHighlights ? CheckIcon : undefined}
                        >
                          Highlights
                        </Badge>
                      </InlineStack>
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
              <p>Start by importing specs for your first product.</p>
            </EmptyState>
          )}
        </LegacyCard>

        <LegacyCard title="Stats" sectioned>
          <InlineStack gap="400">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                Total products enhanced
              </Text>
              <Text as="p" variant="headingLg">
                {totalEnhanced}
              </Text>
            </BlockStack>
          </InlineStack>
        </LegacyCard>
      </BlockStack>
    </Page>
  );
}
