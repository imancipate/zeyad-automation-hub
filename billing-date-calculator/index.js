const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

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
 * Triggers a goal in Keap for the specified contact
 */
async function triggerKeapGoal(contactId, goalId, goalType = 'success') {
  const KEAP_API_TOKEN = process.env.KEAP_API_TOKEN;
  
  if (!KEAP_API_TOKEN || !goalId) {
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
        'Authorization': `Bearer ${KEAP_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
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

app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Keap Billing Date Calculator with Airtable, Webhook & Dynamic Goal Integration',
    features: {
      airtable: !!process.env.AIRTABLE_API_KEY,
      webhook: !!process.env.WEBHOOK_URL,
      keapGoals: {
        enabled: !!process.env.KEAP_API_TOKEN,
        defaultSuccessGoal: !!process.env.KEAP_SUCCESS_GOAL_ID,
        defaultErrorGoal: !!process.env.KEAP_ERROR_GOAL_ID,
        dynamicGoals: true
      }
    },
    endpoints: {
      'POST /calculate-billing-date': 'Calculate billing date with optional dynamic goal IDs',
      'GET /billing-date/:contactId': 'Get stored billing date from Airtable'
    },
    environment: {
      KEAP_API_TOKEN: process.env.KEAP_API_TOKEN ? 'configured' : 'missing',
      KEAP_SUCCESS_GOAL_ID: process.env.KEAP_SUCCESS_GOAL_ID ? 'configured' : 'missing (can use request-level)',
      KEAP_ERROR_GOAL_ID: process.env.KEAP_ERROR_GOAL_ID ? 'configured' : 'missing (can use request-level)'
    }
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
      // NEW: Dynamic goal IDs
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
    
    // Keap Goal integration with dynamic goal IDs
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
 * Health check endpoint for Keap goals specifically
 */
app.get('/keap-goals/health', (req, res) => {
  const KEAP_API_TOKEN = process.env.KEAP_API_TOKEN;
  const KEAP_SUCCESS_GOAL_ID = process.env.KEAP_SUCCESS_GOAL_ID;
  const KEAP_ERROR_GOAL_ID = process.env.KEAP_ERROR_GOAL_ID;
  
  res.json({
    keapGoalIntegration: {
      status: KEAP_API_TOKEN ? 'configured' : 'not configured',
      apiToken: KEAP_API_TOKEN ? 'present' : 'missing',
      defaultSuccessGoalId: KEAP_SUCCESS_GOAL_ID || 'not configured',
      defaultErrorGoalId: KEAP_ERROR_GOAL_ID || 'not configured',
      dynamicGoalsSupported: true,
      ready: !!KEAP_API_TOKEN
    },
    usage: {
      'Default Goals': 'Set KEAP_SUCCESS_GOAL_ID and KEAP_ERROR_GOAL_ID environment variables',
      'Dynamic Goals': 'Pass keapSuccessGoalId and keapErrorGoalId in request body',
      'Priority': 'Request-level goal IDs override environment variables'
    },
    endpoints: {
      'POST /keap-goals/test': 'Test goal triggering with sample data'
    }
  });
});

/**
 * Test endpoint for Keap goal integration with dynamic goal support
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
  console.log(`Keap Billing Date Calculator with Dynamic Goal Integration listening on port ${port}`);
  console.log('Features enabled:');
  console.log(`  - Airtable: ${!!process.env.AIRTABLE_API_KEY ? '✓' : '✗'}`);
  console.log(`  - Webhook: ${!!process.env.WEBHOOK_URL ? '✓' : '✗'}`);
  console.log(`  - Keap Goals: ${!!process.env.KEAP_API_TOKEN ? '✓' : '✗'}`);
  console.log(`  - Dynamic Goals: ✓ (request-level goal IDs supported)`);
  if (process.env.KEAP_API_TOKEN) {
    console.log(`    - Default Success Goal ID: ${process.env.KEAP_SUCCESS_GOAL_ID || 'not configured'}`);
    console.log(`    - Default Error Goal ID: ${process.env.KEAP_ERROR_GOAL_ID || 'not configured'}`);
  }
});

module.exports = app;