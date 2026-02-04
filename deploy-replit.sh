#!/bin/bash

echo "🚀 Setting up Product Bridge for Replit deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Replit secrets (see .env.replit)"
echo "2. Update SHOPIFY_APP_URL to match your Replit URL"
echo "3. Update Shopify Partners dashboard with new URL"
echo "4. Run: npm start"
echo ""
echo "🌐 Your app URL will be: https://[your-repl-name].[your-username].repl.co"
echo ""
echo "Need to update Shopify Partners:"
echo "- App URL: https://[your-repl-name].[your-username].repl.co"
echo "- Callback URL: https://[your-repl-name].[your-username].repl.co/auth/callback"