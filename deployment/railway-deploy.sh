#!/bin/bash

# ============================================================================
# Railway Deployment Script
# ============================================================================

set -e

echo "🚂 Deploying ClickUp Time To Leave automation to Railway"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Ensuring Railway authentication..."
railway login

# Create new project or link existing
echo "📋 Setting up Railway project..."
if [ ! -f "railway.json" ]; then
    echo "Creating new Railway project..."
    railway init
else
    echo "Using existing Railway project..."
fi

# Copy function code to root for Railway deployment
echo "📦 Preparing deployment files..."
cp functions/clickup-time-to-leave/package.json .
cp functions/clickup-time-to-leave/index.js .
cp functions/clickup-time-to-leave/.env.example .env.example

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment completed!"
echo ""
echo "💡 Next steps:"
echo "1. Set environment variables in Railway dashboard:"
echo "   - CLICKUP_API_KEY"
echo "   - PUSHCUT_TOKEN (optional)"
echo "2. Get your Railway app URL from the dashboard"
echo "3. Configure ClickUp webhook to point to: https://your-app.railway.app/clickup-webhook"
echo "4. Test with the manual trigger endpoint"
echo ""