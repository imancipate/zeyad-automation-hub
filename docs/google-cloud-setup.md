# Google Cloud Setup Guide

This guide walks you through deploying your ClickUp "Time To Leave" automation to Google Cloud Functions.

## Prerequisites

### 1. Google Cloud Setup
- Google Cloud account with billing enabled
- Project: `claude-mcp-docs-466120` (already configured)
- gcloud CLI installed and authenticated

### 2. ClickUp Setup
- ClickUp API key
- Workspace with custom fields enabled
- Test task ready: "🕌 Daily Qur'an Class" (ID: 86aaarryw)

## Step-by-Step Deployment

### Step 1: Clone and Prepare
```bash
git clone https://github.com/imancipate/zeyad-automation-hub.git
cd zeyad-automation-hub
```

### Step 2: Configure GCP
```bash
# Set your project
gcloud config set project claude-mcp-docs-466120

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable run.googleapis.com
```

### Step 3: Deploy Function
```bash
# Make deployment script executable
chmod +x deployment/gcp-deploy.sh

# Deploy with your project ID
GCP_PROJECT_ID=claude-mcp-docs-466120 ./deployment/gcp-deploy.sh
```

### Step 4: Set Environment Variables
```bash
# Set your ClickUp API key (replace with your actual key)
gcloud functions deploy clickup-time-to-leave \
  --region=us-central1 \
  --update-env-vars CLICKUP_API_KEY=pk_your_actual_clickup_api_key_here

# Optional: Set PushCut token for iOS notifications
gcloud functions deploy clickup-time-to-leave \
  --region=us-central1 \
  --update-env-vars PUSHCUT_TOKEN=your_pushcut_token_here
```

## Your Function URLs

After deployment, your function will be available at:

### Main Endpoints
- **Webhook URL**: `https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/clickup-webhook`
- **Health Check**: `https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/health`

### Testing Endpoints
- **Task Fields**: `https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/task-fields/86aaarryw`
- **Manual Trigger**: `https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/manual-trigger/86aaarryw`

## Testing Your Deployment

### 1. Health Check
```bash
curl https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-17T20:52:00.000Z",
  "service": "ClickUp Time To Leave Automation"
}
```

### 2. Test Task Fields (Find Custom Field IDs)
```bash
curl https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/task-fields/86aaarryw
```

### 3. Manual Trigger Test
```bash
curl -X POST https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/manual-trigger/86aaarryw
```

## ClickUp Configuration

### 1. Add "Time To Leave" Custom Field
1. Go to your ClickUp list: "📘 Middle Review"
2. Click list settings → Custom Fields
3. Add new field:
   - **Name**: "Time To Leave"
   - **Type**: Date & Time
   - **Required**: No
   - **Visible to guests**: Yes

### 2. Set Up Webhook
1. In ClickUp, go to your workspace settings
2. Navigate to Integrations → Webhooks
3. Create new webhook:
   - **Name**: "Time To Leave Automation"
   - **Endpoint URL**: `https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/clickup-webhook`
   - **Events**: ☑️ Task Updated
   - **Space**: Select "Qur'an Memorization" space
   - **Filters**: Tasks with "appointment" tag (optional)

### 3. Test with Existing Task
Your test task "🕌 Daily Qur'an Class" is ready:
- ✅ Has "appointment" tag
- ✅ Has start date set
- ✅ Located in correct workspace

## How the Automation Works

### Travel Time Calculation
The system automatically detects keywords in task names and descriptions:

| Keyword | Travel Time | Use Case |
|---------|-------------|----------|
| `mosque` | 45 minutes | Islamic centers, Friday prayers |
| `quran` | 45 minutes | Qur'an classes, Islamic studies |
| `office` | 30 minutes | Business meetings |
| `doctor` | 20 minutes | Medical appointments |
| *default* | 60 minutes | All other appointments |

### Example Workflow
1. **Task**: "🕌 Daily Qur'an Class" (contains "quran" keyword)
2. **Start Time**: 7:00 PM
3. **Calculated Travel Time**: 45 minutes
4. **Departure Time**: 6:15 PM
5. **Action**: Updates "Time To Leave" field to 6:15 PM

## Monitoring and Logs

### View Logs
```bash
# View recent logs
gcloud functions logs read clickup-time-to-leave --region=us-central1 --limit=50

# Follow logs in real-time
gcloud functions logs tail clickup-time-to-leave --region=us-central1
```

### Function Information
```bash
# Get function details
gcloud functions describe clickup-time-to-leave --region=us-central1

# Check function status
gcloud functions list --filter="name:clickup-time-to-leave"
```

## Troubleshooting

### Common Issues

#### 1. Function Not Responding
```bash
# Check function status
gcloud functions describe clickup-time-to-leave --region=us-central1 --format="value(serviceConfig.uri)"

# Test health endpoint
curl $(gcloud functions describe clickup-time-to-leave --region=us-central1 --format="value(serviceConfig.uri)")/health
```

#### 2. Environment Variables Not Set
```bash
# List current environment variables
gcloud functions describe clickup-time-to-leave --region=us-central1 --format="value(serviceConfig.environmentVariables)"

# Update if needed
gcloud functions deploy clickup-time-to-leave --region=us-central1 --update-env-vars CLICKUP_API_KEY=pk_your_key
```

#### 3. ClickUp Webhook Issues
- Verify webhook URL is exactly: `https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/clickup-webhook`
- Check webhook is listening for "Task Updated" events
- Ensure tasks have "appointment" tag
- Test with manual trigger first

#### 4. Custom Field Not Found
- Verify "Time To Leave" custom field exists in the correct list
- Check field name matches exactly (case-sensitive)
- Use task-fields endpoint to see all available fields

### Getting Help

#### Check Logs for Errors
```bash
gcloud functions logs read clickup-time-to-leave --region=us-central1 --filter="severity>=ERROR"
```

#### Test Individual Components
1. **API Access**: Test task-fields endpoint
2. **Webhook Processing**: Use manual trigger
3. **Custom Field Update**: Check ClickUp field after manual trigger
4. **Notifications**: Verify PushCut token if using notifications

## Next Steps

### 1. Set Up PushCut Notifications (iOS)
1. Install PushCut app
2. Create notification named "Time To Leave"
3. Get API token from PushCut settings
4. Update function environment:
   ```bash
   gcloud functions deploy clickup-time-to-leave --region=us-central1 --update-env-vars PUSHCUT_TOKEN=your_token
   ```

### 2. Create More Appointment Tasks
Test with different appointment types:
- "📋 Doctor Appointment" (20min travel time)
- "💼 Office Meeting" (30min travel time)
- "🏋️ Gym Session" (15min travel time)

### 3. iOS Shortcuts Integration
Create iOS shortcuts that:
- Read ClickUp tasks with "appointment" tag
- Create calendar events with departure time alerts
- Integrate with Siri for voice commands

### 4. Monitor and Optimize
- Review function logs weekly
- Adjust travel times based on actual experience
- Add new keywords for specific locations
- Consider adding location-based travel time calculation

---

**Your automation is now running on Google Cloud and ready to help you never be late again!** 🎉
