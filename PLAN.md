# Product Bridge — Build Plan

## Phase 1: Scaffold (Agent 1)
1. Create Remix app with Shopify template
2. Configure app for Pictureline store
3. Set up Prisma database
4. Get basic app loading in Shopify Admin

## Phase 2: Core UI (Agent 2)
1. Product selector component
2. Input panel (paste text area)
3. Form UI for reviewing/editing specs
4. Save button that writes metafields

## Phase 3: AI Processing (Agent 3)
1. OpenAI integration for content extraction
2. Parse manufacturer specs → structured JSON
3. Generate highlights from marketing copy
4. Pick featured specs intelligently

## Phase 4: Theme Extension (Agent 4)
1. Product specs section (accordion)
2. Highlights section (bullets)
3. What's included section
4. Featured specs badges

## Commands for Codex Agents

### Agent 1: Scaffold
```
Create a new Shopify app using the Remix template in /Users/frank/clawd/projects/product-bridge.
Use 'npm create @shopify/app@latest -- --template remix'.
Name it 'product-bridge'.
Configure it to connect to the Pictureline store.
```

### Agent 2: Core UI
```
In /Users/frank/clawd/projects/product-bridge, build the main app UI.
Create a product selector that lists products from the store.
Add a text area for pasting manufacturer specs.
Create a form to review and edit the generated metafield data.
Add a save button that writes to product metafields using the Shopify Admin API.
Use the metafield namespace 'product_bridge' with keys: specs, highlights, included, featured.
```

### Agent 3: AI Processing
```
In /Users/frank/clawd/projects/product-bridge, create an AI service for content extraction.
Use OpenAI API to parse raw manufacturer specs into structured JSON.
The output should match these schemas:
- specs: [{heading: string, lines: [{title: string, text: string}]}]
- highlights: string[]
- included: [{title: string, link: string}]
- featured: [{title: string, value: string}]
Create a server action that takes raw text and returns structured data.
```
