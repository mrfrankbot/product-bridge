import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
} from "@shopify/polaris";
import { CheckCircleIcon, XCircleIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
};

export default function SettingsPage() {
  const { openaiConfigured } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Settings"
      subtitle="Manage Product Bridge settings"
      primaryAction={{ content: "Save", disabled: true }}
      breadcrumbs={[{ content: "Home", url: "/app" }]}
    >
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  OpenAI connection
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Used for AI extraction in the import wizard.
                </Text>
              </BlockStack>
              <Badge
                tone={openaiConfigured ? "success" : "attention"}
                icon={openaiConfigured ? CheckCircleIcon : XCircleIcon}
              >
                {openaiConfigured ? "Connected" : "Not configured"}
              </Badge>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              More settings coming soon
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              This section will include defaults for extraction, automations, and notifications.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
