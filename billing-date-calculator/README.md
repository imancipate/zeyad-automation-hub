# Keap Billing Date Calculator with Full Integration

A sophisticated microservice that calculates billing dates for Keap contacts with **complete closed-loop automation** including Airtable storage, Zapier webhooks, and **dynamic Keap goal triggering**.

## 🚀 Live Service

**Production URL:** `https://keap-billing-calculator-el2lyxjihq-uc.a.run.app`

## ✨ Features

- **🎯 Smart Date Calculation**: Finds next 15th or 27th of month with delay support
- **📊 Airtable Integration**: Stores all calculations in your CRM
- **🔗 Zapier Webhook**: Triggers external workflows automatically  
- **🎯 Dynamic Keap Goals**: User-defined goal IDs per request + environment defaults
- **☁️ Cloud-Native**: Deployed on Google Cloud Run with auto-scaling
- **🔒 Enterprise-Grade**: Full error handling, logging, and monitoring

## 🎯 Enhanced Goal Integration (NEW!)

### **Dynamic Goal IDs**
You can now specify goal IDs **per request**, giving you complete flexibility:

```json
{
  "contactId": "56702",
  "date": "2025-07-22", 
  "delay": "5 days",
  "keapSuccessGoalId": "123",
  "keapErrorGoalId": "456"
}
```

### **Priority System**
1. **Request-level goal IDs** (highest priority)
2. **Environment variable goal IDs** (fallback)
3. **Skip goal triggering** (if neither available)

### **Benefits**
- **Per-Campaign Flexibility**: Different campaigns can use different goals
- **A/B Testing**: Test different goal workflows easily
- **Multi-Tenant Support**: Different clients can use different goal configurations
- **Backward Compatibility**: Existing environment variable setup still works

## 📋 API Usage

### Enhanced Calculate Billing Date
```bash
POST /calculate-billing-date
```

**Basic Request:**
```json
{
  "contactId": "56702",
  "date": "2025-07-22", 
  "delay": "5 days"
}
```

**With Dynamic Goals:**
```json
{
  "contactId": "56702",
  "date": "2025-07-22", 
  "delay": "5 days",
  "keapSuccessGoalId": "789",
  "keapErrorGoalId": "101"
}
```

**Enhanced Response:**
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
      "goalId": "789",
      "source": "request"
    }
  }
}
```

### Other Endpoints
- `GET /` - Health check with dynamic goal support info
- `GET /keap-goals/health` - Goal integration status
- `POST /keap-goals/test` - Test goal triggering with dynamic IDs

## 🔧 Environment Variables

### Keap Integration
```bash
# Required for any goal integration
KEAP_API_TOKEN=your_keap_api_token

# Optional: Default goal IDs (fallback when not specified in request)
KEAP_SUCCESS_GOAL_ID=123
KEAP_ERROR_GOAL_ID=456
```

### Other Integrations
```bash
# Airtable Integration
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=appy2LhAq03EfacUM
AIRTABLE_TABLE_NAME=Script Results

# Zapier Integration
WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/112942/u2eqh2p/
```

## 🔑 Getting Keap API Credentials

### **Step 1: Get API Token**
1. Log into Keap admin dashboard
2. Navigate to **Admin** → **Settings** → **Application** → **API**
3. Generate new API key and save it securely

### **Step 2: Find Goal IDs**
1. Open your campaign in Campaign Builder
2. Add goals after your HTTP Post action
3. Note the goal IDs from the campaign builder URLs

**📚 [Complete Credential Guide →](docs/keap-api-credentials.md)**

## 🎯 Keap Campaign Setup

### **Option A: Environment Variables (Set & Forget)**
```bash
# Set once, works for all campaigns
KEAP_SUCCESS_GOAL_ID=123
KEAP_ERROR_GOAL_ID=456
```

### **Option B: Dynamic Goals (Maximum Flexibility)**
```json
{
  "contactId": "~Contact.Id~",
  "date": "~Contact.NextBillingDate~",
  "delay": "5 days",
  "keapSuccessGoalId": "789",
  "keapErrorGoalId": "101"
}
```

### **Campaign Flow**
```
Keap Campaign
    ↓
