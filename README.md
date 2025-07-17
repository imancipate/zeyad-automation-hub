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
- ✅ **Google Cloud Platform** - Deploy and manage infrastructure
- ✅ **GitHub** - Version control and code management  
- ✅ **ClickUp** - Project management integration
- ✅ **Google Docs** - Documentation management
- ✅ **PushCut** - iOS notifications
- ✅ **Railway/Heroku** - Alternative hosting options

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/imancipate/zeyad-automation-hub.git
cd zeyad-automation-hub
```

### 2. Set Up ClickUp
1. Create "Time To Leave" custom field (Date & Time type)
2. Get your ClickUp API key
3. Note your workspace/team IDs

### 3. Deploy (Choose One)

#### Option A: Google Cloud Functions
```bash
export GCP_PROJECT_ID="your-project-id"
./deployment/gcp-deploy.sh
```

#### Option B: Railway (Recommended for beginners)
```bash
./deployment/railway-deploy.sh
```

### 4. Configure Environment
Set these variables in your hosting platform:
```bash
CLICKUP_API_KEY=pk_your_api_key
PUSHCUT_TOKEN=your_token  # optional
```

### 5. Set Up Webhook
In ClickUp, create webhook pointing to:
`https://your-function-url/clickup-webhook`

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
- **Travel Time**: 45 minutes (mosque)
- **Departure**: 6:15 PM ✅

### Business Meetings
- **Task**: "📊 Client Presentation"
- **Start Time**: 2:00 PM
- **Travel Time**: 30 minutes (office)
- **Departure**: 1:30 PM ✅

### Medical Appointments
- **Task**: "👨‍⚕️ Doctor Checkup"
- **Start Time**: 10:00 AM
- **Travel Time**: 20 minutes (doctor)
- **Departure**: 9:40 AM ✅

---

**Built with ❤️ for productivity and time management**
