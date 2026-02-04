import { useState, useEffect } from "react";
import { BlockStack, InlineStack, Text, ProgressBar, Box, Icon, Spinner } from "@shopify/polaris";
import { MagicIcon, NoteIcon } from "@shopify/polaris-icons";

interface ExtractionStage {
  name: string;
  duration: number;
  icon?: any;
}

interface ExtractionProgressProps {
  isActive: boolean;
  stages: ExtractionStage[];
  insights?: string[];
}

export function ExtractionProgress({ isActive, stages, insights = [] }: ExtractionProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentInsight, setCurrentInsight] = useState(0);

  // Reset when extraction starts
  useEffect(() => {
    if (isActive) {
      setCurrentStage(0);
      setProgress(0);
      setCurrentInsight(0);
    }
  }, [isActive]);

  // Progress through stages
  useEffect(() => {
    if (!isActive) return;

    const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 100;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // Update current stage
      let stageElapsed = 0;
      for (let i = 0; i < stages.length; i++) {
        stageElapsed += stages[i].duration;
        if (elapsed <= stageElapsed) {
          setCurrentStage(i);
          break;
        }
      }

      // Cycle through insights
      if (insights.length > 0) {
        const insightInterval = 2000; // Change insight every 2 seconds
        setCurrentInsight(Math.floor(elapsed / insightInterval) % insights.length);
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, stages, insights]);

  if (!isActive) return null;

  const currentStageData = stages[currentStage];
  const currentInsightText = insights[currentInsight];

  return (
    <Box padding="400" background="bg-fill-tertiary" borderRadius="base">
      <BlockStack gap="300">
        {/* Header */}
        <InlineStack gap="200" align="start" blockAlign="center">
          <Box
            background="bg-fill-emphasis"
            padding="200"
            borderRadius="full"
          >
            <div style={{
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon source={MagicIcon} />
            </div>
          </Box>
          
          <BlockStack gap="100">
            <Text as="h4" variant="bodyMd" fontWeight="semibold">
              AI is extracting your content...
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              This usually takes 10-15 seconds
            </Text>
          </BlockStack>
        </InlineStack>

        {/* Progress Bar */}
        <ProgressBar 
          progress={progress} 
          size="small"
        />

        {/* Current Stage */}
        <InlineStack gap="200" align="start" blockAlign="center">
          <Spinner size="small" />
          <Text as="p" variant="bodySm">
            {currentStageData?.name || 'Processing...'}
          </Text>
        </InlineStack>

        {/* Current Insight */}
        {currentInsightText && (
          <Box
            padding="300"
            background="bg-fill-info-secondary"
            borderRadius="base"
            borderWidth="025"
            borderColor="border-info"
          >
            <InlineStack gap="200" align="start" blockAlign="center">
              <Icon source={NoteIcon} tone="info" />
              <Text as="p" variant="bodySm" tone="info">
                {currentInsightText}
              </Text>
            </InlineStack>
          </Box>
        )}

        {/* Stage List */}
        <BlockStack gap="200">
          {stages.map((stage, index) => (
            <InlineStack key={index} gap="200" align="start" blockAlign="center">
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: index <= currentStage 
                  ? 'var(--p-color-bg-fill-success)' 
                  : 'var(--p-color-bg-fill-tertiary)'
              }} />
              <Text 
                as="p" 
                variant="captionMd" 
                tone={index <= currentStage ? undefined : "subdued"}
              >
                {stage.name}
              </Text>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Box>
  );
}