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
 * Triggers a goal in Keap for the specified contact with automatic token management
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
 * Handles goal triggering based on calculation success/failure
 * Enhanced to support dynamic goal IDs from request or environment variables
 */
async function handleKeapGoals(contactId, isSuccess, errorDetails = null, customGoalIds = {}) {
  // Priority: Custom goal IDs from request > Environment variables > Skip
  const KEAP_SUCCESS_GOAL_ID = customGoalIds.successGoalId || process.env.KEAP_SUCCESS_GOAL_ID;
  const KEAP_ERROR_GOAL_ID = customGoalIds.errorGoalId || process.env.KEAP_ERROR_GOAL_ID;
  
  const goalResult = {
    attempted: false,
    success: false,
    goalType: isSuccess ? 'success' : 'error',
    goalId: isSuccess ? KEAP_SUCCESS_GOAL_ID : KEAP_ERROR_GOAL_ID,
    source: customGoalIds.successGoalId || customGoalIds.errorGoalId ? 'request' : 'environment'
  };
  
  const goalId = isSuccess ? KEAP_SUCCESS_GOAL_ID : KEAP_ERROR_GOAL_ID;
  
  if (!goalId) {
    goalResult.skipped = true;
    goalResult.reason = `No ${goalResult.goalType} goal ID configured`;
    return goalResult;
  }
  
  try {
    goalResult.attempted = true;
    const result = await triggerKeapGoal(contactId, goalId, goalResult.goalType);
    goalResult.success = !!result;
    
    if (result) {
      goalResult.response = result;
    }
    
    if (errorDetails && !isSuccess) {
      goalResult.originalError = errorDetails;
    }
    
  } catch (error) {
    goalResult.error = error.message;
  }
  
  return goalResult;
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
    message: 'Keap Billing Date Calculator with OAuth 2.0 & Dynamic Goal Integration',
    features: {
      airtable: !!process.env.AIRTABLE_API_KEY,
      webhook: !!process.env.WEBHOOK_URL,
      keapGoals: {
        enabled: !!(currentTokens.access_token || process.env.KEAP_API_TOKEN),
        oauth_configured: hasOAuthConfig,
        oauth_tokens: hasOAuthTokens,
        automatic_refresh: hasOAuthTokens,
        defaultSuccessGoal: !!process.env.KEAP_SUCCESS_GOAL_ID,
        defaultErrorGoal: !!process.env.KEAP_ERROR_GOAL_ID,
        dynamicGoals: true
      }
    },
    endpoints: {
      'POST /calculate-billing-date': 'Calculate billing date with automatic OAuth token management',
      'GET /oauth/authorize': 'Start OAuth authorization flow',
      'GET /oauth/callback': 'OAuth callback endpoint',
      'GET /oauth/status': 'Check OAuth token status',
      'POST /oauth/refresh': 'Manually refresh OAuth token'
    },
    oauth_setup: hasOAuthConfig ? 'configured' : 'Go to /oauth/authorize to start OAuth flow'
  });
});

app.post('/calculate-billing-date', async (req, res) => {
  try {
    const { 
      contactId, 
      date, 
      delay, 
      skipWebhook = false, 
      skipAirtable = false, 
      skipKeapGoals = false,
      // Dynamic goal IDs
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
          keapSuccessGoalId: '123',
          keapErrorGoalId: '456'
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
          keapSuccessGoalId: '123',
          keapErrorGoalId: '456'
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
    
    // Keap Goal integration with automatic OAuth token management
    if (!skipKeapGoals) {
      try {
        result.integrations.keapGoal.attempted = true;
        
        // Pass custom goal IDs to the handler
        const customGoalIds = {
          successGoalId: keapSuccessGoalId,
          errorGoalId: keapErrorGoalId
        };
        
        // Determine success/failure based on main calculation and critical integrations
        const hasIntegrationFailures = integrationErrors.length > 0;
        const goalResult = await handleKeapGoals(
          contactId, 
          !hasIntegrationFailures, 
          hasIntegrationFailures ? integrationErrors.join('; ') : null,
          customGoalIds
        );
        
        result.integrations.keapGoal = goalResult;
        
      } catch (error) {
        result.integrations.keapGoal.error = error.message;
      }
    }
    
    res.json(result);
    
  } catch (error) {
    // Trigger error goal for calculation failures
    const { contactId, keapErrorGoalId } = req.body;
    if (contactId && !req.body.skipKeapGoals) {
      try {
        const customGoalIds = { errorGoalId: keapErrorGoalId };
        await handleKeapGoals(contactId, false, error.message, customGoalIds);
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
 * Health check endpoint for Keap goals with OAuth status
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
      'Default Goals': 'Set KEAP_SUCCESS_GOAL_ID and KEAP_ERROR_GOAL_ID environment variables',
      'Dynamic Goals': 'Pass keapSuccessGoalId and keapErrorGoalId in request body'
    }
  });
});

/**
 * Test endpoint for Keap goal integration with OAuth
 */
app.post('/keap-goals/test', async (req, res) => {
  try {
    const { 
      contactId, 
      testSuccess = true, 
      keapSuccessGoalId, 
      keapErrorGoalId 
    } = req.body;
    
    if (!contactId) {
      return res.status(400).json({
        error: 'contactId is required for testing',
        example: { 
          contactId: '12345', 
          testSuccess: true,
          keapSuccessGoalId: '123',
          keapErrorGoalId: '456'
        }
      });
    }
    
    const customGoalIds = {
      successGoalId: keapSuccessGoalId,
      errorGoalId: keapErrorGoalId
    };
    
    const goalResult = await handleKeapGoals(
      contactId, 
      testSuccess, 
      testSuccess ? null : 'Test error scenario',
      customGoalIds
    );
    
    res.json({
      success: true,
      testType: testSuccess ? 'success' : 'error',
      contactId: contactId,
      goalResult: goalResult,
      customGoalIds: customGoalIds,
      authentication_used: currentTokens.access_token ? 'OAuth 2.0' : 'Legacy API Key',
      message: `Test ${testSuccess ? 'success' : 'error'} goal triggered for contact ${contactId}`
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Keap Billing Date Calculator with OAuth 2.0 Integration listening on port ${port}`);
  console.log('Features enabled:');
  console.log(`  - Airtable: ${!!process.env.AIRTABLE_API_KEY ? '✓' : '✗'}`);
  console.log(`  - Webhook: ${!!process.env.WEBHOOK_URL ? '✓' : '✗'}`);
  console.log(`  - OAuth 2.0: ${!!(process.env.KEAP_CLIENT_ID && process.env.KEAP_CLIENT_SECRET) ? '✓' : '✗'}`);
  console.log(`  - OAuth Tokens: ${!!(currentTokens.access_token && currentTokens.refresh_token) ? '✓' : '✗'}`);
  console.log(`  - Legacy API: ${!!process.env.KEAP_API_TOKEN ? '✓' : '✗'}`);
  console.log(`  - Automatic Token Refresh: ${!!(currentTokens.access_token && currentTokens.refresh_token) ? '✓' : '✗'}`);
  console.log(`  - Dynamic Goals: ✓`);
});

module.exports = app;