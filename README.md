# Product Bridge

AI-powered product content automation for Pictureline's Shopify store.

## What it does

Product Bridge transforms manufacturer spec sheets into structured Shopify metafields:

1. **Input**: Paste raw specs from manufacturer websites or PDFs
2. **AI Processing**: GPT-4 extracts and structures the content
3. **Output**: Clean JSON for product specs, highlights, what's included, and featured specs
4. **Save**: Writes directly to product metafields via Shopify Admin API

## Metafield Schema

Namespace: `product_bridge`

| Key | Type | Description |
|-----|------|-------------|
| `specs` | JSON | Grouped specifications (Camera, Sensor, AF, Video, etc.) |
| `highlights` | JSON | Marketing bullet points |
| `included` | JSON | What's in the box |
| `featured` | JSON | Key specs for quick reference |

## Development

```bash
npm install
npm run dev
```

## Deployment

Connect to Shopify Partners and deploy via Shopify CLI:

```bash
shopify app deploy
```

## Theme Integration

Add the theme app extension sections to your product template:
- `product-specs` - Accordion with full specifications
- `product-highlights` - Bullet list of key features
- `product-included` - What's in the box
- `product-featured-specs` - Key spec badges

---

Built for Pictureline by Frank ⚡
