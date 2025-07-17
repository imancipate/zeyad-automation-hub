// ============================================================================
// ClickUp "Time To Leave" Automation
// Automatically calculates departure time when appointment start_date changes
// ============================================================================

const express = require('express');
const axios = require('axios');
const app = express();

// Configuration
const CONFIG = {
  clickup: {
    apiKey: process.env.CLICKUP_API_KEY,
    baseUrl: 'https://api.clickup.com/api/v2'
  },
  automation: {
    // Default travel time in minutes
    defaultTravelTime: 60,
    // Custom travel times by location/task name patterns
    customTravelTimes: {
      'mosque': 45,
      'office': 30,
      'doctor': 20,
      'quran': 45
    },
    // Hardcoded Time To Leave field ID (discovered from API)
    timeToLeaveFieldId: '7d8d70f5-c49a-4d56-b65c-cd30aa5f143a'
  },
  notifications: {
    pushcutToken: process.env.PUSHCUT_TOKEN
  }
};

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate travel time based on task name and description
 */
function calculateTravelTime(task) {
  const text = (task.name + ' ' + task.description).toLowerCase();
  
  for (const [keyword, minutes] of Object.entries(CONFIG.automation.customTravelTimes)) {
    if (text.includes(keyword)) {
      console.log(`Found keyword "${keyword}" - using ${minutes} minutes travel time`);
      return minutes;
    }
  }
  
  console.log(`No keywords found - using default ${CONFIG.automation.defaultTravelTime} minutes`);
  return CONFIG.automation.defaultTravelTime;
}

/**
 * Check if task has appointment tag
 */
function hasAppointmentTag(task) {
  return task.tags && task.tags.some(tag => 
    tag.name.toLowerCase().includes('appointment')
  );
}

/**
 * Get ClickUp task details
 */
