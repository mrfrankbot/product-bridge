import { useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Thumbnail,
  Badge,
  ResourceList,
  ResourceItem,
  Filters,
  EmptyState,
  Pagination,
  ChoiceList,
  TextField,
} from "@shopify/polaris";
import { 
  ProductsIcon, 
  ImportIcon, 
  CheckIcon,
  AlertTriangleIcon,
  SearchIcon,
  FilterIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

// Types
interface ProductWithContent {
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
    specsCount: number;
    highlightsCount: number;
    featuredCount: number;
    includedCount: number;
  };
}

interface LoaderData {
  products: ProductWithContent[];
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// GraphQL query to get products with/without Product Bridge metafields
const PRODUCTS_WITH_CONTENT_QUERY = `#graphql
  query ProductsWithContentQuery($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        cursor
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
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  
  const searchQuery = url.searchParams.get("search") || "";
  const filter = url.searchParams.get("filter") || "all";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const first = 20;

  // Build query based on filters
  let query = "";
  if (searchQuery) {
    query += `title:*${searchQuery}*`;
  }
  
  // For content filtering, we'll filter after fetching since GraphQL can't easily query metafield existence
  if (filter === "has_content") {
    query += (query ? " AND " : "") + "metafields.namespace:product_bridge";
  }

  const response = await admin.graphql(PRODUCTS_WITH_CONTENT_QUERY, {
    variables: {
      first,
      query: query || undefined,
    },
  });

  const data = await response.json();
  const productEdges = data.data?.products?.edges || [];

  // Process products and calculate content status
  let allProducts: ProductWithContent[] = productEdges.map((edge: any) => {
    const product = edge.node;
    const metafields = product.metafields.edges.reduce((acc: any, metafield: any) => {
      acc[metafield.node.key] = metafield.node.value;
      return acc;
    }, {});

    // Parse metafields to get counts
    let specsCount = 0, highlightsCount = 0, featuredCount = 0, includedCount = 0;

    try {
      if (metafields.specs) {
        const specs = JSON.parse(metafields.specs);
        specsCount = Array.isArray(specs) 
          ? specs.reduce((count, group) => count + (group.lines?.length || 0), 0) 
          : 0;
      }
      if (metafields.highlights) {
        const highlights = JSON.parse(metafields.highlights);
        highlightsCount = Array.isArray(highlights) ? highlights.length : 0;
      }
      if (metafields.featured) {
        const featured = JSON.parse(metafields.featured);
        featuredCount = Array.isArray(featured) ? featured.length : 0;
      }
      if (metafields.included) {
        const included = JSON.parse(metafields.included);
        includedCount = Array.isArray(included) ? included.length : 0;
      }
    } catch {
      // Ignore parsing errors
    }

    const contentStatus = {
      hasSpecs: !!metafields.specs && specsCount > 0,
      hasHighlights: !!metafields.highlights && highlightsCount > 0,
      hasFeatured: !!metafields.featured && featuredCount > 0,
      hasIncluded: !!metafields.included && includedCount > 0,
      specsCount,
      highlightsCount,
      featuredCount,
      includedCount,
    };

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      featuredImage: product.featuredImage,
      updatedAt: product.updatedAt,
      contentStatus,
    };
  });

  // Apply content-based filtering
  if (filter === "has_content") {
    allProducts = allProducts.filter(product => 
      product.contentStatus.hasSpecs || 
      product.contentStatus.hasHighlights || 
      product.contentStatus.hasFeatured || 
      product.contentStatus.hasIncluded
    );
  } else if (filter === "missing_content") {
    allProducts = allProducts.filter(product => 
      !product.contentStatus.hasSpecs && 
      !product.contentStatus.hasHighlights && 
      !product.contentStatus.hasFeatured && 
      !product.contentStatus.hasIncluded
    );
  }

  const totalCount = allProducts.length;
  const startIndex = (page - 1) * first;
  const endIndex = startIndex + first;
  const paginatedProducts = allProducts.slice(startIndex, endIndex);

  return json({
    products: paginatedProducts,
    totalCount,
    currentPage: page,
    hasNextPage: endIndex < totalCount,
    hasPreviousPage: page > 1,
  });
};

export default function ProductsPage() {
  const { products, totalCount, currentPage, hasNextPage, hasPreviousPage } = useLoaderData<LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const [filterValue, setFilterValue] = useState(searchParams.get("filter") || "all");

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("search", value);
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1"); // Reset to first page
    setSearchParams(newParams);
  };

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    const newParams = new URLSearchParams(searchParams);
    if (value !== "all") {
      newParams.set("filter", value);
    } else {
      newParams.delete("filter");
    }
    newParams.set("page", "1"); // Reset to first page
    setSearchParams(newParams);
  };

  const handlePageChange = (direction: 'next' | 'previous') => {
    const newParams = new URLSearchParams(searchParams);
    const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const getContentStatusBadge = (status: ProductWithContent['contentStatus']) => {
    const items = [
      { has: status.hasSpecs, count: status.specsCount, label: 'specs' },
      { has: status.hasHighlights, count: status.highlightsCount, label: 'highlights' },
      { has: status.hasFeatured, count: status.featuredCount, label: 'featured' },
      { has: status.hasIncluded, count: status.includedCount, label: 'included' },
    ];
    
    const completedItems = items.filter(item => item.has);
    
    if (completedItems.length === 4) {
      return <Badge tone="success" icon={CheckIcon}>Complete</Badge>;
    } else if (completedItems.length > 0) {
      return <Badge tone="attention">{completedItems.length}/4 content types</Badge>;
    } else {
      return <Badge tone="critical" icon={AlertTriangleIcon}>No content</Badge>;
    }
  };

  const getDetailedStatus = (status: ProductWithContent['contentStatus']) => {
    const items = [
      { has: status.hasSpecs, count: status.specsCount, label: 'Specs' },
      { has: status.hasHighlights, count: status.highlightsCount, label: 'Highlights' },
      { has: status.hasFeatured, count: status.featuredCount, label: 'Featured' },
      { has: status.hasIncluded, count: status.includedCount, label: 'Included' },
    ];
    
    return items
      .filter(item => item.has)
      .map(item => `${item.count} ${item.label}`)
      .join(' • ');
  };

  const filters = [
    {
      key: 'content',
      label: 'Content Status',
      filter: (
        <ChoiceList
          title="Content Status"
          titleHidden
          choices={[
            { label: 'All products', value: 'all' },
            { label: 'Has content', value: 'has_content' },
            { label: 'Missing content', value: 'missing_content' },
          ]}
          selected={[filterValue]}
          onChange={(value) => handleFilterChange(value[0])}
        />
      ),
    },
  ];

  return (
    <Page 
      title="Products" 
      subtitle={`${totalCount} products ${filterValue !== 'all' ? `(filtered)` : ''}`}
      primaryAction={
        <Link to="/app/import" style={{ textDecoration: 'none' }}>
          <Button variant="primary" icon={ImportIcon}>
            Import Content
          </Button>
        </Link>
      }
      breadcrumbs={[{content: 'Dashboard', url: '/app'}]}
    >
      <BlockStack gap="400">
        {/* Search and Filters */}
        <Card>
          <Filters
            queryValue={searchValue}
            queryPlaceholder="Search products..."
            filters={filters}
            onQueryChange={handleSearchChange}
            onQueryClear={() => handleSearchChange("")}
            onClearAll={() => {
              handleSearchChange("");
              handleFilterChange("all");
            }}
          />
        </Card>

        {/* Stats Summary */}
        {totalCount > 0 && (
          <Card>
            <InlineStack gap="400" wrap={false}>
              <div style={{ flex: 1 }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  Total Products
                </Text>
                <Text as="p" variant="headingMd">
                  {totalCount}
                </Text>
              </div>
              <div style={{ flex: 1 }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  With Content
                </Text>
                <Text as="p" variant="headingMd">
                  {products.filter(p => 
                    p.contentStatus.hasSpecs || 
                    p.contentStatus.hasHighlights || 
                    p.contentStatus.hasFeatured || 
                    p.contentStatus.hasIncluded
                  ).length}
                </Text>
              </div>
              <div style={{ flex: 1 }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  Missing Content
                </Text>
                <Text as="p" variant="headingMd">
                  {products.filter(p => 
                    !p.contentStatus.hasSpecs && 
                    !p.contentStatus.hasHighlights && 
                    !p.contentStatus.hasFeatured && 
                    !p.contentStatus.hasIncluded
                  ).length}
                </Text>
              </div>
            </InlineStack>
          </Card>
        )}

        {/* Products List */}
        <Card>
          {products.length > 0 ? (
            <BlockStack gap="400">
              <ResourceList
                resourceName={{ singular: 'product', plural: 'products' }}
                items={products}
                renderItem={(product) => {
                  const { id, title, handle, featuredImage, updatedAt, contentStatus } = product;
                  const detailedStatus = getDetailedStatus(contentStatus);

                  return (
                    <ResourceItem
                      id={id}
                      url={`/products/${handle}`}
                      media={
                        <Thumbnail
                          source={featuredImage?.url || ''}
                          alt={featuredImage?.altText || title}
                          size="medium"
                        />
                      }
                      accessibilityLabel={`View details for ${title}`}
                    >
                      <InlineStack align="space-between" blockAlign="start">
                        <BlockStack gap="200">
                          <Text as="h3" variant="bodyLg" fontWeight="semibold">
                            {title}
                          </Text>
                          
                          <InlineStack gap="200" wrap={false}>
                            {getContentStatusBadge(contentStatus)}
                            {detailedStatus && (
                              <Text as="p" variant="bodySm" tone="subdued">
                                {detailedStatus}
                              </Text>
                            )}
                          </InlineStack>
                          
                          <Text as="p" variant="bodySm" tone="subdued">
                            Last updated: {new Date(updatedAt).toLocaleDateString()}
                          </Text>
                        </BlockStack>
                        
                        <InlineStack gap="200">
                          <Link to={`/app/import?product=${handle}`} style={{ textDecoration: 'none' }}>
                            <Button variant="primary" size="slim">
                              {contentStatus.hasSpecs || contentStatus.hasHighlights || 
                               contentStatus.hasFeatured || contentStatus.hasIncluded 
                                ? 'Edit Content' : 'Import Content'}
                            </Button>
                          </Link>
                          <Button 
                            variant="plain" 
                            size="slim"
                            url={`https://admin.shopify.com/store/${Shopify.shop}/products/${id.split('/').pop()}`}
                            external
                          >
                            View in Shopify
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
              
              {/* Pagination */}
              {(hasNextPage || hasPreviousPage) && (
                <InlineStack align="center">
                  <Pagination
                    hasPrevious={hasPreviousPage}
                    onPrevious={() => handlePageChange('previous')}
                    hasNext={hasNextPage}
                    onNext={() => handlePageChange('next')}
                    label={`Page ${currentPage}`}
                  />
                </InlineStack>
              )}
            </BlockStack>
          ) : (
            <EmptyState
              heading={searchValue || filterValue !== 'all' 
                ? "No products match your filters" 
                : "No products found"}
              action={
                searchValue || filterValue !== 'all'
                  ? {
                      content: 'Clear filters',
                      onAction: () => {
                        handleSearchChange("");
                        handleFilterChange("all");
                      }
                    }
                  : {
                      content: 'Import Content',
                      url: '/app/import'
                    }
              }
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              {searchValue || filterValue !== 'all' 
                ? <p>Try adjusting your search terms or filters.</p>
                : <p>Start by importing specs for your first product with AI-powered content extraction.</p>
              }
            </EmptyState>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}