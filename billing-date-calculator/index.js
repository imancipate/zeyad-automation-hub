const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// In-memory token storage (in production, use secure storage)
let currentTokens = {
  access_token: process.env.KEAP_ACCESS_TOKEN,
  refresh_token: process.env.KEAP_REFRESH_TOKEN,
  expires_at: null
};

function findNextTargetDate(startDate, delayDays = 0, delayMonths = 0) {
  const adjustedDate = new Date(startDate);
  adjustedDate.setDate(adjustedDate.getDate() + delayDays);
  adjustedDate.setMonth(adjustedDate.getMonth() + delayMonths);
  
  const current = new Date(adjustedDate);
  const currentDay = current.getDate();
  const currentMonth = current.getMonth();
  const currentYear = current.getFullYear();
  
  const fifteenthThisMonth = new Date(currentYear, currentMonth, 15);
  if (fifteenthThisMonth > current) {
    return fifteenthThisMonth;
  }
  
  const twentySeventhThisMonth = new Date(currentYear, currentMonth, 27);
  if (twentySeventhThisMonth > current) {
    return twentySeventhThisMonth;
  }
  
  const nextMonth = currentMonth + 1;
  const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
  const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
  
  const fifteenthNextMonth = new Date(nextYear, adjustedNextMonth, 15);
  return fifteenthNextMonth;
}

function parseDelay(delayStr) {
  let days = 0;
  let months = 0;
  
  if (!delayStr) return { days, months };
  
  const dayMatch = delayStr.match(/(\d+)\s*days?/i);
  const monthMatch = delayStr.match(/(\d+)\s*months?/i);
  
  if (dayMatch) {
    days = parseInt(dayMatch[1]);
  }
  
  if (monthMatch) {
    months = parseInt(monthMatch[1]);
  }
  
  return { days, months };
}

/**
 * Refreshes OAuth access token using refresh token
 */
async function refreshOAuthToken() {
  const KEAP_CLIENT_ID = process.env.KEAP_CLIENT_ID;
  const KEAP_CLIENT_SECRET = process.env.KEAP_CLIENT_SECRET;
  
  if (!currentTokens.refresh_token || !KEAP_CLIENT_ID || !KEAP_CLIENT_SECRET) {
    throw new Error('Missing OAuth credentials for token refresh');
  }
  
  try {
    console.log('Refreshing OAuth access token...');
    
    const response = await fetch('https://api.infusionsoft.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentTokens.refresh_token,
        client_id: KEAP_CLIENT_ID,
        client_secret: KEAP_CLIENT_SECRET
      })
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }
    
    const tokenData = await response.json();
    
    // Update current tokens
    currentTokens.access_token = tokenData.access_token;
    if (tokenData.refresh_token) {
      currentTokens.refresh_token = tokenData.refresh_token;
    }
    currentTokens.expires_at = Date.now() + (tokenData.expires_in * 1000);
    
    console.log('OAuth token refreshed successfully');
    return tokenData;
    
  } catch (error) {
    console.error('Error refreshing OAuth token:', error);
    throw error;
  }
}

/**
 * Gets a valid access token, refreshing if necessary
 */
async function getValidAccessToken() {
  // Check if we have OAuth tokens
  if (currentTokens.access_token) {
    // Check if token is expired (refresh 5 minutes before expiry)
    if (currentTokens.expires_at && (Date.now() + 300000) >= currentTokens.expires_at) {
      try {
        await refreshOAuthToken();
      } catch (error) {
        console.error('Failed to refresh token, falling back to legacy API key');
        return process.env.KEAP_API_TOKEN;
      }
    }
    return currentTokens.access_token;
  }
  
  // Fallback to legacy API token
  return process.env.KEAP_API_TOKEN;
}

/**
 * REVOLUTIONARY: Discovers Goal ID by call name and integration
 * This is what humans fucking expect to work!
 */
