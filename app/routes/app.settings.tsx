import { useState, useCallback } from "react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Checkbox,
  Select,
  TextField,
  Banner,
  Badge,
  Divider,
  Icon,
  Tooltip,
} from "@shopify/polaris";
import { 
  SettingsIcon, 
  CheckIcon,
  AlertTriangleIcon,
  InfoIcon,
  MagicIcon,
  StatusActiveIcon,
  StatusInactiveIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

// Types
interface AppSettings {
  featuredSpecsAutoSelect: boolean;
  defaultExtractionMethod: 'text' | 'pdf' | 'url';
  autoSaveOnExtraction: boolean;
  maxSpecsToExtract: number;
  includeManufacturerLinks: boolean;
  enableAdvancedParsing: boolean;
}

interface SystemStatus {
  openaiApiStatus: 'connected' | 'error' | 'not_configured';
  lastChecked: string;
  extractionsToday: number;
  rateLimitRemaining: number;
}

// Mock settings - in real app this would come from a database or metafield
const DEFAULT_SETTINGS: AppSettings = {
  featuredSpecsAutoSelect: true,
  defaultExtractionMethod: 'text',
  autoSaveOnExtraction: false,
  maxSpecsToExtract: 50,
  includeManufacturerLinks: true,
  enableAdvancedParsing: true,
};

// Mock system status - in real app this would check actual API status
const MOCK_SYSTEM_STATUS: SystemStatus = {
  openaiApiStatus: 'connected',
  lastChecked: new Date().toISOString(),
  extractionsToday: 12,
  rateLimitRemaining: 988,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // In a real app, you'd fetch settings from database/metafields
  // For now, return mock data
  return json({
    settings: DEFAULT_SETTINGS,
    systemStatus: MOCK_SYSTEM_STATUS,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_settings") {
    // In a real app, you'd save to database/metafields
    const settings: AppSettings = {
      featuredSpecsAutoSelect: formData.get("featuredSpecsAutoSelect") === "true",
      defaultExtractionMethod: (formData.get("defaultExtractionMethod") as AppSettings['defaultExtractionMethod']) || 'text',
      autoSaveOnExtraction: formData.get("autoSaveOnExtraction") === "true",
      maxSpecsToExtract: parseInt(formData.get("maxSpecsToExtract") as string) || 50,
      includeManufacturerLinks: formData.get("includeManufacturerLinks") === "true",
      enableAdvancedParsing: formData.get("enableAdvancedParsing") === "true",
    };

    // Mock save success
    return json({ 
      success: true, 
      message: "Settings saved successfully!",
      settings 
    });
  }

  if (intent === "test_api") {
    // Mock API test
    return json({
      apiTest: {
        success: true,
        status: 'connected',
        responseTime: '247ms',
        model: 'gpt-4-turbo',
      }
    });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

export default function SettingsPage() {
  const { settings: initialSettings, systemStatus } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  const isSaving = fetcher.state === "submitting" && fetcher.formData?.get("intent") === "save_settings";
  const isTesting = fetcher.state === "submitting" && fetcher.formData?.get("intent") === "test_api";
  
  const result = fetcher.data as { 
    success?: boolean; 
    message?: string; 
    error?: string;
    apiTest?: {
      success: boolean;
      status: string;
      responseTime: string;
      model: string;
    };
  } | undefined;

  const handleSettingChange = useCallback((key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveSettings = () => {
    const formData = new FormData();
    formData.append("intent", "save_settings");
    Object.entries(settings).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    fetcher.submit(formData, { method: "post" });
  };

  const handleTestAPI = () => {
    const formData = new FormData();
    formData.append("intent", "test_api");
    fetcher.submit(formData, { method: "post" });
  };

  const getStatusBadge = (status: SystemStatus['openaiApiStatus']) => {
    switch (status) {
      case 'connected':
        return <Badge tone="success" icon={StatusActiveIcon}>Connected</Badge>;
      case 'error':
        return <Badge tone="critical" icon={AlertTriangleIcon}>Error</Badge>;
      case 'not_configured':
        return <Badge tone="attention" icon={StatusInactiveIcon}>Not Configured</Badge>;
      default:
        return <Badge tone="subdued">Unknown</Badge>;
    }
  };

  return (
    <Page 
      title="Settings" 
      subtitle="Configure Product Bridge preferences and AI extraction options"
      primaryAction={
        <Button 
          variant="primary" 
          onClick={handleSaveSettings}
          loading={isSaving}
          icon={CheckIcon}
        >
          Save Settings
        </Button>
      }
      breadcrumbs={[{content: 'Dashboard', url: '/app'}]}
    >
      <BlockStack gap="500">
        {/* Save Success Banner */}
        {result?.success && (
          <Banner
            title="Settings Updated"
            tone="success"
            onDismiss={() => {}}
          >
            {result.message}
          </Banner>
        )}

        {/* Save Error Banner */}
        {result?.error && (
          <Banner
            title="Error Saving Settings"
            tone="critical"
          >
            {result.error}
          </Banner>
        )}

        {/* AI Extraction Settings */}
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={MagicIcon} />
              <Text as="h2" variant="headingLg">
                AI Extraction Settings
              </Text>
            </InlineStack>

            <BlockStack gap="400">
              <Checkbox
                label="Auto-select featured specs"
                helpText="Automatically mark the most important specifications as featured"
                checked={settings.featuredSpecsAutoSelect}
                onChange={(value) => handleSettingChange('featuredSpecsAutoSelect', value)}
              />

              <Select
                label="Default extraction method"
                options={[
                  { label: 'Text paste', value: 'text' },
                  { label: 'PDF upload', value: 'pdf' },
                  { label: 'URL scraping', value: 'url' },
                ]}
                value={settings.defaultExtractionMethod}
                onChange={(value) => handleSettingChange('defaultExtractionMethod', value as AppSettings['defaultExtractionMethod'])}
                helpText="The extraction method shown by default when starting the import wizard"
              />

              <TextField
                label="Maximum specs to extract"
                type="number"
                value={settings.maxSpecsToExtract.toString()}
                onChange={(value) => handleSettingChange('maxSpecsToExtract', parseInt(value) || 50)}
                helpText="Limit the number of specifications extracted to keep content manageable"
                suffix="specs"
                min={10}
                max={200}
                autoComplete="off"
              />

              <Checkbox
                label="Include manufacturer links"
                helpText="Try to extract and include links to manufacturer product pages"
                checked={settings.includeManufacturerLinks}
                onChange={(value) => handleSettingChange('includeManufacturerLinks', value)}
              />

              <Checkbox
                label="Enable advanced parsing"
                helpText="Use more sophisticated AI models for better accuracy (slower but higher quality)"
                checked={settings.enableAdvancedParsing}
                onChange={(value) => handleSettingChange('enableAdvancedParsing', value)}
              />
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Workflow Settings */}
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={SettingsIcon} />
              <Text as="h2" variant="headingLg">
                Workflow Settings
              </Text>
            </InlineStack>

            <BlockStack gap="400">
              <Checkbox
                label="Auto-save after extraction"
                helpText="Automatically save metafields immediately after AI extraction (skips review step)"
                checked={settings.autoSaveOnExtraction}
                onChange={(value) => handleSettingChange('autoSaveOnExtraction', value)}
              />
            </BlockStack>
          </BlockStack>
        </Card>

        {/* System Status */}
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={InfoIcon} />
              <Text as="h2" variant="headingLg">
                System Status
              </Text>
            </InlineStack>

            <BlockStack gap="400">
              {/* OpenAI API Status */}
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">
                    OpenAI API Connection
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Last checked: {new Date(systemStatus.lastChecked).toLocaleString()}
                  </Text>
                </BlockStack>
                
                <InlineStack gap="200" blockAlign="center">
                  {getStatusBadge(systemStatus.openaiApiStatus)}
                  <Button 
                    variant="tertiary" 
                    size="slim"
                    onClick={handleTestAPI}
                    loading={isTesting}
                  >
                    Test Connection
                  </Button>
                </InlineStack>
              </InlineStack>

              {/* API Test Results */}
              {result?.apiTest && (
                <Banner
                  title={result.apiTest.success ? "API Connection Successful" : "API Connection Failed"}
                  tone={result.apiTest.success ? "success" : "critical"}
                >
                  <BlockStack gap="100">
                    {result.apiTest.success && (
                      <>
                        <Text as="p" variant="bodySm">
                          Response time: {result.apiTest.responseTime}
                        </Text>
                        <Text as="p" variant="bodySm">
                          Model: {result.apiTest.model}
                        </Text>
                      </>
                    )}
                  </BlockStack>
                </Banner>
              )}

              <Divider />

              {/* Usage Stats */}
              <InlineStack gap="600" wrap={false}>
                <div style={{ flex: 1 }}>
                  <Card background="bg-fill-info">
                    <BlockStack gap="200" inlineAlign="start">
                      <Text as="p" variant="bodySm" fontWeight="semibold" tone="text-info">
                        Extractions Today
                      </Text>
                      <Text as="p" variant="headingLg" tone="text-info">
                        {systemStatus.extractionsToday}
                      </Text>
                    </BlockStack>
                  </Card>
                </div>
                
                <div style={{ flex: 1 }}>
                  <Card background="bg-fill-success">
                    <BlockStack gap="200" inlineAlign="start">
                      <Text as="p" variant="bodySm" fontWeight="semibold" tone="text-success">
                        Rate Limit Remaining
                      </Text>
                      <Text as="p" variant="headingLg" tone="text-success">
                        {systemStatus.rateLimitRemaining}
                      </Text>
                    </BlockStack>
                  </Card>
                </div>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Information */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              About Product Bridge
            </Text>
            
            <BlockStack gap="300">
              <Text as="p" variant="bodyMd">
                Product Bridge uses advanced AI to extract and structure product information from various sources. 
                The extracted content is saved as Shopify metafields in the "product_bridge" namespace.
              </Text>
              
              <Text as="p" variant="bodyMd">
                <strong>Metafield Keys:</strong>
              </Text>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  • <strong>specs</strong> - Detailed technical specifications organized by category
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  • <strong>highlights</strong> - Key product features and selling points
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  • <strong>featured</strong> - Most important specifications for product comparison
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  • <strong>included</strong> - Items and accessories included with the product
                </Text>
              </BlockStack>
              
              <Text as="p" variant="bodyMd">
                All metafields use JSON format and can be accessed in your theme using Liquid templating.
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}