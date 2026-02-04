import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page,
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
import { ImportIcon, CheckIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

interface ProductWithContent {
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

const PRODUCTS_QUERY = `#graphql
  query ProductsWithProductBridge {
    products(first: 50, query: "metafields.namespace:product_bridge") {
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

  const response = await admin.graphql(PRODUCTS_QUERY);
  const data = await response.json();

  const products: ProductWithContent[] =
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

  return json({ products });
};

export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Products"
      subtitle="Products enhanced with Product Bridge metafields"
      primaryAction={{ content: "Import Specs", url: "/app/import", icon: ImportIcon }}
      breadcrumbs={[{ content: "Home", url: "/app" }]}
    >
      <BlockStack gap="400">
        <Card>
          {products.length > 0 ? (
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={products}
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
                        <Link to={`/app/import?product=${handle}`} style={{ textDecoration: "none" }}>
                          <Button variant="secondary" size="slim">
                            View
                          </Button>
                        </Link>
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
        </Card>
      </BlockStack>
    </Page>
  );
}
