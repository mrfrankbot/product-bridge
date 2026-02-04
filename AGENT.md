# Product Bridge - Shopify App

## Overview
AI-powered product content automation for Pictureline's Shopify store.

## Tech Stack
- **Framework:** Remix (Shopify standard) with Vite
- **Shopify CLI:** For app scaffolding and deployment
- **AI:** OpenAI GPT-4o for content extraction
- **Session Storage:** Memory (dev) - consider Prisma for production

## Metafield Schema
Namespace: `product_bridge`
- `specs` - JSON array of spec groups `{heading, lines[{title, text}]}`
- `highlights` - JSON array of strings
- `included` - JSON array of `{title, link}`
- `featured` - JSON array of `{title, value}`
- `kits` - JSON array of variants (future)

## Commands
- `npm run dev` - Start with Shopify CLI (embedded app dev)
- `npm run build` - Build for production
- `npm run typecheck` - TypeScript check

## Shopify Store
- Dev Store: bachwell.myshopify.com
- Partners Account: Bachwell
- App Client ID: b3858538da509600efa38d560ca48cd7

## Key Files
- `/app/shopify.server.ts` - Shopify app config & auth
- `/app/routes/app.tsx` - Authenticated app wrapper
- `/app/routes/app._index.tsx` - Main UI (product select, extract, edit, save)
- `/app/services/content-extractor.server.ts` - OpenAI GPT-4o integration
- `/app/services/pdf-parser.server.ts` - PDF text extraction (pdf-parse)
- `/app/services/url-scraper.server.ts` - URL scraping for manufacturer pages (cheerio)
- `/extensions/theme-extension/blocks/` - Theme app extension blocks

## Features (Phase 3 Complete)
1. **Product Selector** - GraphQL autocomplete with thumbnails
2. **AI Extraction** - Paste specs → structured JSON (GPT-4o)
3. **PDF Upload** - Extract text from PDF spec sheets (pdf-parse)
4. **URL Scraping** - Scrape manufacturer product pages (cheerio)
5. **Edit Form** - Review/modify highlights, featured, included, specs
6. **Metafield Save** - Writes to `product_bridge` namespace via Admin API
7. **Theme Blocks** - 4 Liquid blocks for product pages

## Environment Variables
- `SHOPIFY_API_KEY` - App client ID
- `SHOPIFY_API_SECRET` - App secret
- `OPENAI_API_KEY` - For GPT-4o content extraction
- `SCOPES` - read_products,write_products (metafields included in products scope)
- `SHOPIFY_APP_URL` - App URL (for production deploy)

## Deployment Status
- **Shopify Partners:** ✅ Deployed (version product-bridge-11)
- **App Server:** ⚠️ Needs hosting (configured for product-bridge.fly.dev)
- **Theme Extension:** ✅ Deployed to all 4 blocks
- **Install Status:** Installed on bachwell.myshopify.com

## To Run Locally
```bash
npm run dev
```
This starts the dev server with a tunnel for local testing.