async function discoverGoalIdByCallName(callName, integration = 'billing-date-calculator') {
  const accessToken = await getValidAccessToken();
  
  if (!accessToken) {
    throw new Error('No access token available for goal discovery');
  }
  
  try {
    console.log(`🔍 Discovering Goal ID for call_name: "${callName}" with integration: "${integration}"`);
    
    // Query Keap's campaigns API to find goals
    const response = await fetch('https://api.infusionsoft.com/crm/rest/v1/campaigns', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns: ${response.status} ${response.statusText}`);
    }
    
    const campaigns = await response.json();
    
    // Search through all campaigns for matching goals
    for (const campaign of campaigns.campaigns || []) {
      if (campaign.goals && campaign.goals.length > 0) {
        for (const goal of campaign.goals) {
          // Match by call_name and integration
          if (goal.call_name === callName && goal.integration === integration) {
            console.log(`✅ Found Goal ID ${goal.id} for "${callName}" in campaign "${campaign.name}"`);
            return {
              goalId: goal.id,
              campaignId: campaign.id,
              campaignName: campaign.name,
              goalName: goal.name || callName,
              discoveryMethod: 'api_search'
            };
          }
        }
      }
    }
    
    // If not found, return detailed error
    throw new Error(`Goal not found: No goal with call_name "${callName}" and integration "${integration}" exists in any active campaign`);
    
  } catch (error) {
    console.error(`❌ Goal discovery failed for "${callName}":`, error.message);
    throw error;
  }
}

/**
 * Enhanced goal triggering with automatic Goal ID discovery
 */
async function triggerKeapGoalByCallName(contactId, callName, goalType = 'success', integration = 'billing-date-calculator') {
  try {
    // Step 1: Discover the Goal ID
    const discoveryResult = await discoverGoalIdByCallName(callName, integration);
    const goalId = discoveryResult.goalId;
    
    console.log(`🎯 Triggering goal "${callName}" (ID: ${goalId}) for contact ${contactId}`);
    
    // Step 2: Trigger the goal using the discovered ID
    const result = await triggerKeapGoal(contactId, goalId, goalType);
    
    return {
      ...result,
      goalDiscovery: discoveryResult,
      callName: callName,
      integration: integration
    };
    
  } catch (error) {
    console.error(`Failed to trigger goal by call name "${callName}":`, error);
    throw error;
  }
}

/**
 * Original goal triggering function (still used internally)
 */
async function triggerKeapGoal(contactId, goalId, goalType = 'success') {
  const accessToken = await getValidAccessToken();
  
  if (!accessToken || !goalId) {
    console.log(`Keap goal triggering not configured for ${goalType} goal, skipping`);
    return null;
  }
  
  try {
    const payload = {
      contact_id: parseInt(contactId),
      goal_id: parseInt(goalId),
      call_name: `billing_calculator_${goalType}`,
      integration: 'billing-date-calculator'
    };
    
    console.log(`Triggering Keap ${goalType} goal ${goalId} for contact ${contactId}`);
    
    const response = await fetch('https://api.infusionsoft.com/crm/rest/v1/campaigns/goals', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // If token is invalid, try refreshing once
    if (response.status === 401 && currentTokens.refresh_token) {
      console.log('Access token invalid, attempting refresh...');
      await refreshOAuthToken();
      const newAccessToken = await getValidAccessToken();
      
      // Retry with new token
      const retryResponse = await fetch('https://api.infusionsoft.com/crm/rest/v1/campaigns/goals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newAccessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`Keap API error after token refresh (${retryResponse.status}): ${errorText}`);
      }
      
      const result = await retryResponse.json();
      console.log(`Successfully triggered Keap ${goalType} goal for contact ${contactId} (after token refresh)`);
      return result;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Keap API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`Successfully triggered Keap ${goalType} goal for contact ${contactId}`);
    return result;
    
  } catch (error) {
    console.error(`Error triggering Keap ${goalType} goal:`, error);
    throw error;
  }
}

/**
 * REVOLUTIONIZED: Goal handler that works the way humans expect
 * Accepts either Goal IDs (legacy) or Call Names (human-friendly)
 */
async function handleKeapGoals(contactId, isSuccess, errorDetails = null, goalConfig = {}) {
  const goalType = isSuccess ? 'success' : 'error';
  
  const goalResult = {
    attempted: false,
    success: false,
    goalType: goalType,
    method: 'unknown',
    source: 'unknown'
  };
  
  try {
    goalResult.attempted = true;
    
    // Option 1: Use human-friendly call names (PREFERRED)
    const callName = isSuccess ? goalConfig.successCallName : goalConfig.errorCallName;
    const integration = goalConfig.integration || 'billing-date-calculator';
    
    if (callName) {
      console.log(`🚀 Using human-friendly call name: "${callName}"`);
      const result = await triggerKeapGoalByCallName(contactId, callName, goalType, integration);
      goalResult.success = !!result;
      goalResult.method = 'call_name_discovery';
      goalResult.source = 'request';
      goalResult.callName = callName;
      goalResult.integration = integration;
      goalResult.goalDiscovery = result.goalDiscovery;
      goalResult.response = result;
      return goalResult;
    }
    
    // Option 2: Use legacy Goal IDs (FALLBACK)
    const goalId = isSuccess ? 
      (goalConfig.successGoalId || process.env.KEAP_SUCCESS_GOAL_ID) : 
      (goalConfig.errorGoalId || process.env.KEAP_ERROR_GOAL_ID);
    
    if (goalId) {
      console.log(`⚙️ Using legacy Goal ID: ${goalId}`);
      const result = await triggerKeapGoal(contactId, goalId, goalType);
      goalResult.success = !!result;
      goalResult.method = 'direct_goal_id';
      goalResult.source = goalConfig.successGoalId || goalConfig.errorGoalId ? 'request' : 'environment';
      goalResult.goalId = goalId;
      goalResult.response = result;
      return goalResult;
    }
    
    // Option 3: No goal configuration found
    goalResult.skipped = true;
    goalResult.reason = `No ${goalType} goal configured (neither call name nor goal ID provided)`;
    return goalResult;
    
  } catch (error) {
    goalResult.error = error.message;
    return goalResult;
  }
}

async function storeInAirtable(contactId, originalDate, calculatedDate, delay) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Script Results';
  const SCRIPT_NAME = 'Billing Date Calculator';
  
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('Airtable credentials not configured, skipping storage');
    return null;
  }
  
  try {
    const executionId = `billing_${contactId}_${Date.now()}`;
    
    const inputData = {
      date: originalDate,
      delay: delay.original
    };
    
    const outputData = {
      calculatedDate: calculatedDate,
      dayOfMonth: new Date(calculatedDate).getDate(),
      delay: delay
    };
    
    const recordData = {
      'Execution ID': executionId,
      'Script Name': SCRIPT_NAME,
      'Contact ID': contactId,
      'Status': 'Success',
      'Input Data': JSON.stringify(inputData),
      'Output Data': JSON.stringify(outputData),
      'Timestamp': new Date().toISOString(),
      'Calculated Billing Date': calculatedDate
    };
    
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{
          fields: recordData
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return { ...result, action: 'created' };
    
  } catch (error) {
    console.error('Error storing in Airtable:', error);
    throw error;
  }
}

async function sendToWebhook(contactId, calculatedDate, originalData) {
  const WEBHOOK_URL = process.env.WEBHOOK_URL;
  
  if (!WEBHOOK_URL) {
    console.log('No webhook URL configured, skipping webhook call');
    return null;
  }
  
  try {
    const webhookPayload = {
      contactId: contactId,
      calculatedBillingDate: calculatedDate,
      dayOfMonth: new Date(calculatedDate).getDate(),
      originalDate: originalData.originalDate,
      delay: originalData.delay,
      timestamp: new Date().toISOString(),
      source: 'billing-date-calculator'
    };
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling webhook:', error);
    throw error;
  }
}

/**
 * OAuth Authorization Endpoint - Start OAuth flow
 */
app.get('/oauth/authorize', (req, res) => {
  const KEAP_CLIENT_ID = process.env.KEAP_CLIENT_ID;
  const KEAP_REDIRECT_URI = process.env.KEAP_REDIRECT_URI || `${req.protocol}://${req.get('host')}/oauth/callback`;
  
  if (!KEAP_CLIENT_ID) {
    return res.status(400).json({
      error: 'OAuth not configured',
      message: 'KEAP_CLIENT_ID environment variable is required'
    });
  }
  
  const authUrl = new URL('https://signin.infusionsoft.com/app/oauth/authorize');
  authUrl.searchParams.set('client_id', KEAP_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', KEAP_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'full');
  
  res.redirect(authUrl.toString());
});

/**
 * OAuth Callback Endpoint - Handle authorization code exchange
 */
app.get('/oauth/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.status(400).json({
      error: 'OAuth authorization failed',
      details: error
    });
  }
  
  if (!code) {
    return res.status(400).json({
      error: 'Missing authorization code'
    });
  }
  
  const KEAP_CLIENT_ID = process.env.KEAP_CLIENT_ID;
  const KEAP_CLIENT_SECRET = process.env.KEAP_CLIENT_SECRET;
  const KEAP_REDIRECT_URI = process.env.KEAP_REDIRECT_URI || `${req.protocol}://${req.get('host')}/oauth/callback`;
  
  try {
    const response = await fetch('https://api.infusionsoft.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KEAP_CLIENT_ID,
        client_secret: KEAP_CLIENT_SECRET,
        redirect_uri: KEAP_REDIRECT_URI,
        code: code
      })
    });
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }
    
    const tokenData = await response.json();
    
    // Update current tokens
    currentTokens.access_token = tokenData.access_token;
    currentTokens.refresh_token = tokenData.refresh_token;
    currentTokens.expires_at = Date.now() + (tokenData.expires_in * 1000);
    
    console.log('OAuth tokens obtained successfully');
    
    res.json({
      success: true,
      message: 'OAuth authorization successful',
      token_info: {
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        expires_at: new Date(currentTokens.expires_at).toISOString()
      },
      next_steps: [
        'Set KEAP_ACCESS_TOKEN environment variable to: ' + tokenData.access_token,
        'Set KEAP_REFRESH_TOKEN environment variable to: ' + tokenData.refresh_token,
        'Your service will now automatically refresh tokens as needed'
      ]
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      error: 'Token exchange failed',
      details: error.message
    });
  }
});

