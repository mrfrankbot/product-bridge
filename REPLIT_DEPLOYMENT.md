# Product Bridge - Replit Deployment Guide

## Quick Setup

1. **Create New Repl**
   - Go to https://replit.com/t/pictureline
   - Click "Import from GitHub" 
   - Use this repository or upload the project files manually

2. **Environment Variables**
   Copy these environment variables to your Replit secrets:

   ```bash
   SHOPIFY_API_KEY=b3858538da509600efa38d560ca48cd7
   SHOPIFY_API_SECRET=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
   OPENAI_API_KEY=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
   SCOPES=read_products,write_products,read_metafields,write_metafields
   SHOPIFY_APP_URL=https://product-bridge.your-username.repl.co
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Build & Start**
   ```bash
   npm run build
   npm start
   ```

## Shopify App Configuration Update

After deployment, update the Shopify app configuration:

1. Go to https://partners.shopify.com/
2. Find your "Product Bridge" app
3. Update the App URL to: `https://product-bridge.your-username.repl.co`
4. Update the Allowed redirection URL(s) to: `https://product-bridge.your-username.repl.co/auth/callback`

## Database Configuration

The app currently uses memory-based session storage. For production, no database setup is required initially, but you may want to consider:

- Adding a persistent database for user data
- Using Shopify's built-in persistence mechanisms
- Implementing Redis for session storage if needed

## Testing

1. Visit your Replit URL
2. Install the app on a Shopify store (already installed on bachwell.myshopify.com)
3. Test product import functionality

## Troubleshooting

- Ensure all environment variables are set correctly
- Check that the Shopify app URL matches your Replit URL exactly
- Verify the app is properly configured in Shopify Partners dashboard