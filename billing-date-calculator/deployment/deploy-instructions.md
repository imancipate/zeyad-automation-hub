# Deployment Instructions

## Prerequisites

- Google Cloud SDK installed and configured
- Google Cloud project with billing enabled
- Airtable account with API access
- Zapier account (optional)

## Environment Setup

### 1. Airtable Configuration

1. **Create API Token:**
   - Go to https://airtable.com/create/tokens
   - Create token with `data:records:read`, `data:records:write`, `schema:bases:read` scopes
   - Add your CRM base to the token

2. **Base Setup:**
   - Use base ID: `appy2LhAq03EfacUM` (or your CRM base)
   - Ensure "Script Results" table exists with required fields

3. **Required Fields in Script Results Table:**
   - `Execution ID` (Single line text) - Primary field
   - `Script Name` (Single select) - With "Billing Date Calculator" option
   - `Contact ID` (Single line text)
   - `Status` (Single select) - Success/Error/Pending options
   - `Input Data` (Long text)
   - `Output Data` (Long text)
   - `Timestamp` (Date/time)
   - `Calculated Billing Date` (Date)

### 2. Zapier Webhook (Optional)

1. **Create Zap:**
   - Trigger: Webhooks by Zapier (Catch Hook)
   - Action: Keap (Update Contact)

2. **Configure Webhook:**
   - Copy webhook URL from Zapier
   - Format: `https://hooks.zapier.com/hooks/catch/XXXXX/XXXXXX/`

## Deployment Options

### Option 1: Google Cloud Run (Recommended)

```bash
# 1. Navigate to project directory
cd billing-date-calculator

# 2. Set Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# 3. Deploy with environment variables
gcloud run deploy keap-billing-calculator \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars "AIRTABLE_API_KEY=your_airtable_api_key,AIRTABLE_BASE_ID=appy2LhAq03EfacUM,AIRTABLE_TABLE_NAME=Script Results,WEBHOOK_URL=your_zapier_webhook_url,NODE_ENV=production"
```

### Option 2: Local Development

```bash
# 1. Create .env file
cat > .env << 'EOF'
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=appy2LhAq03EfacUM
AIRTABLE_TABLE_NAME=Script Results
WEBHOOK_URL=your_zapier_webhook_url
NODE_ENV=development
PORT=8080
EOF

# 2. Install dependencies
npm install

# 3. Start development server
npm start
```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|----------|
| `AIRTABLE_API_KEY` | Airtable API token | ✅ Yes | `pat8WPqL2U9uHYBFh...` |
| `AIRTABLE_BASE_ID` | Your CRM base ID | ✅ Yes | `appy2LhAq03EfacUM` |
| `AIRTABLE_TABLE_NAME` | Table for results | ❌ No | `Script Results` |
| `WEBHOOK_URL` | Zapier webhook URL | ❌ No | `https://hooks.zapier.com/...` |
| `NODE_ENV` | Environment mode | ❌ No | `production` |
| `PORT` | Server port | ❌ No | `8080` |

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-service-url/
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Keap Billing Date Calculator with Airtable & Webhook Integration",
  "features": {
    "airtable": true,
    "webhook": true
  }
}
```

### 2. Functionality Test
```bash
curl -X POST https://your-service-url/calculate-billing-date \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "test123",
    "date": "2024-01-10",
    "delay": "5 days"
  }'
```

Expected response:
```json
{
  "success": true,
  "contactId": "test123",
  "calculatedDate": "2024-01-27",
  "integrations": {
    "airtable": {"success": true},
    "webhook": {"success": true}
  }
}
```

### 3. Verify Integrations

**Airtable:**
- Check Script Results table for new record
- Verify all fields populated correctly

**Zapier:**
- Check Zap history for webhook trigger
- Verify payload received correctly

## Troubleshooting

### Common Issues

**Build Failed:**
```bash
# Check build logs
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

**Missing Environment Variables:**
```bash
# Check current environment variables
gcloud run services describe keap-billing-calculator \
  --region us-central1 \
  --format="export" | grep env
```

**Airtable Connection Issues:**
- Verify API key has correct scopes
- Check base ID is correct
- Ensure table name matches exactly

**Webhook Not Triggering:**
- Verify webhook URL is correct
- Check Zapier webhook history
- Test webhook URL manually

### Logs and Monitoring

**View Cloud Run logs:**
```bash
gcloud logs read projects/YOUR_PROJECT_ID/logs/run.googleapis.com \
  --limit 50 \
  --format "table(timestamp,severity,textPayload)"
```

**Real-time log streaming:**
```bash
gcloud logs tail projects/YOUR_PROJECT_ID/logs/run.googleapis.com
```

## Security Considerations

1. **API Keys:**
   - Never commit API keys to version control
   - Use Google Secret Manager for production
   - Rotate keys regularly

2. **Access Control:**
   - Use `--no-allow-unauthenticated` for private services
   - Implement IP restrictions if needed
   - Monitor access logs

3. **Webhook Security:**
   - Use webhook secrets for authentication
   - Validate webhook payloads
   - Monitor for suspicious activity

## Current Deployment

**Live Service:** https://keap-billing-calculator-el2lyxjihq-uc.a.run.app
**Project:** claude-mcp-docs-466120
**Region:** us-central1
**Status:** ✅ Active and tested