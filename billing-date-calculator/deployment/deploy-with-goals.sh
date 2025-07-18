#!/bin/bash

# Keap Billing Calculator Deployment Script with Goal Integration
# Usage: ./deploy-with-goals.sh

set -e

echo "🚀 Deploying Keap Billing Calculator with Goal Integration..."

# Configuration
PROJECT_ID="claude-mcp-docs-466120"
SERVICE_NAME="keap-billing-calculator"
REGION="us-central1"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "❌ Error: Not authenticated with gcloud. Run 'gcloud auth login' first."
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Prompt for environment variables if not set
echo "🔧 Checking environment variables..."

read -p "Enter your Keap API Token: " KEAP_API_TOKEN
read -p "Enter Success Goal ID: " KEAP_SUCCESS_GOAL_ID
read -p "Enter Error Goal ID: " KEAP_ERROR_GOAL_ID
read -p "Enter Airtable API Key: " AIRTABLE_API_KEY
read -p "Enter Airtable Base ID: " AIRTABLE_BASE_ID
read -p "Enter Webhook URL (optional): " WEBHOOK_URL

# Build environment variables string
ENV_VARS="KEAP_API_TOKEN=$KEAP_API_TOKEN,KEAP_SUCCESS_GOAL_ID=$KEAP_SUCCESS_GOAL_ID,KEAP_ERROR_GOAL_ID=$KEAP_ERROR_GOAL_ID,AIRTABLE_API_KEY=$AIRTABLE_API_KEY,AIRTABLE_BASE_ID=$AIRTABLE_BASE_ID,AIRTABLE_TABLE_NAME=Script Results"

if [ ! -z "$WEBHOOK_URL" ]; then
    ENV_VARS="$ENV_VARS,WEBHOOK_URL=$WEBHOOK_URL"
fi

echo "🔨 Building and deploying to Cloud Run..."

# Deploy the service
gcloud run deploy $SERVICE_NAME \
    --source . \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="$ENV_VARS" \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Service Information:"
echo "   URL: $SERVICE_URL"
echo "   Region: $REGION"
echo "   Project: $PROJECT_ID"
echo ""
echo "🧪 Test your deployment:"
echo "   Health Check: curl $SERVICE_URL/"
echo "   Goal Health: curl $SERVICE_URL/keap-goals/health"
echo ""
echo "📚 Test goal triggering:"
echo "   curl -X POST $SERVICE_URL/keap-goals/test \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"contactId\": \"12345\", \"testSuccess\": true}'"
echo ""
echo "🎯 Full calculation test:"
echo "   curl -X POST $SERVICE_URL/calculate-billing-date \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"contactId\": \"56702\", \"date\": \"2025-07-22\", \"delay\": \"5 days\"}'"
echo ""
echo "🔗 Use this URL in your Keap campaigns:"
echo "   $SERVICE_URL/calculate-billing-date"

# Optional: Test the deployment
read -p "🧪 Would you like to test the deployment now? (y/n): " TEST_NOW

if [[ $TEST_NOW =~ ^[Yy]$ ]]; then
    echo "🧪 Testing deployment..."
    
    # Test health endpoint
    echo "Testing health endpoint..."
    curl -s "$SERVICE_URL/" | jq .
    
    echo ""
    echo "Testing Keap goals health..."
    curl -s "$SERVICE_URL/keap-goals/health" | jq .
    
    echo ""
    echo "✅ Deployment test completed!"
fi

echo ""
echo "🎉 Your Keap Billing Calculator with Goal Integration is ready!"
echo "📖 For detailed setup instructions, see: docs/keap-goal-integration.md"