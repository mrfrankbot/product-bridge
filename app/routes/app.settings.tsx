import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  DataTable,
  Banner,
} from "@shopify/polaris";
import { CheckCircleIcon, XCircleIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const shopResponse = await admin.graphql(`#graphql
    query SettingsShopInfo {
      shop {
        name
        email
        myshopifyDomain
        primaryDomain {
          host
          url
        }
        currencyCode
        ianaTimezone
      }
    }
  `);
  const shopPayload = await shopResponse.json();
  const shop = shopPayload.data?.shop;

  return json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    shop: shop
      ? {
          name: shop.name,
          email: shop.email,
          myshopifyDomain: shop.myshopifyDomain,
          primaryDomain: shop.primaryDomain?.host ?? null,
          primaryUrl: shop.primaryDomain?.url ?? null,
          currencyCode: shop.currencyCode,
          ianaTimezone: shop.ianaTimezone,
        }
      : null,
  });
};

export default function SettingsPage() {
  const { openaiConfigured, shop } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Settings"
      subtitle="Manage connections and store context"
      primaryAction={{ content: "Save", disabled: true }}
      breadcrumbs={[{ content: "Home", url: "/app" }]}
    >
      <Layout>
        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Store connection
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Live data pulled from your Shopify Admin API.
                  </Text>
                </BlockStack>
                <Badge tone={shop ? "success" : "critical"} icon={shop ? CheckCircleIcon : XCircleIcon}>
                  {shop ? "Connected" : "Unavailable"}
                </Badge>
              </InlineStack>

              {shop ? (
                <DataTable
                  columnContentTypes={["text", "text"]}
                  headings={["Store detail", "Value"]}
                  rows={[
                    ["Store name", shop.name],
                    ["Primary domain", shop.primaryDomain ?? "Not set"],
                    ["myshopify domain", shop.myshopifyDomain],
                    ["Contact email", shop.email || "Not set"],
                    ["Currency", shop.currencyCode],
                    ["Timezone", shop.ianaTimezone],
                  ]}
                />
              ) : (
                <Banner tone="critical" title="Store data unavailable">
                  Check your Shopify connection and try reloading the app.
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    OpenAI connection
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Used for AI extraction in the import workflow.
                  </Text>
                </BlockStack>
                <Badge
                  tone={openaiConfigured ? "success" : "attention"}
                  icon={openaiConfigured ? CheckCircleIcon : XCircleIcon}
                >
                  {openaiConfigured ? "Connected" : "Not configured"}
                </Badge>
              </InlineStack>
              {!openaiConfigured && (
                <Banner tone="warning" title="OpenAI API key missing">
                  Add an API key to enable AI extraction for manufacturer content.
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                More settings coming soon
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                This section will include defaults for extraction, automations, and notifications.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
