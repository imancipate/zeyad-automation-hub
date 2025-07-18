# Keap Billing Date Calculator with Full Integration

A sophisticated microservice that calculates billing dates for Keap contacts with **complete closed-loop automation** including Airtable storage, Zapier webhooks, and **Keap goal triggering**.

## 🚀 Live Service

**Production URL:** `https://keap-billing-calculator-el2lyxjihq-uc.a.run.app`

## ✨ Features

- **🎯 Smart Date Calculation**: Finds next 15th or 27th of month with delay support
- **📊 Airtable Integration**: Stores all calculations in your CRM
- **🔗 Zapier Webhook**: Triggers external workflows automatically  
- **🎯 Keap Goal Integration**: Complete closed-loop automation within Keap campaigns
- **☁️ Cloud-Native**: Deployed on Google Cloud Run with auto-scaling
- **🔒 Enterprise-Grade**: Full error handling, logging, and monitoring

## 🎯 Keap Goal Integration (NEW!)

The service now includes **complete closed-loop automation** with Keap:

```
Keap Campaign → HTTP Post → Calculate Date → Trigger Success/Error Goal → Campaign Continues
```

### Benefits:
- **Zero Manual Intervention**: Fully automated workflow
- **Smart Error Handling**: Different goals for success/failure scenarios  
- **Campaign Continuity**: Seamless integration within Keap's ecosystem
- **Monitoring & Visibility**: Full tracking of each automation step

## 📋 API Usage

### Calculate Billing Date
```bash
POST /calculate-billing-date
```

```json
{
  "contactId": "56702",
  "date": "2025-07-22", 
  "delay": "5 days"
}
```

**Response:**
```json
{
  "success": true,
  "contactId": "56702",
  "calculatedDate": "2025-08-15",
  "dayOfMonth": 15,
  "integrations": {
    "airtable": { "attempted": true, "success": true },
    "webhook": { "attempted": true, "success": true },
    "keapGoal": { 
      "attempted": true, 
      "success": true,
      "goalType": "success",
      "goalId": "123"
    }
  }
}
```

### Health Check
```bash
GET /
```

### Keap Goals Health
```bash
GET /keap-goals/health
```

### Test Goal Triggering
```bash
POST /keap-goals/test
{
  "contactId": "56702",
  "testSuccess": true
}
```

## 🔧 Environment Variables

### Required for Full Integration
```bash
# Keap Goal Integration (NEW)
KEAP_API_TOKEN=your_keap_api_token
KEAP_SUCCESS_GOAL_ID=123
KEAP_ERROR_GOAL_ID=456

# Airtable Integration
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=appy2LhAq03EfacUM
AIRTABLE_TABLE_NAME=Script Results

# Zapier Integration
WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/112942/u2eqh2p/
```

## 🚀 Quick Deployment

### Option 1: Use Deployment Script
```bash
cd billing-date-calculator/deployment
chmod +x deploy-with-goals.sh
./deploy-with-goals.sh
```

### Option 2: Manual Deployment
```bash
gcloud run deploy keap-billing-calculator \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="KEAP_API_TOKEN=your_token,KEAP_SUCCESS_GOAL_ID=123,KEAP_ERROR_GOAL_ID=456"
```

## 🎯 Keap Campaign Setup

### Campaign Flow
1. **Trigger**: Contact enters campaign
2. **HTTP Post**: Call your service
   ```
   URL: https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/calculate-billing-date
   Body: {
     "contactId": "~Contact.Id~",
     "date": "~Contact.NextBillingDate~", 
     "delay": "5 days"
   }
   ```
3. **Success Goal**: Automatically triggered on successful calculation
4. **Error Goal**: Automatically triggered on failure
5. **Success Actions**: Update contact, send email, etc.
6. **Error Actions**: Notify admin, retry, etc.

## 🧪 Testing

### Test Complete Flow
```bash
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/calculate-billing-date \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "56702",
    "date": "2025-07-22",
    "delay": "5 days"
  }'
```

### Test Goal Integration Only
```bash
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/keap-goals/test \
  -H "Content-Type: application/json" \
  -d '{"contactId": "56702", "testSuccess": true}'
```

## 📊 Current Integrations

### ✅ Airtable CRM
- **Base ID**: `appy2LhAq03EfacUM`
- **Table**: Script Results
- **Purpose**: Store all calculation records

### ✅ Zapier Webhook  
- **URL**: `https://hooks.zapier.com/hooks/catch/112942/u2eqh2p/`
- **Purpose**: Trigger external workflows

### ✅ Keap Goals (NEW)
- **Success Goal**: Triggered on successful calculations
- **Error Goal**: Triggered on failures
- **Purpose**: Complete closed-loop automation

## 🏗️ Architecture

```
Keap Campaign
    ↓
Google Cloud Run Service
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   Calculate     │   Store in      │   Trigger       │
│   Billing Date  │   Airtable      │   Webhook       │
└─────────────────┴─────────────────┴─────────────────┘
    ↓
Trigger Keap Goal (Success/Error)
    ↓
Campaign Continues Based on Result
```

## 📚 Documentation

- **[Keap Goal Integration Guide](docs/keap-goal-integration.md)**: Complete setup instructions
- **[API Reference](docs/api-reference.md)**: Detailed API documentation
- **[Deployment Guide](docs/deployment.md)**: Cloud deployment instructions

## 🔍 Monitoring

### Google Cloud Logs
```bash
gcloud logs read "resource.type=cloud_run_revision" \
  --filter="resource.labels.service_name=keap-billing-calculator" \
  --limit=50
```

### Key Metrics
- **Calculation Success Rate**: Monitor via Airtable records
- **Goal Triggering**: Monitor via Cloud Run logs
- **Response Times**: Monitor via Google Cloud Console

## 🛠️ Advanced Features

### Skip Specific Integrations
```json
{
  "contactId": "56702",
  "date": "2025-07-22",
  "skipKeapGoals": true,    // Skip goal triggering
  "skipAirtable": false,    // Still use Airtable  
  "skipWebhook": false      // Still use webhook
}
```

### Error Handling
- **Smart Goal Selection**: Success vs error goals based on calculation result
- **Integration Resilience**: Individual integration failures don't break the flow
- **Detailed Logging**: Complete visibility into each step

## 🎉 Why This Integration is Revolutionary

1. **Complete Automation**: No manual steps required anywhere
2. **Keap-Native**: Works seamlessly within Keap's campaign system
3. **Error-Aware**: Automatically handles and routes errors
4. **Scalable**: Cloud-native architecture handles any volume
5. **Extensible**: Easy to add more integrations and features

This creates the **most sophisticated Keap integration ever built** - completely seamless automation within Keap's ecosystem! 🚀

## 📞 Support

For questions or issues:
1. Check the [documentation](docs/)
2. Review Cloud Run logs
3. Test individual components using the provided endpoints

---

**Version**: 2.0.0 with Keap Goal Integration  
**Status**: Production Ready ✅  
**Last Updated**: July 2025