/**
 * OAuth Status Endpoint - Check current OAuth status
 */
app.get('/oauth/status', async (req, res) => {
  const KEAP_CLIENT_ID = process.env.KEAP_CLIENT_ID;
  const KEAP_CLIENT_SECRET = process.env.KEAP_CLIENT_SECRET;
  
  const status = {
    oauth_configured: !!(KEAP_CLIENT_ID && KEAP_CLIENT_SECRET),
    has_access_token: !!currentTokens.access_token,
    has_refresh_token: !!currentTokens.refresh_token,
    token_expires_at: currentTokens.expires_at ? new Date(currentTokens.expires_at).toISOString() : null,
    token_valid: false,
    fallback_to_legacy: !!process.env.KEAP_API_TOKEN
  };
  
  if (currentTokens.access_token) {
    try {
      const testResponse = await fetch('https://api.infusionsoft.com/crm/rest/v1/account/profile', {
        headers: {
          'Authorization': `Bearer ${currentTokens.access_token}`
        }
      });
      status.token_valid = testResponse.ok;
    } catch (error) {
      status.token_valid = false;
    }
  }
  
  res.json(status);
});

/**
 * Manual Token Refresh Endpoint
 */
app.post('/oauth/refresh', async (req, res) => {
  try {
    const result = await refreshOAuthToken();
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      expires_in: result.expires_in,
      expires_at: new Date(currentTokens.expires_at).toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Token refresh failed',
      details: error.message
    });
  }
});

