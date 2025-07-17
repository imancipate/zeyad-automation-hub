// ============================================================================
// ClickUp "Time To Leave" Automation - SUBTASK APPROACH
// Creates/updates a "Time to Leave" subtask with proper start_date timing
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
 * Find existing "Time to Leave" subtask
 */
async function findTimeToLeaveSubtask(parentTaskId) {
  try {
    console.log(`Looking for existing "Time to Leave" subtask under parent ${parentTaskId}`);
    
    // Get the parent task details to access subtasks
    const parentTask = await getClickUpTask(parentTaskId);
    
    // Check if the task has any subtasks
    // Note: ClickUp API doesn't always include subtasks in the main task response
    // We'll need to search by getting tasks and filtering by parent
    
    // For now, we'll assume no existing subtask and create a new one
    // This could be optimized later to search for existing ones
    return null;
  } catch (error) {
    console.error('Error finding subtask:', error);
    return null;
  }
}

/**
 * Create or update "Time to Leave" subtask
 */
async function createOrUpdateTimeToLeaveSubtask(parentTaskId, parentTaskName, departureTime, listId) {
  try {
    const subtaskName = `⏰ Time to Leave - ${parentTaskName}`;
    
    console.log(`Creating subtask: ${subtaskName}`);
    console.log(`Departure time: ${departureTime.toISOString()}`);
    
    // Create the subtask
    const response = await axios.post(
      `${CONFIG.clickup.baseUrl}/list/${listId}/task`,
      {
        name: subtaskName,
        description: `🚗 Departure time for "${parentTaskName}"\\n\\n⏰ Leave at: ${departureTime.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})} PST`,
        start_date: departureTime.getTime(),
        parent: parentTaskId,
        tags: ['time-to-leave', 'departure', 'automation'],
        assignees: [], // Will inherit from parent or can be set
        priority: 2 // High priority
      },
      {
        headers: {
          'Authorization': CONFIG.clickup.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Subtask created successfully:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating subtask:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    throw error;
  }
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
 * Handle start date change for appointment tasks - SUBTASK VERSION
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
    
    // Calculate travel time and departure time
    const travelTimeMinutes = calculateTravelTime(task);
    const startTime = new Date(parseInt(newStartDate));
    const leaveTime = new Date(startTime.getTime() - (travelTimeMinutes * 60 * 1000));
    
    console.log(`📅 Start time: ${startTime.toISOString()} (${startTime.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})} PST)`);
    console.log(`🚗 Travel time: ${travelTimeMinutes} minutes`);
    console.log(`⏰ Departure time: ${leaveTime.toISOString()} (${leaveTime.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})} PST)`);
    
    // Create the "Time to Leave" subtask
    const subtask = await createOrUpdateTimeToLeaveSubtask(
      taskId, 
      task.name, 
      leaveTime, 
      task.list.id
    );
    
    // Schedule notification
    if (CONFIG.notifications.pushcutToken) {
      await sendPushCutNotification(
        `Time to leave for ${task.name}`,
        `You should leave now for your appointment at ${startTime.toLocaleTimeString()}`,
        leaveTime.toISOString()
      );
    }
    
    console.log('✅ Time To Leave subtask automation completed successfully');
    return { 
      success: true, 
      startTime: startTime.toISOString(),
      leaveTime: leaveTime.toISOString(),
      travelMinutes: travelTimeMinutes,
      subtaskId: subtask.id,
      subtaskUrl: subtask.url
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
        message: 'Manual trigger completed - Subtask created with proper start_date',
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
    version: '4.0 - Subtask Approach'
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