import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Text,
  AppProvider,
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { useState } from "react";
import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopError = url.searchParams.get("shop-error");
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
    <AppProvider i18n={enTranslations}>
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
    </AppProvider>
  );
}