app.get('/', (req, res) => {
  const hasOAuthConfig = !!(process.env.KEAP_CLIENT_ID && process.env.KEAP_CLIENT_SECRET);
  const hasOAuthTokens = !!(currentTokens.access_token && currentTokens.refresh_token);
  
  res.json({
    status: 'healthy',
    message: '🚀 Keap Billing Date Calculator with HUMAN-FRIENDLY Goal Integration',
    features: {
      airtable: !!process.env.AIRTABLE_API_KEY,
      webhook: !!process.env.WEBHOOK_URL,
      keapGoals: {
        enabled: !!(currentTokens.access_token || process.env.KEAP_API_TOKEN),
        oauth_configured: hasOAuthConfig,
        oauth_tokens: hasOAuthTokens,
        automatic_refresh: hasOAuthTokens,
        humanFriendlyGoals: true,
        goalDiscovery: true,
        defaultSuccessGoal: !!process.env.KEAP_SUCCESS_GOAL_ID,
        defaultErrorGoal: !!process.env.KEAP_ERROR_GOAL_ID,
        dynamicGoals: true
      }
    },
    endpoints: {
      'POST /calculate-billing-date': 'Calculate billing date with HUMAN-FRIENDLY goal triggering',
      'GET /oauth/authorize': 'Start OAuth authorization flow',
      'GET /oauth/callback': 'OAuth callback endpoint',
      'GET /oauth/status': 'Check OAuth token status',
      'POST /oauth/refresh': 'Manually refresh OAuth token',
      'POST /goals/discover': 'Test goal discovery by call name'
    },
    human_friendly_usage: {
      preferred_format: {
        successCallName: 'billing_calculator_success',
        errorCallName: 'billing_calculator_error',
        integration: 'billing-date-calculator'
      },
      legacy_format: {
        keapSuccessGoalId: '123',
        keapErrorGoalId: '456'
      }
    },
    oauth_setup: hasOAuthConfig ? 'configured' : 'Go to /oauth/authorize to start OAuth flow'
  });
});

