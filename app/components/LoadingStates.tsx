import { Spinner, ProgressBar, Card, Text, BlockStack, InlineStack, Badge } from "@shopify/polaris";
import { useState, useEffect } from "react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "large";
  accessibilityLabel?: string;
}

export function LoadingSpinner({ 
  message = "Loading...", 
  size = "large",
  accessibilityLabel 
}: LoadingSpinnerProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '16px', 
      padding: '40px 20px' 
    }}>
      <Spinner size={size} accessibilityLabel={accessibilityLabel || message} />
      <Text as="p" textAlign="center">{message}</Text>
    </div>
  );
}

interface ProgressIndicatorProps {
  progress: number; // 0-100
  message?: string;
  steps?: string[];
  currentStep?: number;
  estimatedTime?: number;
}

export function ProgressIndicator({ 
  progress, 
  message = "Processing...",
  steps,
  currentStep,
  estimatedTime 
}: ProgressIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card sectioned>
      <BlockStack gap="400">
        <div>
          <InlineStack align="space-between">
            <Text as="h3" fontWeight="medium">{message}</Text>
            <Text as="span" color="subdued">
              {Math.round(progress)}%
            </Text>
          </InlineStack>
          <div style={{ marginTop: '8px' }}>
            <ProgressBar progress={progress} />
          </div>
        </div>

        {steps && currentStep !== undefined && (
          <div>
            <Text as="p" fontWeight="medium" color="subdued">
              Step {currentStep + 1} of {steps.length}
            </Text>
            <Text as="p">{steps[currentStep]}</Text>
          </div>
        )}

        <InlineStack align="space-between">
          <Text as="p" color="subdued">
            Elapsed: {elapsedTime}s
          </Text>
          {estimatedTime && (
            <Text as="p" color="subdued">
              Est. remaining: {Math.max(0, estimatedTime - elapsedTime)}s
            </Text>
          )}
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

interface ExtractionProgressProps {
  stage: 'uploading' | 'parsing' | 'extracting' | 'saving' | 'complete';
  source: 'text' | 'pdf' | 'url';
  progress?: number;
  error?: string;
}

export function ExtractionProgress({ stage, source, progress = 0, error }: ExtractionProgressProps) {
  const getStageMessage = () => {
    switch (stage) {
      case 'uploading':
        return source === 'pdf' ? 'Uploading PDF file...' : 'Preparing content...';
      case 'parsing':
        return source === 'pdf' ? 'Extracting text from PDF...' : 
               source === 'url' ? 'Scraping product page...' : 'Processing text...';
      case 'extracting':
        return 'AI is analyzing content...';
      case 'saving':
        return 'Saving to product...';
      case 'complete':
        return 'Content extracted successfully!';
      default:
        return 'Processing...';
    }
  };

  const getStageProgress = () => {
    if (progress > 0) return progress;
    
    switch (stage) {
      case 'uploading': return 20;
      case 'parsing': return 40;
      case 'extracting': return 70;
      case 'saving': return 90;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const steps = [
    source === 'pdf' ? 'Upload PDF' : source === 'url' ? 'Fetch page' : 'Process text',
    source === 'pdf' ? 'Extract text' : source === 'url' ? 'Scrape content' : 'Validate input',
    'AI analysis',
    'Save to product'
  ];

  const getCurrentStep = () => {
    switch (stage) {
      case 'uploading': return 0;
      case 'parsing': return 1;
      case 'extracting': return 2;
      case 'saving': return 3;
      case 'complete': return 3;
      default: return 0;
    }
  };

  if (error) {
    return (
      <Card sectioned>
        <BlockStack gap="200">
          <Badge tone="critical">Error</Badge>
          <Text as="p" color="critical">{error}</Text>
        </BlockStack>
      </Card>
    );
  }

  return (
    <ProgressIndicator
      progress={getStageProgress()}
      message={getStageMessage()}
      steps={steps}
      currentStep={getCurrentStep()}
      estimatedTime={source === 'pdf' ? 30 : source === 'url' ? 20 : 15}
    />
  );
}

interface OperationStatusProps {
  operation: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  details?: string;
  duration?: number;
}

export function OperationStatus({ 
  operation, 
  status, 
  message, 
  details,
  duration 
}: OperationStatusProps) {
  const getBadgeTone = () => {
    switch (status) {
      case 'loading': return 'info';
      case 'success': return 'success';
      case 'error': return 'critical';
      default: return 'subdued';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'Ready';
      case 'loading': return 'In Progress';
      case 'success': return 'Complete';
      case 'error': return 'Failed';
      default: return 'Unknown';
    }
  };

  return (
    <div style={{ padding: '12px', border: '1px solid #e1e3e5', borderRadius: '4px' }}>
      <InlineStack align="space-between" blockAlign="center">
        <div>
          <InlineStack gap="200" blockAlign="center">
            <Badge tone={getBadgeTone()}>
              {getStatusText()}
            </Badge>
            <Text as="span" fontWeight="medium">
              {operation}
            </Text>
            {status === 'loading' && (
              <Spinner size="small" accessibilityLabel="Loading" />
            )}
          </InlineStack>
          
          {message && (
            <Text as="p" color="subdued" fontSize="small">
              {message}
            </Text>
          )}
          
          {details && (
            <Text as="p" fontSize="small">
              {details}
            </Text>
          )}
        </div>

        {duration && status === 'success' && (
          <Text as="span" color="subdued" fontSize="small">
            {duration}ms
          </Text>
        )}
      </InlineStack>
    </div>
  );
}

interface BatchOperationProgressProps {
  operations: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message?: string;
    progress?: number;
  }>;
  onCancel?: () => void;
}

export function BatchOperationProgress({ operations, onCancel }: BatchOperationProgressProps) {
  const completed = operations.filter(op => op.status === 'success' || op.status === 'error').length;
  const total = operations.length;
  const overallProgress = total > 0 ? (completed / total) * 100 : 0;

  const running = operations.find(op => op.status === 'running');

  return (
    <Card sectioned>
      <BlockStack gap="400">
        <div>
          <InlineStack align="space-between">
            <Text as="h3" fontWeight="medium">
              Batch Operation Progress
            </Text>
            <Text as="span" color="subdued">
              {completed} of {total} complete
            </Text>
          </InlineStack>
          <div style={{ marginTop: '8px' }}>
            <ProgressBar progress={overallProgress} />
          </div>
        </div>

        {running && (
          <div style={{ padding: '12px', backgroundColor: '#f7f8f9', borderRadius: '4px' }}>
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <div>
                <Text as="p" fontWeight="medium">{running.name}</Text>
                {running.message && (
                  <Text as="p" color="subdued" fontSize="small">
                    {running.message}
                  </Text>
                )}
              </div>
            </InlineStack>
          </div>
        )}

        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <BlockStack gap="200">
            {operations.map(operation => (
              <OperationStatus
                key={operation.id}
                operation={operation.name}
                status={operation.status}
                message={operation.message}
              />
            ))}
          </BlockStack>
        </div>

        {onCancel && (
          <div>
            <button 
              onClick={onCancel}
              style={{ 
                padding: '8px 16px', 
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </BlockStack>
    </Card>
  );
}