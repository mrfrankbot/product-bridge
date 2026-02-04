import { InlineStack, Text, Box } from "@shopify/polaris";

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
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isActive 
                  ? 'var(--p-color-bg-fill-brand)' 
                  : isComplete 
                    ? 'var(--p-color-bg-fill-success)' 
                    : 'var(--p-color-bg-fill-secondary)',
                color: isActive || isComplete ? '#fff' : 'var(--p-color-text-secondary)',
                fontSize: '13px',
                fontWeight: '600',
                flexShrink: 0
              }}>
                {isComplete ? (
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                    <path d="M8.72 13.78a.75.75 0 0 1-1.06 0l-3.22-3.22a.75.75 0 0 1 1.06-1.06l2.69 2.69 5.47-5.47a.75.75 0 0 1 1.06 1.06l-6 6Z"/>
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>

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