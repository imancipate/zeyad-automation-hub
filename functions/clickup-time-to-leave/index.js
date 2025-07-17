/**
 * Update custom field in ClickUp - SIMPLIFIED VERSION
 */
async function updateCustomField(taskId, fieldId, timestamp) {
  try {
    console.log(`Updating field ${fieldId} to timestamp ${timestamp} for task ${taskId}`);
    
    // Try sending just the timestamp as a number (not string)
    const payload = {
      value: timestamp  // Send as number, not string
    };
    
    console.log('Sending payload:', JSON.stringify(payload, null, 2));
    
    // Use the correct ClickUp API endpoint format
    const response = await axios.post(
      `${CONFIG.clickup.baseUrl}/task/${taskId}/field/${fieldId}`,
      payload,
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