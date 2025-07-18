# 🔑 How to Get Keap API Credentials

## Overview

To use the goal integration features, you need to obtain API credentials from Keap (formerly Infusionsoft). This guide walks you through the complete process.

---

## 🎯 Step 1: Get Your Keap API Token

### **Method 1: Legacy API Key (Recommended for Simple Use)**

1. **Log into Keap**
   - Go to your Keap admin dashboard
   - Navigate to **Admin** → **Settings**

2. **Access API Settings**
   - Click on **Application** tab
   - Look for **API** section or **Legacy API Key**

3. **Generate API Key**
   - Click **Generate New Key** or **Enable API Access**
   - Copy the generated key (it looks like: `abc123def456...`)
   - **Important**: Save this key securely - you won't see it again!

### **Method 2: OAuth 2.0 (For Advanced Integrations)**

1. **Create Developer Account**
   - Go to [Keap Developer Portal](https://keys.developer.infusionsoft.com/)
   - Sign up/log in with your Keap credentials

2. **Create New Application**
   - Click **Create New App**
   - Fill in application details:
     - **App Name**: "Billing Date Calculator"
     - **Description**: "Automated billing date calculation service"
     - **Redirect URI**: Your service URL (not critical for server-to-server)

3. **Get Credentials**
   - Note your **Client ID** and **Client Secret**
   - Follow OAuth flow to get access token

### **Which Method to Use?**
- **Legacy API Key**: Simpler, works immediately, perfect for this use case
- **OAuth 2.0**: More secure, required for public apps, handles token refresh

---

## 🎯 Step 2: Find Your Goal IDs

Goal IDs are specific to each campaign and goal within Keap. Here's how to find them:

### **Method 1: Campaign Builder (Easiest)**

1. **Open Campaign Builder**
   - Go to **Marketing** → **Campaigns**
   - Open or create your campaign

2. **Add/Edit Goals**
   - After your HTTP Post action, add a **Goal**
   - Configure the goal settings
   - **Save the goal**

3. **Find Goal ID**
   - Click on the goal to edit it
   - Look at the URL in your browser: 
     ```
     https://xx123.infusionsoft.com/app/campaign/goals/edit/12345
     ```
   - The number at the end (`12345`) is your Goal ID

### **Method 2: API Discovery**

You can also discover goal IDs using the Keap API:

```bash
# List all campaigns
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     "https://api.infusionsoft.com/crm/rest/v1/campaigns"

# Get campaign details (replace CAMPAIGN_ID)
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     "https://api.infusionsoft.com/crm/rest/v1/campaigns/CAMPAIGN_ID"
```

### **Setting Up Goals in Your Campaign**

For the billing calculator, you'll want **two goals**:

1. **Success Goal**: Triggered when calculation succeeds
   - Place after your HTTP Post action
   - Configure any success actions (update contact, send email, etc.)

2. **Error Goal**: Triggered when calculation fails  
   - Place as an alternative path from HTTP Post
   - Configure error handling (notify admin, retry, etc.)

---

## 🔧 Step 3: Test Your API Access

### **Test API Token**
```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     "https://api.infusionsoft.com/crm/rest/v1/account/profile"
```

**Expected Response:**
```json
{
  "business_goals": "...",
  "business_primary_color": "...",
  "business_secondary_color": "...",
  "business_type": "...",
  "name": "Your Business Name"
}
```

### **Test Goal Triggering**
```bash
curl -X POST "https://api.infusionsoft.com/crm/rest/v1/campaigns/goals" \
     -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "contact_id": 123,
       "goal_id": 456,
       "call_name": "test_goal"
     }'
```

---

## 🛠️ Step 4: Configure Your Service

### **Option A: Environment Variables (Default Goals)**
```bash
KEAP_API_TOKEN=your_api_token_here
KEAP_SUCCESS_GOAL_ID=123
KEAP_ERROR_GOAL_ID=456
```

### **Option B: Dynamic Goals (Per Request)**
```json
{
  "contactId": "56702",
  "date": "2025-07-22",
  "delay": "5 days",
  "keapSuccessGoalId": "789",
  "keapErrorGoalId": "101"
}
```

### **Priority System**
1. **Request-level goal IDs** (highest priority)
2. **Environment variable goal IDs** (fallback)
3. **Skip goal triggering** (if neither available)

---

## 🔍 Common Issues & Solutions

### **"Authorization Failed" Error**
- **Issue**: API token is invalid or expired
- **Solution**: Regenerate API token in Keap admin panel

### **"Goal Not Found" Error**
- **Issue**: Goal ID doesn't exist or belongs to different campaign
- **Solution**: Double-check goal ID in campaign builder

### **"Contact Not Found" Error**
- **Issue**: Contact ID doesn't exist in Keap
- **Solution**: Verify contact exists and ID is correct

### **Rate Limiting**
- **Issue**: Too many API calls
- **Solution**: Keap allows ~1000 requests/hour, implement retry logic

---

## 🎯 Best Practices

### **Security**
1. **Never commit API tokens** to version control
2. **Use environment variables** in production
3. **Rotate tokens regularly**
4. **Monitor API usage** in Keap admin

### **Goal Management**
1. **Use descriptive goal names** in campaigns
2. **Document goal IDs** for your team
3. **Test goals** in sandbox campaigns first
4. **Set up proper error handling** workflows

### **Integration Testing**
1. **Test with real contact IDs** from your Keap account
2. **Verify goal triggering** in campaign history
3. **Monitor API response codes** and error messages
4. **Set up logging** for debugging

---

## 📞 Getting Help

### **Keap Resources**
- [Keap API Documentation](https://developer.infusionsoft.com/docs/)
- [Keap Support](https://help.keap.com/)
- [Developer Community](https://community.keap.com/)

### **Service Testing**
Use our built-in test endpoints:
```bash
# Test API connection
curl https://your-service-url/keap-goals/health

# Test goal triggering
curl -X POST https://your-service-url/keap-goals/test \
     -H "Content-Type: application/json" \
     -d '{"contactId": "123", "keapSuccessGoalId": "456"}'
```

---

## 🎉 You're Ready!

Once you have:
- ✅ **API Token**: From Keap admin panel
- ✅ **Goal IDs**: From your campaign builder
- ✅ **Test Success**: API calls working

You can deploy and use the complete closed-loop automation system! 🚀