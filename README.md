# Zeyad Automation Hub

🚀 **Enterprise automation infrastructure and business workflows**

A comprehensive automation system integrating ClickUp, Google Cloud Platform, GitHub, and Google Docs for streamlined business operations.

## 🌟 Features

### ClickUp "Time To Leave" Automation
- **Smart Departure Calculation**: Automatically calculates when to leave for appointments
- **Intelligent Travel Time**: Customizable travel times based on appointment type and location
- **Real-time Updates**: Webhook-driven automation that responds instantly to schedule changes
- **Multi-channel Notifications**: PushCut, calendar alerts, and iOS integration

### Tech Stack
- ✅ **Google Cloud Platform** - Deploy and manage infrastructure (Primary)
- ✅ **GitHub** - Version control and code management  
- ✅ **ClickUp** - Project management integration
- ✅ **Google Docs** - Documentation management
- ✅ **PushCut** - iOS notifications

## 🚀 Quick Start (Google Cloud)

### 1. Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed ([Installation Guide](https://cloud.google.com/sdk/docs/install))
- ClickUp API key

### 2. Deploy to Google Cloud Functions
```bash
# Clone the repository
git clone https://github.com/imancipate/zeyad-automation-hub.git
cd zeyad-automation-hub

# Set your GCP project
gcloud config set project claude-mcp-docs-466120

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com

# Deploy the function
chmod +x deployment/gcp-deploy.sh
GCP_PROJECT_ID=claude-mcp-docs-466120 ./deployment/gcp-deploy.sh
```

### 3. Configure Environment Variables
```bash
# Set your ClickUp API key
gcloud functions deploy clickup-time-to-leave \
  --update-env-vars CLICKUP_API_KEY=pk_your_clickup_api_key

# Optional: Set PushCut token for notifications
gcloud functions deploy clickup-time-to-leave \
  --update-env-vars PUSHCUT_TOKEN=your_pushcut_token
```

### 4. Set Up ClickUp Webhook
In ClickUp, create webhook pointing to:
```
https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/clickup-webhook
```

## 📋 How It Works

1. **Task Creation**: Create ClickUp task with "appointment" tag
2. **Schedule Setting**: Set start date/time for your appointment
3. **Automatic Calculation**: System calculates departure time based on:
   - Custom travel times by keyword (mosque: 45min, office: 30min, etc.)
   - Default travel time (60 minutes)
4. **Field Update**: "Time To Leave" custom field updates automatically
5. **Notifications**: Receive alerts via:
   - PushCut notifications
   - Calendar reminders
   - iOS Shortcuts integration

## 🎯 Use Cases

### Daily Qur'an Class
- **Task**: "🕌 Daily Qur'an Class"
- **Start Time**: 7:00 PM
- **Travel Time**: 45 minutes (mosque keyword detected)
- **Departure**: 6:15 PM ✅

### Business Meetings
- **Task**: "📊 Client Presentation"
- **Start Time**: 2:00 PM
- **Travel Time**: 30 minutes (office keyword detected)
- **Departure**: 1:30 PM ✅

### Medical Appointments
- **Task**: "👨‍⚕️ Doctor Checkup"
- **Start Time**: 10:00 AM
- **Travel Time**: 20 minutes (doctor keyword detected)
- **Departure**: 9:40 AM ✅

## 🧪 Testing Your Deployment

### Health Check
```bash
curl https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/health
```

### Test with Your Existing Task
```bash
curl https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/task-fields/86aaarryw
```

### Manual Trigger Test
```bash
curl -X POST https://us-central1-claude-mcp-docs-466120.cloudfunctions.net/clickup-time-to-leave/manual-trigger/86aaarryw
```

## 🔧 Configuration

### Custom Travel Times
Edit `functions/clickup-time-to-leave/index.js`:

```javascript
customTravelTimes: {
  'mosque': 45,      // Mosque/Islamic center
  'office': 30,      // Office meetings
  'doctor': 20,      // Medical appointments
  'quran': 45,       // Qur'an classes
  'gym': 15,         // Fitness appointments
  'school': 25       // Educational meetings
}
```

### Required ClickUp Setup
1. **Create Custom Field**: Add "Time To Leave" (Date & Time type) to your lists
2. **Add Tags**: Use "appointment" tag for tasks that need departure time calculation
3. **Set Start Dates**: The automation triggers when start_date is set or changed

## 📱 Mobile Integration

### iOS Shortcuts
The system works with iOS Shortcuts for:
- Automatic calendar sync
- Location-based reminders
- Siri voice commands
- Widget support

### PushCut Notifications
- Time-sensitive alerts at departure time
- Custom notification sounds
- Action buttons for quick responses
- Smart notification scheduling

## 📊 Monitoring & Logs

### View Function Logs
```bash
gcloud functions logs read clickup-time-to-leave --region=us-central1
```

### Monitor Function Performance
```bash
gcloud functions describe clickup-time-to-leave --region=us-central1
```

## 🔄 Alternative Deployment Options

### Railway (Backup Option)
```bash
./deployment/railway-deploy.sh
```

### Heroku (Backup Option)
Deploy manually using the provided package.json

## 🚧 Roadmap

- [ ] **Google Calendar Integration** - Two-way sync with Google Calendar
- [ ] **Location-based Travel Time** - Google Maps integration for accurate travel estimates
- [ ] **Multiple Notification Channels** - Slack, email, SMS support
- [ ] **Task Templates** - Pre-configured appointment templates
- [ ] **Recurring Appointments** - Smart handling of recurring events
- [ ] **Analytics Dashboard** - Time management insights and reports

## 🎉 Ready to Use!

Your automation is now deployed to **Google Cloud Functions** and ready to help you never be late for your Qur'an classes or any other appointments!

**Test it now with your existing task**: "🕌 Daily Qur'an Class" (ID: 86aaarryw)

---

**Built with ❤️ for productivity and time management on Google Cloud Platform**

[🌟 Star this repo](https://github.com/imancipate/zeyad-automation-hub) | [🐛 Report Bug](https://github.com/imancipate/zeyad-automation-hub/issues) | [💡 Request Feature](https://github.com/imancipate/zeyad-automation-hub/issues)