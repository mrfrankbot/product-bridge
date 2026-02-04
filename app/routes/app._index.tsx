import { useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Thumbnail,
  Badge,
  Divider,
  EmptyState,
  ResourceList,
  ResourceItem,
} from "@shopify/polaris";
import { 
  ImportIcon, 
  ProductsIcon, 
  SettingsIcon, 
  MagicIcon,
  CheckIcon,
  ClockIcon,
  TrendingUpIcon,
  StarIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

// Types
interface EnhancedProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage?: { url: string; altText?: string } | null;
  updatedAt: string;
  contentStatus: {
    hasSpecs: boolean;
    hasHighlights: boolean;
    hasFeatured: boolean;
    hasIncluded: boolean;
  };
}

interface DashboardStats {
  totalEnhanced: number;
  avgSpecsExtracted: number;
  recentActivity: EnhancedProduct[];
}

// GraphQL query to get products with Product Bridge metafields
const ENHANCED_PRODUCTS_QUERY = `#graphql
  query EnhancedProductsQuery {
    products(first: 5, query: "metafields.namespace:product_bridge") {
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

// GraphQL query for stats
const PRODUCT_STATS_QUERY = `#graphql
  query ProductStatsQuery {
    products(first: 250, query: "metafields.namespace:product_bridge") {
      edges {
        node {
          id
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

  // Fetch recent enhanced products
  const recentResponse = await admin.graphql(ENHANCED_PRODUCTS_QUERY);
  const recentData = await recentResponse.json();
  
  // Fetch stats
  const statsResponse = await admin.graphql(PRODUCT_STATS_QUERY);
  const statsData = await statsResponse.json();

  // Process recent products
  const recentProducts: EnhancedProduct[] = recentData.data?.products?.edges?.map((edge: any) => {
    const product = edge.node;
    const metafields = product.metafields.edges.reduce((acc: any, metafield: any) => {
      acc[metafield.node.key] = metafield.node.value;
      return acc;
    }, {});

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      featuredImage: product.featuredImage,
      updatedAt: product.updatedAt,
      contentStatus: {
        hasSpecs: !!metafields.specs,
        hasHighlights: !!metafields.highlights,
        hasFeatured: !!metafields.featured,
        hasIncluded: !!metafields.included,
      },
    };
  }) || [];

  // Calculate stats
  const allEnhancedProducts = statsData.data?.products?.edges || [];
  const totalEnhanced = allEnhancedProducts.length;
  
  // Calculate average specs extracted
  let totalSpecs = 0;
  let productsWithSpecs = 0;
  
  allEnhancedProducts.forEach((edge: any) => {
    const metafields = edge.node.metafields.edges.reduce((acc: any, metafield: any) => {
      acc[metafield.node.key] = metafield.node.value;
      return acc;
    }, {});
    
    if (metafields.specs) {
      try {
        const specs = JSON.parse(metafields.specs);
        if (Array.isArray(specs)) {
          const specCount = specs.reduce((count, group) => count + (group.lines?.length || 0), 0);
          totalSpecs += specCount;
          productsWithSpecs++;
        }
      } catch {
        // Ignore parsing errors
      }
    }
  });

  const avgSpecsExtracted = productsWithSpecs > 0 ? Math.round(totalSpecs / productsWithSpecs) : 0;

  const stats: DashboardStats = {
    totalEnhanced,
    avgSpecsExtracted,
    recentActivity: recentProducts,
  };

  return json({ stats });
};

export default function Dashboard() {
  const { stats } = useLoaderData<typeof loader>();

  const quickActions = [
    {
      title: "Import Content",
      description: "Extract specs and content from manufacturer sources",
      icon: ImportIcon,
      url: "/app/import",
      primary: true,
    },
    {
      title: "View Products",
      description: "Browse products with enhanced content",
      icon: ProductsIcon,
      url: "/app/products",
      primary: false,
    },
    {
      title: "Settings",
      description: "Configure extraction preferences",
      icon: SettingsIcon,
      url: "/app/settings",
      primary: false,
    },
  ];

  const getContentStatusBadge = (status: EnhancedProduct['contentStatus']) => {
    const completed = Object.values(status).filter(Boolean).length;
    const total = 4; // specs, highlights, featured, included
    
    if (completed === total) {
      return <Badge tone="success" icon={CheckIcon}>Complete</Badge>;
    } else if (completed > 0) {
      return <Badge tone="attention">{completed}/{total} content types</Badge>;
    } else {
      return <Badge tone="subdued">No content</Badge>;
    }
  };

  return (
    <Page 
      title="Dashboard" 
      subtitle="AI-powered product content automation"
      primaryAction={
        <InlineStack gap="200">
          <Badge tone="info" icon={MagicIcon}>AI-Powered</Badge>
        </InlineStack>
      }
    >
      <BlockStack gap="600">
        {/* Hero Section */}
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="200">
              <InlineStack gap="300" blockAlign="start">
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Text as="span" variant="headingLg" tone="text-inverse">🌉</Text>
                </div>
                <BlockStack gap="200" inlineAlign="start">
                  <Text as="h1" variant="headingXl">
                    Product Bridge
                  </Text>
                  <Text as="p" variant="bodyLg" tone="subdued">
                    Transform manufacturer specs into rich, structured product content with AI. 
                    Extract specifications, highlights, and included items from PDFs, websites, 
                    or raw text - then save directly to your product metafields.
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>

            <InlineStack gap="400" wrap={false}>
              <div style={{ flex: 1 }}>
                <Card background="bg-fill-info">
                  <BlockStack gap="200" inlineAlign="center">
                    <Text as="p" variant="bodySm" fontWeight="semibold" tone="text-info">
                      Total Products Enhanced
                    </Text>
                    <Text as="p" variant="heading2xl" tone="text-info">
                      {stats.totalEnhanced}
                    </Text>
                  </BlockStack>
                </Card>
              </div>
              
              <div style={{ flex: 1 }}>
                <Card background="bg-fill-success">
                  <BlockStack gap="200" inlineAlign="center">
                    <Text as="p" variant="bodySm" fontWeight="semibold" tone="text-success">
                      Avg Specs per Product
                    </Text>
                    <Text as="p" variant="heading2xl" tone="text-success">
                      {stats.avgSpecsExtracted}
                    </Text>
                  </BlockStack>
                </Card>
              </div>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Quick Actions */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Quick Actions
            </Text>
            
            <InlineStack gap="400" wrap={false}>
              {quickActions.map((action) => (
                <div key={action.title} style={{ flex: 1 }}>
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack gap="300" blockAlign="center">
                        <div style={{ 
                          width: '40px', 
                          height: '40px',
                          background: action.primary ? '#6366f1' : '#f3f4f6',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <action.icon tone={action.primary ? "text-inverse" : "base"} />
                        </div>
                        <BlockStack gap="100" inlineAlign="start">
                          <Text as="h3" variant="headingSm" fontWeight="semibold">
                            {action.title}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {action.description}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      
                      <Link to={action.url} style={{ textDecoration: 'none' }}>
                        <Button 
                          variant={action.primary ? "primary" : "secondary"} 
                          fullWidth
                          icon={action.icon}
                        >
                          {action.primary ? "Start Import" : `Open ${action.title}`}
                        </Button>
                      </Link>
                    </BlockStack>
                  </Card>
                </div>
              ))}
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Recent Activity */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingLg">
                Recent Activity
              </Text>
              <Link to="/app/products" style={{ textDecoration: 'none' }}>
                <Button variant="plain">View All Products</Button>
              </Link>
            </InlineStack>

            {stats.recentActivity.length > 0 ? (
              <ResourceList
                resourceName={{ singular: 'product', plural: 'products' }}
                items={stats.recentActivity}
                renderItem={(product) => {
                  const { id, title, handle, featuredImage, updatedAt, contentStatus } = product;

                  return (
                    <ResourceItem
                      id={id}
                      url={`https://${Shopify.shop}.myshopify.com/admin/products/${handle}`}
                      media={
                        <Thumbnail
                          source={featuredImage?.url || ''}
                          alt={featuredImage?.altText || title}
                          size="small"
                        />
                      }
                      accessibilityLabel={`View details for ${title}`}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text as="h3" variant="bodyMd" fontWeight="semibold">
                            {title}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Last updated: {new Date(updatedAt).toLocaleDateString()}
                          </Text>
                        </BlockStack>
                        
                        <InlineStack gap="200">
                          {getContentStatusBadge(contentStatus)}
                          <Link to={`/app/import?product=${handle}`} style={{ textDecoration: 'none' }}>
                            <Button variant="plain" size="slim">
                              Edit Content
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
                action={{
                  content: 'Import Content',
                  url: '/app/import'
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Start by importing specs for your first product with AI-powered content extraction.</p>
              </EmptyState>
            )}
          </BlockStack>
        </Card>

        {/* Tips */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingLg">
              💡 Quick Tips
            </Text>
            
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                • <strong>Best results:</strong> Use manufacturer spec sheets or official product pages
              </Text>
              <Text as="p" variant="bodyMd">
                • <strong>Multiple formats:</strong> Upload PDFs, paste text, or scrape URLs
              </Text>
              <Text as="p" variant="bodyMd">
                • <strong>Edit before saving:</strong> Fine-tune AI extractions to match your style
              </Text>
              <Text as="p" variant="bodyMd">
                • <strong>Bulk processing:</strong> Extract content for multiple products efficiently
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}