import { useState, useCallback } from "react";
import { 
  Autocomplete, 
  Thumbnail, 
  BlockStack, 
  InlineStack, 
  Text, 
  Icon, 
  Badge,
  Box,
  Card,
  Button,
  Banner
} from "@shopify/polaris";
import { SearchIcon, CheckIcon } from "@shopify/polaris-icons";

interface Product {
  id: string;
  title: string;
  handle: string;
  featuredImage?: { url: string; altText?: string } | null;
}

interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelect: (product: Product) => void;
  placeholder?: string;
  loading?: boolean;
}

export function ProductSelector({ 
  products, 
  selectedProduct, 
  onSelect, 
  placeholder = "Search by product name, SKU, or handle...",
  loading = false 
}: ProductSelectorProps) {
  const [searchValue, setSearchValue] = useState(selectedProduct?.title || "");

  const productOptions = products.map((product) => ({
    value: product.id,
    label: product.title,
    media: product.featuredImage?.url ? (
      <Thumbnail 
        source={product.featuredImage.url} 
        alt={product.featuredImage.altText || product.title} 
        size="small" 
      />
    ) : undefined,
  }));

  const handleProductSelect = useCallback(
    (selected: string[]) => {
      const product = products.find((p) => p.id === selected[0]);
      if (product) {
        onSelect(product);
        setSearchValue(product.title);
      }
    },
    [products, onSelect]
  );

  const handleInputChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const EmptyState = () => (
    <Box padding="400">
      <BlockStack gap="300" inlineAlign="center">
        <Icon source={SearchIcon} tone="subdued" />
        <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
          No products found
        </Text>
        <Text as="p" variant="bodySm" tone="subdued" alignment="center">
          Try adjusting your search or import products first
        </Text>
        <Button variant="plain" size="micro">
          Import Products
        </Button>
      </BlockStack>
    </Box>
  );

  const LoadingState = () => (
    <Box padding="400">
      <InlineStack gap="300" align="center">
        <div style={{ 
          width: '24px', 
          height: '24px', 
          border: '2px solid var(--p-color-border-secondary)',
          borderTop: '2px solid var(--p-color-border-emphasis)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <Text as="p" variant="bodySm" tone="subdued">
          Searching products...
        </Text>
      </InlineStack>
    </Box>
  );

  return (
    <BlockStack gap="300">
      <Autocomplete
        options={productOptions}
        selected={selectedProduct ? [selectedProduct.id] : []}
        onSelect={handleProductSelect}
        loading={loading}
        emptyState={<EmptyState />}
        listTitle="Products"
        textField={
          <Autocomplete.TextField
            onChange={handleInputChange}
            label="Select a product"
            value={searchValue}
            prefix={<Icon source={SearchIcon} />}
            placeholder={placeholder}
            autoComplete="off"
          />
        }
      />

      {/* Selected Product Preview */}
      {selectedProduct && (
        <Card padding="400">
          <InlineStack gap="400" align="space-between" blockAlign="center">
            <InlineStack gap="300" align="start" blockAlign="center">
              {selectedProduct.featuredImage?.url && (
                <Thumbnail
                  source={selectedProduct.featuredImage.url}
                  alt={selectedProduct.title}
                  size="medium"
                />
              )}
              
              <BlockStack gap="200">
                <Text as="h4" variant="bodyMd" fontWeight="semibold">
                  {selectedProduct.title}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Handle: /{selectedProduct.handle}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  ID: {selectedProduct.id.replace("gid://shopify/Product/", "")}
                </Text>
              </BlockStack>
            </InlineStack>

            <InlineStack gap="200" align="end" blockAlign="center">
              <Badge tone="success" icon={CheckIcon}>
                Selected
              </Badge>
              <Button 
                variant="plain" 
                size="micro"
                onClick={() => {
                  onSelect(null as any);
                  setSearchValue("");
                }}
              >
                Change
              </Button>
            </InlineStack>
          </InlineStack>
        </Card>
      )}

      {/* Helpful Tips */}
      {!selectedProduct && products.length === 0 && (
        <Banner tone="info">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm">
              <strong>No products found.</strong> Make sure you have products in your Shopify store.
            </Text>
            <Text as="p" variant="bodySm">
              You can import products from your admin dashboard or create them manually.
            </Text>
          </BlockStack>
        </Banner>
      )}

      {searchValue && !loading && products.length > 0 && productOptions.length === 0 && (
        <Banner tone="warning">
          <Text as="p" variant="bodySm">
            <strong>No matches for "{searchValue}".</strong> Try searching by product name, SKU, or handle.
          </Text>
        </Banner>
      )}
    </BlockStack>
  );
}