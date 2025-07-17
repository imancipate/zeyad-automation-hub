/**
 * ClickUp webhook endpoint - IMPROVED PAYLOAD HANDLING
 */
app.post('/clickup-webhook', async (req, res) => {
  try {
    console.log('Raw webhook body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    // Try different payload structures ClickUp might send
    let event, task_id, history_items;
    
    // Method 1: Standard structure
    if (req.body.event && req.body.task_id) {
      event = req.body.event;
      task_id = req.body.task_id;
      history_items = req.body.history_items;
    }
    // Method 2: Check if data is nested
    else if (req.body.data) {
      event = req.body.data.event;
      task_id = req.body.data.task_id;
      history_items = req.body.data.history_items;
    }
    // Method 3: Check for webhook_event structure
    else if (req.body.webhook_event) {
      event = req.body.webhook_event;
      task_id = req.body.task?.id;
      history_items = req.body.history_items;
    }
    // Method 4: Direct task structure
    else if (req.body.task?.id) {
      event = 'taskUpdated'; // Assume task updated
      task_id = req.body.task.id;
      history_items = req.body.history_items || req.body.changes;
    }
    
    console.log('Parsed webhook data:', { event, task_id, historyCount: history_items?.length });
    
    if (!task_id) {
      console.log('❌ No task_id found in webhook payload');
      res.status(200).json({ success: true, message: 'No task_id found in payload' });
      return;
    }
    
    if (event === 'taskUpdated' && history_items) {
      // Check if start_date was modified
      const startDateChange = history_items.find(item => 
        item.field === 'start_date' || item.field === 'start_date_time'
      );
      
      if (startDateChange && startDateChange.after) {
        const result = await handleStartDateChange(task_id, startDateChange.after);
        res.status(200).json({ success: true, message: 'Webhook processed', result });
      } else {
        console.log('Available history items:', history_items.map(item => item.field));
        res.status(200).json({ success: true, message: 'No start_date change detected' });
      }
    } else {
      res.status(200).json({ success: true, message: 'Event not relevant or no history items' });
    }
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});