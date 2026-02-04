import { Card, BlockStack, InlineStack, Text, Icon, Badge, Box } from "@shopify/polaris";

interface MethodCardProps {
  icon: any; // Polaris icon component
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  supportedFormats?: string[];
  supportedSites?: string[];
  gradient?: string;
}

export function MethodCard({ 
  icon, 
  title, 
  description, 
  active, 
  onClick,
  supportedFormats,
  supportedSites,
  gradient 
}: MethodCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        width: '100%'
      }}
    >
      <Card
        background={active ? "bg-fill-emphasis-hover" : undefined}
        padding="400"
      >
        <BlockStack gap="300">
          {/* Icon and Title */}
          <InlineStack gap="200" align="start" blockAlign="center">
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active 
                ? 'var(--p-color-bg-fill-brand)' 
                : 'var(--p-color-bg-fill-secondary)'
            }}>
              <Icon source={icon} tone={active ? "textInverse" : "subdued"} />
            </div>
            
            <BlockStack gap="100">
              <Text 
                as="h4" 
                variant="bodyMd" 
                fontWeight="semibold"
                alignment="start"
              >
                {title}
              </Text>
              {active && (
                <Badge tone="info" size="small">Active</Badge>
              )}
            </BlockStack>
          </InlineStack>

          {/* Description */}
          <Text as="p" variant="bodySm" tone="subdued" alignment="start">
            {description}
          </Text>

          {/* Supported Formats/Sites */}
          {(supportedFormats || supportedSites) && (
            <Box paddingBlockStart="200">
              <Text as="p" variant="captionMd" tone="subdued" alignment="start">
                {supportedFormats && `Supports: ${supportedFormats.join(', ')}`}
                {supportedSites && `Works with: ${supportedSites.join(', ')}`}
              </Text>
            </Box>
          )}
        </BlockStack>
      </Card>
    </button>
  );
}