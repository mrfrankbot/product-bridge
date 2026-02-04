import { useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { Card, Banner, Button, Text, BlockStack } from "@shopify/polaris";
import { AlertDiamondIcon, RefreshIcon } from "@shopify/polaris-icons";

export function ProductBridgeErrorBoundary() {
  const error = useRouteError();

  // Helper to determine error type and provide actionable messages
  const getErrorInfo = () => {
    if (isRouteErrorResponse(error)) {
      switch (error.status) {
        case 404:
          return {
            title: "Page Not Found",
            message: "The requested page could not be found.",
            action: "Return to the main app",
            actionable: true
          };
        case 401:
          return {
            title: "Authentication Required", 
            message: "You need to authenticate with Shopify to access this app.",
            action: "Refresh to re-authenticate",
            actionable: true
          };
        case 403:
          return {
            title: "Access Denied",
            message: "You don't have permission to access this resource.",
            action: "Contact your store administrator",
            actionable: false
          };
        case 429:
          return {
            title: "Too Many Requests",
            message: "You're making too many requests. Please wait a moment and try again.",
            action: "Wait 30 seconds, then refresh",
            actionable: true
          };
        case 500:
          return {
            title: "Server Error",
            message: "Something went wrong on our end. This is usually temporary.",
            action: "Try refreshing the page",
            actionable: true
          };
        default:
          return {
            title: `Error ${error.status}`,
            message: error.statusText || "An unexpected error occurred.",
            action: "Try refreshing the page",
            actionable: true
          };
      }
    }

    if (error instanceof Error) {
      // Specific error types with actionable messages
      if (error.message.includes("fetch")) {
        return {
          title: "Network Error",
          message: "Unable to connect to the server. Check your internet connection.",
          action: "Check your connection and try again",
          actionable: true
        };
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        return {
          title: "API Limit Reached",
          message: "You've reached the API rate limit. Please wait before trying again.",
          action: "Wait a few minutes, then retry",
          actionable: true
        };
      }
      if (error.message.includes("OpenAI") || error.message.includes("GPT")) {
        return {
          title: "AI Service Error",
          message: "The AI content extraction service is temporarily unavailable.",
          action: "Try again in a few minutes or contact support",
          actionable: true
        };
      }
      
      return {
        title: "Application Error",
        message: error.message,
        action: "Try refreshing the page",
        actionable: true
      };
    }

    return {
      title: "Unknown Error",
      message: "An unexpected error occurred.",
      action: "Try refreshing the page",
      actionable: true
    };
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const errorInfo = getErrorInfo();

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <Card>
        <BlockStack gap="400">
          <Banner
            icon={AlertDiamondIcon}
            title={errorInfo.title}
            tone="critical"
          >
            <Text as="p">{errorInfo.message}</Text>
            
            {errorInfo.actionable && (
              <div style={{ marginTop: "12px" }}>
                <Text as="p" fontWeight="medium">
                  What you can do:
                </Text>
                <Text as="p">{errorInfo.action}</Text>
              </div>
            )}
          </Banner>

          {errorInfo.actionable && (
            <div>
              <Button
                primary
                icon={RefreshIcon}
                onClick={handleRefresh}
              >
                Refresh Page
              </Button>
            </div>
          )}

          {process.env.NODE_ENV === "development" && error instanceof Error && (
            <Card sectioned tone="subdued">
              <BlockStack gap="200">
                <Text as="h3" fontWeight="medium">
                  Debug Information
                </Text>
                <Text as="pre" fontFamily="monospace" fontSize="small">
                  {error.stack}
                </Text>
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </Card>
    </div>
  );
}

// Generic error boundary for components
export function ComponentErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
}