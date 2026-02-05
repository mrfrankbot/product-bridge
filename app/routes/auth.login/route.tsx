import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Text,
} from "@shopify/polaris";
import { useState } from "react";
import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopError = url.searchParams.get("shop-error");
  
  // Auto-initiate OAuth if shop param is present (coming from Shopify admin)
  const shop = url.searchParams.get("shop");
  if (shop) {
    console.log("[auth.login] Auto-initiating OAuth for shop:", shop);
    // Create a POST request to trigger the login action
    const formData = new FormData();
    formData.append("shop", shop);
    const postRequest = new Request(request.url, {
      method: "POST",
      body: formData,
    });
    // This will throw a redirect to start OAuth
    const errors = await login(postRequest);
    // If we get here, there was an error
    return json({ shopError: (errors as any)?.shop || "Failed to start OAuth" });
  }
  
  return json({ shopError });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = await login(request);
  return json({ errors });
};

export default function Auth() {
  const { shopError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");

  const errorMessage = shopError || (actionData?.errors as any)?.shop;

  return (
    <Page>
      <Card>
        <Form method="post">
          <FormLayout>
            <Text variant="headingMd" as="h2">
              Log in to Product Bridge
            </Text>
            <TextField
              type="text"
              name="shop"
              label="Shop domain"
              helpText="yourshop.myshopify.com"
              value={shop}
              onChange={setShop}
              autoComplete="on"
              error={errorMessage || undefined}
            />
            <Button submit>Log in</Button>
          </FormLayout>
        </Form>
      </Card>
    </Page>
  );
}
