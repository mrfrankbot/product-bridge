# Product Bridge UI Redesign Spec

**Date:** 2026-02-04
**Priority:** CRITICAL - Chris wants this done tonight
**Goal:** Make Product Bridge look and feel like a premium Shopify app

## Design Philosophy

Product Bridge is a **content enrichment tool** with a simple workflow:
1. Take raw manufacturer data
2. AI extracts structure
3. Save to metafields

The UI should reflect this simplicity - clean, focused, professional.

---

## Page Specifications

### 1. Dashboard (`app._index.tsx`)

**Current Issues:**
- Generic welcome, no store personalization
- DataTable for stats looks clinical
- Quick actions are cramped cards
- No visual hierarchy

**Redesign:**

```
┌─────────────────────────────────────────────────────────────┐
│  Welcome back, {storeName}! 👋                              │
│  Product Bridge is ready to enhance your catalog.           │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     12       │  │      8       │  │   Jan 28     │
│  Products    │  │    Specs     │  │    Last      │
│  Enhanced    │  │  Extracted   │  │   Activity   │
└──────────────┘  └──────────────┘  └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│  [🚀 ENHANCE A PRODUCT]                                     │
│  Import specs from manufacturer PDFs, URLs, or text         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Recent Activity                                            │
│  ─────────────────                                          │
│  📦 Sony A7R V - Specs updated - 2 hours ago               │
│  📦 Canon R5 II - Highlights added - Yesterday             │
│  📦 Nikon Z8 - Full enhancement - 3 days ago               │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Add store name to loader (already in settings, reuse query)
- Replace DataTable with 3 stat cards using `CalloutCard` or custom metric boxes
- Big primary CTA button (full width card, prominent)
- Recent activity with relative timestamps and icons
- Use `LegacyCard` sectioning or `Card` with proper spacing

**Stats to show:**
1. Products Enhanced (count)
2. Specs Extracted (count with specs metafield)
3. Last Activity (relative date)

---

### 2. Products Page (`app.products.tsx`)

**Current Issues:**
- Only shows products WITH product_bridge metafields
- No way to see products that NEED enhancement
- No filtering

**Redesign:**

```
┌─────────────────────────────────────────────────────────────┐
│  Products                                                    │
│  Browse your catalog and enhance product content            │
├─────────────────────────────────────────────────────────────┤
│  [All Products] [Enhanced ✓] [Needs Content]    🔍 Search   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐  Sony A7R V            ✅ Enhanced    [Enhance]   │
│  │ img │  Updated Jan 28                                    │
│  └─────┘                                                    │
│  ─────────────────────────────────────────────────────────  │
│  ┌─────┐  Canon EOS R5 II       ⚠️ Needs Content [Enhance] │
│  │ img │  No specs imported                                 │
│  └─────┘                                                    │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Query ALL products (first 50), not just those with metafields
- For each product, check if it has product_bridge metafields
- Add filter tabs: All / Enhanced / Needs Content
- Add search input
- Show appropriate badge: ✅ Enhanced (green) or ⚠️ Needs Content (yellow)
- Each row links to `/app/import?product={handle}`

**GraphQL Query Change:**
```graphql
query AllProducts($query: String, $first: Int!) {
  products(first: $first, query: $query, sortKey: TITLE) {
    edges {
      node {
        id
        title
        handle
        featuredImage { url altText }
        metafields(namespace: "product_bridge", first: 10) {
          edges { node { key value } }
        }
      }
    }
  }
}
```

---

### 3. Import Wizard (`app.import.tsx`)

**Keep existing 3-step flow, but ensure:**
- Step indicators are clear
- Proper Polaris spacing
- Loading states are smooth
- Success celebration (confetti already exists!)

**Steps:**
1. Select Product (dropdown)
2. Import Source (URL/PDF/Text) → AI extracts
3. Review & Save

---

### 4. Settings (`app.settings.tsx`)

**Current state is acceptable.** Minor improvements:
- Add app version info
- Show metafield namespace being used
- Keep OpenAI status indicator

---

## Technical Notes

### Polaris Components to Use
- `Page` with `title`, `subtitle`, `primaryAction`
- `Layout` with `Layout.Section`
- `Card` for content sections
- `CalloutCard` for CTAs (or custom styled card)
- `Badge` with `tone="success"` / `tone="attention"`
- `ResourceList` / `ResourceItem` for product lists
- `Tabs` for filtering
- `TextField` for search
- `SkeletonBodyText` / `SkeletonDisplayText` for loading states
- `EmptyState` when no products

### Data Flow
- Dashboard: Query enhanced products count + recent 5
- Products: Query ALL products, filter client-side by tab
- Import: Keep existing flow

### Testing Checklist
- [ ] Dashboard loads with store name
- [ ] Stats show correct counts
- [ ] CTA links to /app/import
- [ ] Recent activity shows products
- [ ] Products page shows ALL products
- [ ] Filter tabs work (All/Enhanced/Needs Content)
- [ ] Badge shows correct status per product
- [ ] Click product → goes to import wizard
- [ ] Import wizard still works
- [ ] Settings still works
- [ ] No TypeScript errors
- [ ] No console errors in browser
