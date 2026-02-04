import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, useLocation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { Frame, Navigation } from "@shopify/polaris";
import { 
  HomeIcon, 
  ProductsIcon, 
  ImportIcon, 
  SettingsIcon 
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const location = useLocation();

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: "Dashboard",
            icon: HomeIcon,
            url: "/app",
            exactMatch: true,
            selected: location.pathname === "/app",
          },
          {
            label: "Products",
            icon: ProductsIcon,
            url: "/app/products",
            selected: location.pathname === "/app/products",
          },
          {
            label: "Import Content",
            icon: ImportIcon,
            url: "/app/import",
            selected: location.pathname === "/app/import",
          },
          {
            label: "Settings",
            icon: SettingsIcon,
            url: "/app/settings",
            selected: location.pathname === "/app/settings",
          },
        ]}
      />
    </Navigation>
  );

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <Frame navigation={navigationMarkup}>
        <Outlet />
      </Frame>
    </AppProvider>
  );
}

// Shopify needs Alarm to re-auth
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs: Parameters<typeof boundary.headers>[0]) => {
  return boundary.headers(headersArgs);
};
