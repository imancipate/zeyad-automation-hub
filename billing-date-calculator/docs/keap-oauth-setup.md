# 🔐 Keap OAuth 2.0 Integration Guide

## Overview

This guide covers setting up OAuth 2.0 authentication with Keap, which is the **recommended and future-proof** authentication method for Keap API integrations.

---

## 🎯 **Why OAuth 2.0?**

- ✅ **Future-Proof**: Keap is deprecating legacy API keys
- ✅ **More Secure**: Scoped permissions and token rotation
- ✅ **Industry Standard**: Modern authentication approach
- ✅ **Automatic Refresh**: Tokens can be refreshed automatically

---

## 🚀 **Step 1: Create Keap Developer Application**

### **Access Developer Portal**
1. Go to [Keap Developer Portal](https://keys.developer.infusionsoft.com/)
2. Sign in with your Keap account credentials
3. Click **"Create New App"**

### **Application Configuration**
```
App Name: Billing Date Calculator
Description: Automated billing date calculation service
Website URL: https://your-domain.com (optional)
Redirect URI: https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback
```

### **Save Your Credentials**
After creating the app, you'll get:
- **Client ID**: `abc123def456` (public identifier)
- **Client Secret**: `xyz789secret` (keep this secure!)

---

## 🔑 **Step 2: OAuth Token Generation Methods**

### **Method A: Manual Token Generation (Quick Start)**

#### **1. Generate Authorization URL**
```
https://signin.infusionsoft.com/app/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback&response_type=code&scope=full
```

#### **2. Authorize Application**
1. Visit the URL in your browser
2. Log into Keap if prompted
3. Click **"Authorize"** to grant permissions
4. You'll be redirected to your callback URL with a `code` parameter

#### **3. Extract Authorization Code**
From the redirect URL:
```
https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback?code=AUTH_CODE_HERE
```
Copy the `AUTH_CODE_HERE` value.

#### **4. Exchange Code for Token**
```bash
curl -X POST https://api.infusionsoft.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback&code=YOUR_AUTH_CODE"
```

#### **5. Response Format**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "refresh_token": "def789refresh456...",
  "scope": "full"
}
```

### **Method B: Automated OAuth Flow (Recommended)**

The service now includes OAuth endpoints for automated token management.

---

## 🔧 **Step 3: Environment Variables**

### **OAuth Configuration**
```bash
# OAuth Credentials
KEAP_CLIENT_ID=your_client_id_here
KEAP_CLIENT_SECRET=your_client_secret_here
KEAP_REDIRECT_URI=https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/callback

# OAuth Tokens (obtained from OAuth flow)
KEAP_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6...
KEAP_REFRESH_TOKEN=def789refresh456...

# Goal Configuration
KEAP_SUCCESS_GOAL_ID=123  # Optional: default success goal
KEAP_ERROR_GOAL_ID=456    # Optional: default error goal

# Other Integrations
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=your_base_id
WEBHOOK_URL=your_webhook_url
```

### **Backward Compatibility**
```bash
# Legacy API Key (still supported for now)
KEAP_API_TOKEN=your_legacy_key_here
```

**Priority Order:**
1. OAuth Access Token (preferred)
2. Legacy API Token (fallback)

---

## 🧪 **Step 4: Testing OAuth Integration**

### **Test OAuth Token**
```bash
curl -H "Authorization: Bearer YOUR_OAUTH_ACCESS_TOKEN" \
     "https://api.infusionsoft.com/crm/rest/v1/account/profile"
```

### **Test Service with OAuth**
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

### **Check OAuth Status**
```bash
curl https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/status
```

---

## 🔄 **Step 5: Token Refresh (Automatic)**

OAuth tokens expire (typically 24 hours). The service automatically handles refresh:

### **Manual Refresh (if needed)**
```bash
curl -X POST https://api.infusionsoft.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=YOUR_REFRESH_TOKEN&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

### **Automatic Refresh**
The service detects expired tokens and refreshes automatically using the stored refresh token.

