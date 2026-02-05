import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client for session storage
const prisma = new PrismaClient();

// Use Prisma session storage for persistence across cold starts
const sessionStorage = new PrismaSessionStorage(prisma);

console.log("Using Prisma session storage (PostgreSQL)");

// Force production URL - Replit config keeps reverting
const PRODUCTION_APP_URL = "https://product-bridge.replit.app";
const appUrl = process.env.SHOPIFY_APP_URL || PRODUCTION_APP_URL;
console.log("[shopify.server] Using SHOPIFY_APP_URL:", appUrl);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES?.split(",") || ["read_products", "write_products", "read_metafields", "write_metafields"],
  appUrl: appUrl,
  authPathPrefix: "/auth",
  sessionStorage: sessionStorage as any,
  distribution: AppDistribution.AppStore,
  isEmbeddedApp: true,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = LATEST_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export { sessionStorage, prisma };