async function getClickUpTask(taskId) {
  try {
    console.log(`Fetching task details for ${taskId}`);
    const response = await axios.get(
      `${CONFIG.clickup.baseUrl}/task/${taskId}`,
      {
        headers: {
          'Authorization': CONFIG.clickup.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Successfully fetched task: ${response.data.name}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching task:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update custom field in ClickUp - FIXED VERSION
 */
async function updateCustomField(taskId, fieldId, value) {
  try {
    console.log(`Updating field ${fieldId} to value ${value} for task ${taskId}`);
    
    // Use the correct ClickUp API endpoint format
    const response = await axios.post(
      `${CONFIG.clickup.baseUrl}/task/${taskId}/field/${fieldId}`,
      {
        value: value.toString() // Ensure value is string
      },
      {
        headers: {
          'Authorization': CONFIG.clickup.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Field update response:', response.status, response.statusText);
    console.log('Field update successful');
    return response.data;
  } catch (error) {
    console.error('Error updating custom field:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    throw error;
  }
}

/**
 * Find "Time To Leave" custom field ID - UPDATED TO USE HARDCODED ID
 */
function findTimeToLeaveFieldId(task) {
  // First try the hardcoded field ID
  const hardcodedFieldId = CONFIG.automation.timeToLeaveFieldId;
  const hardcodedField = task.custom_fields.find(field => field.id === hardcodedFieldId);
  
  if (hardcodedField) {
    console.log(`✅ Found hardcoded "Time To Leave" field with ID: ${hardcodedFieldId}`);
    return hardcodedFieldId;
  }
  
  // Fallback to dynamic search
  const timeFields = task.custom_fields.filter(field => 
    field.name.toLowerCase().includes('time to leave') ||
    field.name.toLowerCase().includes('departure') ||
    field.name.toLowerCase().includes('leave time')
  );
  
  if (timeFields.length > 0) {
    console.log(`Found "Time To Leave" field with ID: ${timeFields[0].id}`);
    return timeFields[0].id;
  }
  
  console.log('❌ No "Time To Leave" field found');
  console.log('Available custom fields:');
  task.custom_fields.forEach(field => {
    console.log(`  - ${field.name} (${field.id}) - Type: ${field.type}`);
  });
  return null;
}

/**
 * Send PushCut notification
 */
async function sendPushCutNotification(title, text, scheduleTime = null) {
  if (!CONFIG.notifications.pushcutToken) {
    console.log('PushCut token not configured, skipping notification');
    return;
  }

  try {
    const payload = {
      title,
      text,
      isTimeSensitive: true
    };

    if (scheduleTime) {
      payload.schedule = scheduleTime;
    }

    await axios.post(
      'https://api.pushcut.io/v1/notifications/Time%20To%20Leave',
      payload,
      {
        headers: {
          'API-Key': CONFIG.notifications.pushcutToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('PushCut notification sent successfully');
  } catch (error) {
    console.error('Error sending PushCut notification:', error.response?.data || error.message);
  }
}

// ============================================================================
// Main Automation Logic
// ============================================================================

/**
 * Handle start date change for appointment tasks
 */
async function handleStartDateChange(taskId, newStartDate) {
  try {
    console.log(`=== PROCESSING TASK ${taskId} ===`);
    console.log(`Start date: ${newStartDate}`);
    
    // Get full task details
    const task = await getClickUpTask(taskId);
    
    // Check if task has appointment tag
    if (!hasAppointmentTag(task)) {
      console.log('❌ Task does not have appointment tag, skipping');
      return { success: false, reason: 'No appointment tag' };
    }
    console.log('✅ Task has appointment tag');
    
    // Find Time To Leave custom field
    const timeToLeaveFieldId = findTimeToLeaveFieldId(task);
    if (!timeToLeaveFieldId) {
      console.log('❌ Time To Leave custom field not found, skipping');
      return { success: false, reason: 'Time To Leave field not found' };
    }
    console.log('✅ Found Time To Leave field');
    
    // Calculate travel time and departure time
    const travelTimeMinutes = calculateTravelTime(task);
    const startTime = new Date(parseInt(newStartDate));
    const leaveTime = new Date(startTime.getTime() - (travelTimeMinutes * 60 * 1000));
    
    console.log(`📅 Start time: ${startTime.toISOString()} (${startTime.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})} PST)`);
    console.log(`🚗 Travel time: ${travelTimeMinutes} minutes`);
    console.log(`⏰ Departure time: ${leaveTime.toISOString()} (${leaveTime.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})} PST)`);
    console.log(`📱 Timestamp to save: ${leaveTime.getTime()}`);
    
    // Update the custom field
    await updateCustomField(taskId, timeToLeaveFieldId, leaveTime.getTime());
    
    // Schedule notification
    if (CONFIG.notifications.pushcutToken) {
      await sendPushCutNotification(
        `Time to leave for ${task.name}`,
        `You should leave now for your appointment at ${startTime.toLocaleTimeString()}`,
        leaveTime.toISOString()
      );
    }
    
    console.log('✅ Time To Leave automation completed successfully');
    return { 
      success: true, 
      startTime: startTime.toISOString(),
      leaveTime: leaveTime.toISOString(),
      travelMinutes: travelTimeMinutes 
    };
    
  } catch (error) {
    console.error('❌ Error in handleStartDateChange:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Webhook Endpoints
// ============================================================================

/**
 * ClickUp webhook endpoint
 */
app.post('/clickup-webhook', async (req, res) => {
  try {
    const { event, task_id, history_items } = req.body;
    
    console.log('Received webhook:', { event, task_id, historyCount: history_items?.length });
    
    if (event === 'taskUpdated' && history_items) {
      // Check if start_date was modified
      const startDateChange = history_items.find(item => 
        item.field === 'start_date'
      );
      
      if (startDateChange && startDateChange.after) {
        const result = await handleStartDateChange(task_id, startDateChange.after);
        res.status(200).json({ success: true, message: 'Webhook processed', result });
      } else {
        res.status(200).json({ success: true, message: 'No start_date change detected' });
      }
    } else {
      res.status(200).json({ success: true, message: 'Event not relevant' });
    }
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Manual trigger endpoint for testing
 */
app.post('/manual-trigger/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log(`=== MANUAL TRIGGER FOR TASK ${taskId} ===`);
    
    const task = await getClickUpTask(taskId);
    
    if (task.start_date) {
      const result = await handleStartDateChange(taskId, task.start_date);
      res.json({ 
        success: true, 
        message: 'Manual trigger completed',
        details: result
      });
    } else {
      res.status(400).json({ success: false, error: 'Task has no start date' });
    }
    
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'ClickUp Time To Leave Automation',
    version: '2.1'
  });
});

/**
 * Utility endpoint to find custom field IDs
 */
app.get('/task-fields/:taskId', async (req, res) => {
  try {
    const task = await getClickUpTask(req.params.taskId);
    const customFields = task.custom_fields.map(field => ({
      id: field.id,
      name: field.name,
      type: field.type,
      value: field.value
    }));
    
    res.json({ taskId: req.params.taskId, customFields });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Google Cloud Functions Export
// ============================================================================

// For Google Cloud Functions
exports.app = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`ClickUp Time To Leave automation server running on port ${PORT}`);
    console.log(`Webhook endpoint: /clickup-webhook`);
    console.log(`Health check: /health`);
  });
}