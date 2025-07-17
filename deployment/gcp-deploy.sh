#!/bin/bash

# ============================================================================
# Google Cloud Functions Deployment Script
# ============================================================================

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"your-project-id"}
REGION=${GCP_REGION:-"us-central1"}
FUNCTION_NAME="clickup-time-to-leave"
SOURCE_DIR="functions/clickup-time-to-leave"

echo "🚀 Deploying ClickUp Time To Leave automation to Google Cloud Functions"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Function Name: $FUNCTION_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable run.googleapis.com

# Deploy the function
echo "📦 Deploying function..."
cd $SOURCE_DIR

gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=. \
  --entry-point=app \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --memory=256MB \
  --timeout=60s \
  --max-instances=10

# Get the function URL
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --format="value(serviceConfig.uri)")

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📍 Function URL:"
echo "$FUNCTION_URL"
echo ""
echo "🔗 Webhook URL:"
echo "$FUNCTION_URL/clickup-webhook"
echo ""
echo "🧪 Test Endpoints:"
echo "Health Check: $FUNCTION_URL/health"
echo "Task Fields: $FUNCTION_URL/task-fields/{taskId}"
echo "Manual Trigger: $FUNCTION_URL/manual-trigger/{taskId}"
echo ""
echo "💡 Next steps:"
echo "1. Set environment variables in GCP Console:"
echo "   gcloud functions deploy $FUNCTION_NAME --update-env-vars CLICKUP_API_KEY=pk_your_key"
echo "   gcloud functions deploy $FUNCTION_NAME --update-env-vars PUSHCUT_TOKEN=your_token"
echo ""
echo "2. Configure ClickUp webhook:"
echo "   - Endpoint: $FUNCTION_URL/clickup-webhook"
echo "   - Events: Task Updated"
echo "   - Filters: Tasks with 'appointment' tag"
echo ""
echo "3. Test your setup:"
echo "   curl $FUNCTION_URL/health"
echo ""
echo "🔍 View logs:"
echo "   gcloud functions logs read $FUNCTION_NAME --region=$REGION"
echo ""