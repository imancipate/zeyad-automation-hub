# Keap Goal Integration Guide

## Overview

The enhanced Keap Billing Date Calculator now includes **complete closed-loop automation** with Keap goal triggering. This integration allows your campaigns to automatically continue based on calculation success or failure.

## 🎯 How It Works

```
Keap Campaign → HTTP Post → Calculate Date → Trigger Success/Error Goal → Campaign Continues
```

## ⚙️ Environment Variables

Add these new environment variables to your Google Cloud Run service:

### Required for Goal Integration
```bash
KEAP_API_TOKEN=your_keap_api_token_here
KEAP_SUCCESS_GOAL_ID=123  # Goal ID to trigger on successful calculation
KEAP_ERROR_GOAL_ID=456    # Goal ID to trigger on calculation failure
```

### Existing Variables (keep these)
```bash
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_TABLE_NAME=Script Results
WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/112942/u2eqh2p/
```

## 🔧 Setting Up Keap API Access

### 1. Get Your Keap API Token
1. Log into your Keap account
2. Go to Admin → Settings → Application Settings
3. Click on "API" tab
4. Generate a new API token
5. Copy the token (keep it secure!)

### 2. Find Your Goal IDs
1. In Keap Campaign Builder, create or edit a campaign
2. Add HTTP Post action that calls your service
3. Add **two goals** after the HTTP Post:
   - **Success Goal**: For successful calculations
   - **Error Goal**: For failed calculations
4. Note the Goal IDs (visible in the goal settings)

## 📊 Enhanced Response Format

The API now returns detailed goal triggering information:

```json
{
  "success": true,
  "contactId": "56702",
  "calculatedDate": "2025-08-15",
  "integrations": {
    "airtable": { "attempted": true, "success": true },
    "webhook": { "attempted": true, "success": true },
    "keapGoal": {
      "attempted": true,
      "success": true,
      "goalType": "success",
      "goalId": "123",
      "response": { "goal_triggered": true }
    }
  }
}
```

## 🚀 Deployment Commands

### Update Google Cloud Run Service
```bash
# Set environment variables
gcloud run services update keap-billing-calculator \
  --region=us-central1 \
  --set-env-vars="KEAP_API_TOKEN=your_token_here,KEAP_SUCCESS_GOAL_ID=123,KEAP_ERROR_GOAL_ID=456"

# Or deploy new version
gcloud run deploy keap-billing-calculator \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="KEAP_API_TOKEN=your_token,KEAP_SUCCESS_GOAL_ID=123,KEAP_ERROR_GOAL_ID=456"
```

## 🧪 Testing the Integration

### 1. Test Goal Health
```bash
curl https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/keap-goals/health
```

### 2. Test Goal Triggering
```bash
# Test success goal
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/keap-goals/test \
  -H "Content-Type: application/json" \
  -d '{"contactId": "56702", "testSuccess": true}'

# Test error goal  
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/keap-goals/test \
  -H "Content-Type: application/json" \
  -d '{"contactId": "56702", "testSuccess": false}'
```

### 3. Full Integration Test
```bash
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/calculate-billing-date \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "56702",
    "date": "2025-07-22",
    "delay": "5 days"
  }'
```

## 🎯 Campaign Setup in Keap

### Complete Campaign Flow
1. **Trigger**: Contact enters campaign
2. **HTTP Post**: Call your service with contact data
   ```
   POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/calculate-billing-date
   {
     "contactId": "~Contact.Id~",
     "date": "~Contact.NextBillingDate~",
     "delay": "5 days"
   }
   ```
3. **Success Goal**: Triggered automatically on successful calculation
4. **Error Goal**: Triggered automatically on calculation failure
5. **Success Actions**: Update contact fields, send confirmation email, etc.
6. **Error Actions**: Notify admin, retry later, etc.

## 🔄 Error Handling & Smart Goal Triggering

The system intelligently determines when to trigger success vs error goals:

- **Success Goal**: Triggered when calculation succeeds AND all integrations work
- **Error Goal**: Triggered when:
  - Calculation fails
  - Critical integration failures occur
  - API errors happen

## 📈 Monitoring & Logging

### Cloud Run Logs
```bash
gcloud logs read "resource.type=cloud_run_revision" \
  --filter="resource.labels.service_name=keap-billing-calculator" \
  --limit=50
```

### Goal Triggering Events
Look for these log entries:
- `Triggering Keap success goal X for contact Y`
- `Successfully triggered Keap success goal for contact Y`
- `Error triggering Keap error goal: [details]`

## 🛠️ Advanced Configuration

### Skip Specific Integrations
```json
{
  "contactId": "56702",
  "date": "2025-07-22",
  "delay": "5 days",
  "skipKeapGoals": true,    // Skip goal triggering
  "skipAirtable": false,    // Still use Airtable
  "skipWebhook": false      // Still use webhook
}
```

### Multiple Goal Scenarios
You can set up different goals for different scenarios:
- `KEAP_SUCCESS_GOAL_ID`: Normal success
- `KEAP_ERROR_GOAL_ID`: Any failure
- Add more environment variables for specific error types

## 🔐 Security Best Practices

1. **API Token Security**: Never commit tokens to git
2. **Environment Variables**: Set via Google Cloud Console
3. **Goal ID Validation**: Ensure goal IDs belong to your account
4. **Rate Limiting**: Keap API has rate limits, monitor usage

## 📋 Troubleshooting

### Common Issues

**Goal not triggering:**
- Check API token validity
- Verify goal ID exists and is active
- Ensure contact ID is valid in Keap

**API errors:**
- Check Cloud Run logs for detailed error messages
- Verify all environment variables are set
- Test with `/keap-goals/health` endpoint

**Integration failures:**
- Airtable/webhook failures won't stop goal triggering
- Check specific integration error messages in response

## 🎉 Benefits of This Integration

1. **Complete Automation**: No manual intervention needed
2. **Error Handling**: Automatic error workflows in Keap
3. **Monitoring**: Full visibility into each step
4. **Flexibility**: Can skip any integration as needed
5. **Scalability**: Handles multiple contacts simultaneously
6. **Reliability**: Robust error handling and logging

This creates the **most sophisticated Keap integration possible** - completely seamless automation within Keap's ecosystem! 🚀