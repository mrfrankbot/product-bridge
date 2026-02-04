import { useState, useEffect } from "react";
import { Card, BlockStack, InlineStack, Text, Box, Button, Icon } from "@shopify/polaris";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "@shopify/polaris-icons";

export type StepState = 'inactive' | 'active' | 'complete';

interface StepCardProps {
  step: number;
  title: string;
  description?: string;
  state: StepState;
  children: React.ReactNode;
  onActivate?: () => void;
  disabled?: boolean;
}

export function StepCard({ 
  step, 
  title, 
  description, 
  state, 
  children, 
  onActivate,
  disabled = false 
}: StepCardProps) {
  const [isExpanded, setIsExpanded] = useState(state === 'active');
  
  // Update expansion when state changes
  useEffect(() => {
    setIsExpanded(state === 'active');
  }, [state]);

  const getCardBackground = () => {
    switch (state) {
      case 'active': return "bg-fill-emphasis-hover";
      case 'complete': return "bg-fill-success-secondary";
      default: return undefined;
    }
  };

  const getBorderColor = () => {
    switch (state) {
      case 'active': return "border-emphasis";
      case 'complete': return "border-success";
      default: return undefined;
    }
  };

  const canToggle = state !== 'inactive' && !disabled;

  const handleToggle = () => {
    if (!canToggle) return;
    
    if (state === 'complete' || state === 'active') {
      setIsExpanded(!isExpanded);
    }
    
    if (state === 'inactive' && onActivate) {
      onActivate();
    }
  };

  return (
    <Card 
      background={getCardBackground()}
      padding={isExpanded ? "500" : "400"}
    >
      <BlockStack gap="300">
        {/* Header - Always visible */}
        <button
          onClick={handleToggle}
          disabled={!canToggle}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: canToggle ? 'pointer' : 'default',
            textAlign: 'left',
            width: '100%'
          }}
        >
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" align="start" blockAlign="center">
              {/* Step Number/Icon */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: state === 'active' 
                  ? 'var(--p-color-bg-fill-brand)' 
                  : state === 'complete' 
                    ? 'var(--p-color-bg-fill-success)' 
                    : 'var(--p-color-bg-fill-secondary)',
                color: state === 'inactive' ? 'var(--p-color-text-secondary)' : '#fff',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {state === 'complete' ? (
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                    <path d="M8.72 13.78a.75.75 0 0 1-1.06 0l-3.22-3.22a.75.75 0 0 1 1.06-1.06l2.69 2.69 5.47-5.47a.75.75 0 0 1 1.06 1.06l-6 6Z"/>
                  </svg>
                ) : (
                  step
                )}
              </div>

              {/* Title and Description */}
              <BlockStack gap="100">
                <Text 
                  as="h3" 
                  variant={state === 'active' ? "headingSm" : "bodyMd"}
                  fontWeight={state === 'active' ? "semibold" : "medium"}
                  tone={state === 'inactive' ? "subdued" : undefined}
                >
                  {title}
                </Text>
                {description && (
                  <Text 
                    as="p" 
                    variant="bodySm" 
                    tone={state === 'inactive' ? "subdued" : "subdued"}
                  >
                    {description}
                  </Text>
                )}
              </BlockStack>
            </InlineStack>

            {/* Expand/Collapse Icon */}
            {canToggle && (
              <Icon 
                source={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                tone={state === 'inactive' ? "subdued" : undefined}
              />
            )}
          </InlineStack>
        </button>

        {/* Content - Only when expanded */}
        {isExpanded && (
          <Box 
            paddingBlockStart="300"
            style={{
              borderTop: `1px solid var(--p-color-border-secondary)`,
            }}
          >
            {children}
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}