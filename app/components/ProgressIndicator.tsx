import { InlineStack, Text, Box } from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

interface ProgressIndicatorProps {
  current: number;
  steps: Array<{
    title: string;
    description?: string;
  }>;
}

export function ProgressIndicator({ current, steps }: ProgressIndicatorProps) {
  return (
    <Box paddingBlock="400">
      <InlineStack gap="300" align="center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = current === stepNumber;
          const isComplete = current > stepNumber;
          const isUpcoming = current < stepNumber;

          return (
            <InlineStack key={index} gap="200" align="center" blockAlign="center">
              {/* Step Circle */}
              <Box
                background={isActive ? "bg-fill-emphasis" : isComplete ? "bg-fill-success" : "bg-fill-tertiary"}
                padding="100"
                borderRadius="full"
                width="32px"
                height="32px"
                minHeight="32px"
                minWidth="32px"
                position="relative"
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  color: isActive || isComplete ? '#fff' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {isComplete ? (
                    <CheckIcon />
                  ) : (
                    stepNumber
                  )}
                </div>
              </Box>

              {/* Step Text */}
              <Box>
                <Text 
                  as="span" 
                  variant={isActive ? "bodyMd" : "bodySm"} 
                  fontWeight={isActive ? "semibold" : "regular"}
                  tone={isUpcoming ? "subdued" : undefined}
                >
                  {step.title}
                </Text>
                {step.description && isActive && (
                  <Box paddingBlockStart="100">
                    <Text as="p" variant="bodySm" tone="subdued">
                      {step.description}
                    </Text>
                  </Box>
                )}
              </Box>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <Box
                  background={current > stepNumber ? "bg-fill-success" : "bg-fill-tertiary"}
                  width="24px"
                  height="2px"
                  borderRadius="base"
                />
              )}
            </InlineStack>
          );
        })}
      </InlineStack>
    </Box>
  );
}