HTTP Post with Goal IDs
    ↓
Calculate Date + Store + Webhook
    ↓
Trigger Success/Error Goal
    ↓
Campaign Continues Based on Result
```

## 🧪 Testing

### **Test with Dynamic Goals**
```bash
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/calculate-billing-date \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "56702",
    "date": "2025-07-22",
    "delay": "5 days",
    "keapSuccessGoalId": "123",
    "keapErrorGoalId": "456"
  }'
```

### **Test Goal Integration**
```bash
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/keap-goals/test \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "56702", 
    "testSuccess": true,
    "keapSuccessGoalId": "123"
  }'
```

## 🚀 Deployment

### **Quick Deploy with Goals**
```bash
cd billing-date-calculator/deployment
chmod +x deploy-with-goals.sh
./deploy-with-goals.sh
```

### **Manual Update**
```bash
gcloud run services update keap-billing-calculator \
  --region=us-central1 \
  --set-env-vars="KEAP_API_TOKEN=your_token"
```

## 📊 Current Integrations

### ✅ Airtable CRM
- **Base ID**: `appy2LhAq03EfacUM`
- **Table**: Script Results
- **Purpose**: Store all calculation records

### ✅ Zapier Webhook  
- **URL**: `https://hooks.zapier.com/hooks/catch/112942/u2eqh2p/`
- **Purpose**: Trigger external workflows

### ✅ Dynamic Keap Goals (NEW)
- **Request-Level**: Specify per request for maximum flexibility
- **Environment-Level**: Set defaults for all campaigns
- **Purpose**: Complete closed-loop automation

## 🏗️ Enhanced Architecture

```
Keap Campaign (with Goal IDs)
    ↓
Google Cloud Run Service
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   Calculate     │   Store in      │   Trigger       │
│   Billing Date  │   Airtable      │   Webhook       │
└─────────────────┴─────────────────┴─────────────────┘
    ↓
Dynamic Goal Selection (Request > Environment > Skip)
    ↓
Trigger Success/Error Goal in Keap
    ↓
Campaign Continues Based on Result
```

## 💡 Use Cases for Dynamic Goals

### **Multi-Campaign Setup**
```json
// Campaign A: New customer onboarding
{
  "keapSuccessGoalId": "100",  // → Welcome sequence
  "keapErrorGoalId": "101"     // → Manual review
}

// Campaign B: Existing customer billing
{
  "keapSuccessGoalId": "200",  // → Billing confirmation  
  "keapErrorGoalId": "201"     // → Billing support
}
```

### **A/B Testing**
```json
// Test different success workflows
{
  "keapSuccessGoalId": Math.random() > 0.5 ? "300" : "301",
  "keapErrorGoalId": "302"
}
```

### **Client-Specific Goals**
```json
// Different clients, different workflows
{
  "keapSuccessGoalId": clientConfig.successGoalId,
  "keapErrorGoalId": clientConfig.errorGoalId
}
```

## 📚 Documentation

- **[Dynamic Goals Guide](docs/keap-goal-integration.md)**: Complete setup instructions
- **[API Credentials Guide](docs/keap-api-credentials.md)**: How to get Keap API access
- **[API Reference](docs/api-reference.md)**: Detailed API documentation

## 🎉 Why This Enhancement is Game-Changing

1. **Ultimate Flexibility**: Each request can have different goal configurations
2. **Zero Reconfiguration**: No need to redeploy for different campaigns
3. **Multi-Tenant Ready**: Perfect for agencies managing multiple clients
4. **A/B Test Friendly**: Easy to test different automation workflows
5. **Backward Compatible**: Existing setups continue to work seamlessly

This creates the **most flexible and powerful Keap integration possible** - complete automation with per-request customization! 🚀

---

**Version**: 2.1.0 with Dynamic Goal IDs  
**Status**: Production Ready ✅  
**Last Updated**: July 2025