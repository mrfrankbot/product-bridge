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
  Banner,
  EmptyState,
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
  onSelect: (product: Product | null) => void;
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

  const EmptyStateMarkup = () => (
    <EmptyState
      heading="No products found"
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Try adjusting your search or add products in Shopify Admin.</p>
    </EmptyState>
  );

  return (
    <BlockStack gap="300">
      <Autocomplete
        options={productOptions}
        selected={selectedProduct ? [selectedProduct.id] : []}
        onSelect={handleProductSelect}
        loading={loading}
        emptyState={<EmptyStateMarkup />}
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
                  onSelect(null);
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
