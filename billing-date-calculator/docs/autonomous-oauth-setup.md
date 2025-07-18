# 🚀 **AUTONOMOUS OAUTH SETUP - READY TO DEPLOY**

## What I Need From You

You mentioned you have:
- ✅ **App ID** 
- ✅ **Client ID**
- ✅ **Client Secret**

Perfect! Here's exactly what to do next:

---

## 🔧 **Step 1: Set Environment Variables**

Update your Google Cloud Run service with these environment variables:

```bash
# OAuth Credentials (REQUIRED)
KEAP_CLIENT_ID=your_client_id_here
KEAP_CLIENT_SECRET=your_client_secret_here
KEAP_REDIRECT_URI=https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback

# Existing Variables (KEEP THESE)
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=appy2LhAq03EfacUM
AIRTABLE_TABLE_NAME=Script Results
WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/112942/u2eqh2p/

# Optional: Default Goal IDs
KEAP_SUCCESS_GOAL_ID=123
KEAP_ERROR_GOAL_ID=456
```

**Deploy Command:**
```bash
gcloud run services update keap-billing-calculator \
  --region=us-central1 \
  --set-env-vars="KEAP_CLIENT_ID=your_client_id,KEAP_CLIENT_SECRET=your_client_secret,KEAP_REDIRECT_URI=https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback"
```

---

## 🔐 **Step 2: Get OAuth Tokens (ONE-TIME SETUP)**

After deploying, do this **once** to get your OAuth tokens:

### **Method A: Automatic (Recommended)**
1. Visit: `https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/authorize`
2. Log into Keap and authorize your app
3. Copy the `access_token` and `refresh_token` from the response
4. Add them as environment variables:

```bash
gcloud run services update keap-billing-calculator \
  --region=us-central1 \
  --set-env-vars="KEAP_ACCESS_TOKEN=your_access_token,KEAP_REFRESH_TOKEN=your_refresh_token"
```

### **Method B: Manual**
1. Generate authorization URL:
   ```
   https://signin.infusionsoft.com/app/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback&response_type=code&scope=full
   ```
2. Visit URL, authorize, copy the `code` from redirect
3. Exchange for tokens:
   ```bash
   curl -X POST https://api.infusionsoft.com/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback&code=YOUR_AUTH_CODE"
   ```

---

## ✅ **Step 3: Verify Everything Works**

### **Test OAuth Status**
```bash
curl https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/status
```

### **Test Complete Integration**
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

---

## 🤖 **What Happens Now (AUTONOMOUS OPERATION)**

Once set up, your service will:

✅ **Automatically refresh OAuth tokens** when they expire (every 24 hours)
✅ **Never require manual intervention** 
✅ **Gracefully handle token expiration**
✅ **Fall back to retry with fresh tokens**
✅ **Log all token refresh activities**
✅ **Continue working 24/7 without interruption**

### **Smart Token Management:**
- **5 minutes before expiry**: Automatically refresh
- **API call fails with 401**: Immediately refresh and retry
- **Refresh fails**: Log error and attempt on next call
- **All operations are transparent** to your Keap campaigns

---

## 📊 **Monitoring Your OAuth Integration**

### **Check Token Status Anytime:**
```bash
curl https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/status
```

### **Manual Token Refresh (if needed):**
```bash
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/refresh
```

### **View Logs:**
```bash
gcloud logs read "resource.type=cloud_run_revision" \
  --filter="resource.labels.service_name=keap-billing-calculator" \
  --limit=50
```

**Look for log entries like:**
- `"Refreshing OAuth access token..."`
- `"OAuth token refreshed successfully"`
- `"Access token invalid, attempting refresh..."`

---

## 🎯 **Final Environment Variables Summary**

Here's what your complete environment should look like:

```bash
# OAuth 2.0 (REQUIRED)
KEAP_CLIENT_ID=your_client_id_here
KEAP_CLIENT_SECRET=your_client_secret_here  
KEAP_REDIRECT_URI=https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback
KEAP_ACCESS_TOKEN=oauth_access_token_here
KEAP_REFRESH_TOKEN=oauth_refresh_token_here

# Other Integrations
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=appy2LhAq03EfacUM
AIRTABLE_TABLE_NAME=Script Results
WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/112942/u2eqh2p/

# Optional: Default Goals
KEAP_SUCCESS_GOAL_ID=123
KEAP_ERROR_GOAL_ID=456
```

---

## 🎉 **YOU'RE READY!**

Once you provide your **Client ID** and **Client Secret**, I can:
1. ✅ Deploy the enhanced OAuth service
2. ✅ Walk you through the one-time token setup
3. ✅ Verify autonomous operation
4. ✅ Test the complete integration

This will give you **100% autonomous operation** with **automatic token refresh** and **zero manual intervention required**! 🚀

**What are your Client ID and Client Secret?**