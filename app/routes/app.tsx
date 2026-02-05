import { Outlet, useRouteError, useLocation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { Frame, Navigation } from "@shopify/polaris";
import { 
  HomeIcon, 
  ProductIcon, 
  ImportIcon, 
  SettingsIcon 
} from "@shopify/polaris-icons";

export default function App() {
  const location = useLocation();

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: "Home",
            icon: HomeIcon,
            url: "/app",
            exactMatch: true,
            selected: location.pathname === "/app",
          },
          {
            label: "Products",
            icon: ProductIcon,
            url: "/app/products",
            selected: location.pathname === "/app/products",
          },
          {
            label: "Import",
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
    <Frame navigation={navigationMarkup}>
      <Outlet />
    </Frame>
  );
}

// Shopify needs Alarm to re-auth
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs: Parameters<typeof boundary.headers>[0]) => {
  return boundary.headers(headersArgs);
};