---

## 🛠️ **Step 6: OAuth Endpoints (Enhanced Service)**

### **OAuth Authorization**
```
GET /oauth/authorize
```
Redirects to Keap authorization page.

### **OAuth Callback**
```
GET /oauth/callback?code=...
```
Handles authorization code exchange.

### **OAuth Status**
```
GET /oauth/status
```
Shows current OAuth token status.

### **Manual Token Refresh**
```
POST /oauth/refresh
```
Manually refresh the access token.

---

## 🔐 **Security Best Practices**

### **Client Secret Protection**
- ❌ **Never expose** client secret in frontend code
- ✅ **Store securely** in environment variables
- ✅ **Rotate regularly** if compromised

### **Token Management**
- ✅ **Use HTTPS** for all OAuth flows
- ✅ **Store tokens securely** (environment variables)
- ✅ **Monitor token expiration**
- ✅ **Implement refresh logic**

### **Scope Management**
- ✅ **Request minimal scopes** needed for your use case
- ✅ **Use 'full' scope** for comprehensive automation
- ✅ **Document required permissions**

---

## 🎯 **OAuth Scopes for Billing Calculator**

### **Recommended Scope**
```
scope=full
```

This provides access to:
- ✅ Contact management
- ✅ Campaign goal triggering
- ✅ Account information
- ✅ All automation features

### **Alternative Scopes (if needed)**
```
scope=campaigns.goals campaigns.write contacts.read
```

---

## 🚨 **Migration from Legacy API Key**

### **Transition Plan**
1. **Setup OAuth** following this guide
2. **Test OAuth integration** alongside legacy key
3. **Update environment variables** to use OAuth
4. **Remove legacy API key** once OAuth is confirmed working

### **Dual Authentication Support**
The service supports both during transition:
```bash
# Primary: OAuth (preferred)
KEAP_ACCESS_TOKEN=oauth_token_here
KEAP_REFRESH_TOKEN=refresh_token_here

# Fallback: Legacy (during transition)
KEAP_API_TOKEN=legacy_token_here
```

---

## 📋 **Troubleshooting**

### **Common Issues**

#### **"Invalid Client" Error**
- **Issue**: Client ID or Secret incorrect
- **Solution**: Verify credentials from developer portal

#### **"Invalid Grant" Error**
- **Issue**: Authorization code expired or already used
- **Solution**: Generate new authorization code

#### **"Invalid Scope" Error**
- **Issue**: Requested scope not available
- **Solution**: Use 'full' scope or check available scopes

#### **Token Expired**
- **Issue**: Access token expired (24 hours)
- **Solution**: Use refresh token to get new access token

### **Debug Commands**

#### **Check Token Validity**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.infusionsoft.com/crm/rest/v1/account/profile"
```

#### **Test Goal Triggering**
```bash
curl -X POST "https://api.infusionsoft.com/crm/rest/v1/campaigns/goals" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"contact_id": 123, "goal_id": 456, "call_name": "test"}'
```

---

## 🎉 **Benefits of OAuth Implementation**

### **For You**
1. **Future-Proof**: Won't be deprecated like legacy keys
2. **Enhanced Security**: Token rotation and scoped permissions
3. **Better Monitoring**: Detailed API usage tracking
4. **Compliance Ready**: Meets modern security standards

### **For Your Service**
1. **Automatic Refresh**: No manual token management
2. **Error Resilience**: Graceful handling of expired tokens
3. **Audit Trail**: Complete OAuth activity logging
4. **Scalability**: Ready for multi-tenant scenarios

---

## 📞 **Getting Help**

### **Keap Resources**
- [OAuth 2.0 Documentation](https://developer.infusionsoft.com/authentication/)
- [API Reference](https://developer.infusionsoft.com/docs/)
- [Developer Support](https://community.keap.com/)

### **Service Testing**
```bash
# Test OAuth status
curl https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/oauth/status

# Test service health
curl https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/keap-goals/health
```

**You're now ready for future-proof Keap integration!** 🚀