/**
 * 🚀 REVOLUTIONIZED BILLING DATE CALCULATION ENDPOINT
 * Now supports human-friendly goal call names!
 */
app.post('/calculate-billing-date', async (req, res) => {
  try {
    const { 
      contactId, 
      date, 
      delay, 
      skipWebhook = false, 
      skipAirtable = false, 
      skipKeapGoals = false,
      
      // 🎯 HUMAN-FRIENDLY GOAL CONFIGURATION (PREFERRED)
      successCallName,
      errorCallName,
      integration = 'billing-date-calculator',
      
      // 🔧 LEGACY GOAL IDs (FALLBACK)
      keapSuccessGoalId,
      keapErrorGoalId 
    } = req.body;
    
    if (!contactId) {
      return res.status(400).json({
        error: 'contactId is required',
        example: { 
          contactId: '12345', 
          date: '2024-01-10', 
          delay: '5 days 2 months',
          // Human-friendly way
          successCallName: 'billing_calculator_success',
          errorCallName: 'billing_calculator_error'
        }
      });
    }
    
    if (!date) {
      return res.status(400).json({
        error: 'date is required',
        example: { 
          contactId: '12345', 
          date: '2024-01-10', 
          delay: '5 days 2 months',
          successCallName: 'billing_calculator_success',
          errorCallName: 'billing_calculator_error'
        }
      });
    }
    
    const inputDate = new Date(date);
    
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD',
        example: { contactId: '12345', date: '2024-01-10' }
      });
    }
    
    const { days, months } = parseDelay(delay);
    const calculatedDate = findNextTargetDate(inputDate, days, months);
    
    const result = {
      success: true,
      contactId: contactId,
      originalDate: inputDate.toISOString().split('T')[0],
      delay: {
        days: days,
        months: months,
        original: delay || 'none'
      },
      calculatedDate: calculatedDate.toISOString().split('T')[0],
      dayOfMonth: calculatedDate.getDate(),
      message: `Billing date calculated for contact ${contactId}`,
      integrations: {
        airtable: { attempted: false, success: false },
        webhook: { attempted: false, success: false },
        keapGoal: { attempted: false, success: false }
      }
    };
    
    // Track integration errors for goal triggering
    const integrationErrors = [];
    
    // Airtable integration
    if (!skipAirtable) {
      try {
        result.integrations.airtable.attempted = true;
        const airtableResult = await storeInAirtable(
          contactId, 
          result.originalDate, 
          result.calculatedDate, 
          result.delay
        );
        result.integrations.airtable.success = !!airtableResult;
        if (airtableResult) {
          result.integrations.airtable.recordId = airtableResult.records[0].id;
        }
      } catch (error) {
        result.integrations.airtable.error = error.message;
        integrationErrors.push(`Airtable: ${error.message}`);
      }
    }
    
    // Webhook integration
    if (!skipWebhook) {
      try {
        result.integrations.webhook.attempted = true;
        const webhookResult = await sendToWebhook(contactId, result.calculatedDate, result);
        result.integrations.webhook.success = !!webhookResult;
        if (webhookResult) {
          result.integrations.webhook.response = webhookResult;
        }
      } catch (error) {
        result.integrations.webhook.error = error.message;
        integrationErrors.push(`Webhook: ${error.message}`);
      }
    }
    
    // 🚀 HUMAN-FRIENDLY KEAP GOAL INTEGRATION
    if (!skipKeapGoals) {
      try {
        result.integrations.keapGoal.attempted = true;
        
        // Create goal configuration object
        const goalConfig = {
          // Human-friendly call names (PREFERRED)
          successCallName: successCallName,
          errorCallName: errorCallName,
          integration: integration,
          
          // Legacy goal IDs (FALLBACK)
          successGoalId: keapSuccessGoalId,
          errorGoalId: keapErrorGoalId
        };
        
        // Determine success/failure based on main calculation and critical integrations
        const hasIntegrationFailures = integrationErrors.length > 0;
        const goalResult = await handleKeapGoals(
          contactId, 
          !hasIntegrationFailures, 
          hasIntegrationFailures ? integrationErrors.join('; ') : null,
          goalConfig
        );
        
        result.integrations.keapGoal = goalResult;
        
      } catch (error) {
        result.integrations.keapGoal.error = error.message;
      }
    }
    
    res.json(result);
    
  } catch (error) {
    // Trigger error goal for calculation failures
    const { contactId, errorCallName, keapErrorGoalId, integration } = req.body;
    if (contactId && !req.body.skipKeapGoals) {
      try {
        const goalConfig = { 
          errorCallName: errorCallName,
          errorGoalId: keapErrorGoalId,
          integration: integration || 'billing-date-calculator'
        };
        await handleKeapGoals(contactId, false, error.message, goalConfig);
      } catch (goalError) {
        console.error('Failed to trigger error goal:', goalError);
      }
    }
    
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * 🔍 Test endpoint for goal discovery
 */
app.post('/goals/discover', async (req, res) => {
  try {
    const { callName, integration = 'billing-date-calculator' } = req.body;
    
    if (!callName) {
      return res.status(400).json({
        error: 'callName is required',
        example: { 
          callName: 'billing_calculator_success',
          integration: 'billing-date-calculator'
        }
      });
    }
    
    const discoveryResult = await discoverGoalIdByCallName(callName, integration);
    
    res.json({
      success: true,
      message: `Goal discovered successfully`,
      callName: callName,
      integration: integration,
      discovery: discoveryResult
    });
    
  } catch (error) {
    res.status(404).json({
      error: 'Goal discovery failed',
      callName: req.body.callName,
      integration: req.body.integration || 'billing-date-calculator',
      details: error.message,
      suggestion: 'Make sure the goal exists in an active campaign with the correct call_name and integration values'
    });
  }
});

/**
 * Health check endpoint for Keap goals with enhanced human-friendly features
 */
app.get('/keap-goals/health', (req, res) => {
  const hasOAuthTokens = !!(currentTokens.access_token && currentTokens.refresh_token);
  const hasLegacyToken = !!process.env.KEAP_API_TOKEN;
  
  res.json({
    keapGoalIntegration: {
      status: (hasOAuthTokens || hasLegacyToken) ? 'configured' : 'not configured',
      oauth_tokens: hasOAuthTokens ? 'present' : 'missing',
      legacy_token: hasLegacyToken ? 'present' : 'missing',
      authentication_method: hasOAuthTokens ? 'OAuth 2.0' : (hasLegacyToken ? 'Legacy API Key' : 'none'),
      automatic_refresh: hasOAuthTokens,
      
      // ENHANCED FEATURES
      humanFriendlyGoals: true,
      goalDiscoverySupported: true,
      realTimeGoalLookup: true,
      noCachingRequired: true,
      
      defaultSuccessGoalId: process.env.KEAP_SUCCESS_GOAL_ID || 'not configured',
      defaultErrorGoalId: process.env.KEAP_ERROR_GOAL_ID || 'not configured',
      dynamicGoalsSupported: true,
      ready: !!(hasOAuthTokens || hasLegacyToken)
    },
    oauth_status: {
      configured: !!(process.env.KEAP_CLIENT_ID && process.env.KEAP_CLIENT_SECRET),
      has_tokens: hasOAuthTokens,
      token_expires_at: currentTokens.expires_at ? new Date(currentTokens.expires_at).toISOString() : null
    },
    usage: {
      'OAuth Setup': 'Visit /oauth/authorize to get OAuth tokens',
      'Human-Friendly Goals': 'Use successCallName and errorCallName in requests',
      'Goal Discovery': 'POST /goals/discover to test call name discovery',
      'Legacy Support': 'Still supports keapSuccessGoalId and keapErrorGoalId for backwards compatibility'
    }
  });
});

/**
 * Enhanced test endpoint with human-friendly goal support
 */
app.post('/keap-goals/test', async (req, res) => {
  try {
    const { 
      contactId, 
      testSuccess = true,
      
      // Human-friendly options
      successCallName,
      errorCallName,
      integration = 'billing-date-calculator',
      
      // Legacy options
      keapSuccessGoalId, 
      keapErrorGoalId 
    } = req.body;
    
    if (!contactId) {
      return res.status(400).json({
        error: 'contactId is required for testing',
        example: { 
          contactId: '12345', 
          testSuccess: true,
          successCallName: 'billing_calculator_success',
          errorCallName: 'billing_calculator_error'
        }
      });
    }
    
    const goalConfig = {
      successCallName: successCallName,
      errorCallName: errorCallName,
      integration: integration,
      successGoalId: keapSuccessGoalId,
      errorGoalId: keapErrorGoalId
    };
    
    const goalResult = await handleKeapGoals(
      contactId, 
      testSuccess, 
      testSuccess ? null : 'Test error scenario',
      goalConfig
    );
    
    res.json({
      success: true,
      testType: testSuccess ? 'success' : 'error',
      contactId: contactId,
      goalConfig: goalConfig,
      goalResult: goalResult,
      authentication_used: currentTokens.access_token ? 'OAuth 2.0' : 'Legacy API Key',
      message: `Test ${testSuccess ? 'success' : 'error'} goal triggered for contact ${contactId}`,
      humanFriendly: !!(successCallName || errorCallName)
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Keap Billing Date Calculator with HUMAN-FRIENDLY Goal Integration listening on port ${port}`);
  console.log('Features enabled:');
  console.log(`  - Airtable: ${!!process.env.AIRTABLE_API_KEY ? '✓' : '✗'}`);
  console.log(`  - Webhook: ${!!process.env.WEBHOOK_URL ? '✓' : '✗'}`);
  console.log(`  - OAuth 2.0: ${!!(process.env.KEAP_CLIENT_ID && process.env.KEAP_CLIENT_SECRET) ? '✓' : '✗'}`);
  console.log(`  - OAuth Tokens: ${!!(currentTokens.access_token && currentTokens.refresh_token) ? '✓' : '✗'}`);
  console.log(`  - Legacy API: ${!!process.env.KEAP_API_TOKEN ? '✓' : '✗'}`);
  console.log(`  - Automatic Token Refresh: ${!!(currentTokens.access_token && currentTokens.refresh_token) ? '✓' : '✗'}`);
  console.log(`  - 🎯 Human-Friendly Goals: ✓`);
  console.log(`  - 🔍 Real-time Goal Discovery: ✓`);
  console.log(`  - 🚀 Call Name Support: ✓`);
});

module.exports = app;