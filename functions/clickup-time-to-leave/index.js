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
    }
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
      return minutes;
    }
  }
  
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
    const response = await axios.get(
      `${CONFIG.clickup.baseUrl}/task/${taskId}`,
      {
        headers: {
          'Authorization': CONFIG.clickup.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching task:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update custom field in ClickUp
 */
async function updateCustomField(taskId, fieldId, value) {
  try {
    const response = await axios.post(
      `${CONFIG.clickup.baseUrl}/task/${taskId}/field/${fieldId}`,
      { value },
      {
        headers: {
          'Authorization': CONFIG.clickup.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating custom field:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Find "Time To Leave" custom field ID
 */
function findTimeToLeaveFieldId(task) {
  const timeFields = task.custom_fields.filter(field => 
    field.name.toLowerCase().includes('time to leave') ||
    field.name.toLowerCase().includes('departure') ||
    field.name.toLowerCase().includes('leave time')
  );
  
  return timeFields.length > 0 ? timeFields[0].id : null;
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
    console.log(`Processing start date change for task ${taskId}`);
    
    // Get full task details
    const task = await getClickUpTask(taskId);
    
    // Check if task has appointment tag
    if (!hasAppointmentTag(task)) {
      console.log('Task does not have appointment tag, skipping');
      return;
    }
    
    // Find Time To Leave custom field
    const timeToLeaveFieldId = findTimeToLeaveFieldId(task);
    if (!timeToLeaveFieldId) {
      console.log('Time To Leave custom field not found, skipping');
      return;
    }
    
    // Calculate travel time and departure time
    const travelTimeMinutes = calculateTravelTime(task);
    const startTime = new Date(parseInt(newStartDate));
    const leaveTime = new Date(startTime.getTime() - (travelTimeMinutes * 60 * 1000));
    
    console.log(`Calculated departure time: ${leaveTime.toISOString()} (${travelTimeMinutes} minutes before ${startTime.toISOString()})`);
    
    // Update the custom field
    await updateCustomField(taskId, timeToLeaveFieldId, leaveTime.getTime());
    
    // Schedule notification
    await sendPushCutNotification(
      `Time to leave for ${task.name}`,
      `You should leave now for your appointment at ${startTime.toLocaleTimeString()}`,
      leaveTime.toISOString()
    );
    
    console.log('Time To Leave automation completed successfully');
    
  } catch (error) {
    console.error('Error in handleStartDateChange:', error);
    throw error;
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
        await handleStartDateChange(task_id, startDateChange.after);
      }
    }
    
    res.status(200).json({ success: true, message: 'Webhook processed' });
    
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
    const task = await getClickUpTask(taskId);
    
    if (task.start_date) {
      await handleStartDateChange(taskId, task.start_date);
      res.json({ success: true, message: 'Manual trigger completed' });
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
    service: 'ClickUp Time To Leave Automation'
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
// Server Setup
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ClickUp Time To Leave automation server running on port ${PORT}`);
  console.log(`Webhook endpoint: /clickup-webhook`);
  console.log(`Health check: /health`);
});

module.exports = app;