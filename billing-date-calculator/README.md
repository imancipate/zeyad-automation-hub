# Keap Billing Date Calculator

A microservice that calculates next billing dates (15th or 27th of the month) for Keap contacts with optional delays, Airtable storage, and Zapier webhook integration.

## 🚀 Features

- **Smart Date Calculation**: Finds next occurrence of 15th or 27th of the month
- **Flexible Delays**: Support for days and months (`"5 days"`, `"2 months"`, `"3 days 1 month"`)
- **Airtable Integration**: Stores all calculations for tracking and analytics
- **Zapier Webhook**: Automatically updates Keap contacts with calculated dates
- **Bulk Processing**: Handle multiple contacts at once
- **Error Handling**: Graceful failure with detailed error messages

## 🏗 Architecture

```
Keap Campaign → HTTP POST → Billing Calculator → Airtable Storage
                                     ↓
                            Zapier Webhook → Update Keap Contact
```

## 🎯 Live Service

**URL:** https://keap-billing-calculator-el2lyxjihq-uc.a.run.app

## 📋 Quick Start

### Prerequisites
- Google Cloud Project
- Airtable account with API access
- Zapier webhook (optional)

### Deployment
```bash
# Clone and navigate
git clone https://github.com/imancipate/zeyad-automation-hub.git
cd zeyad-automation-hub/billing-date-calculator

# Deploy to Google Cloud Run
gcloud run deploy keap-billing-calculator \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "AIRTABLE_API_KEY=your_key,AIRTABLE_BASE_ID=your_base,WEBHOOK_URL=your_webhook"
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|-----------|
| `AIRTABLE_API_KEY` | Airtable API token | Yes |
| `AIRTABLE_BASE_ID` | Your CRM base ID | Yes |
| `AIRTABLE_TABLE_NAME` | Table name (default: "Script Results") | No |
| `WEBHOOK_URL` | Zapier webhook URL | No |
| `NODE_ENV` | Environment (production/development) | No |

## 📖 API Endpoints

### POST /calculate-billing-date
Calculate and store billing date for a contact.

**Request:**
```json
{
  "contactId": "12345",
  "date": "2024-01-10",
  "delay": "5 days"
}
```

**Response:**
```json
{
  "success": true,
  "contactId": "12345",
  "calculatedDate": "2024-01-27",
  "dayOfMonth": 27,
  "integrations": {
    "airtable": {"success": true},
    "webhook": {"success": true}
  }
}
```

### GET /billing-date/:contactId
Retrieve stored billing date for a contact.

### POST /bulk-calculate
Process multiple contacts at once.

## 🎯 Keap Integration

Use in Keap HTTP Post actions:

**URL:** `https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/calculate-billing-date`

**Body:**
```json
{
  "contactId": "~Contact.Id~",
  "date": "~Contact.DateCreated~",
  "delay": "5 days"
}
```

## 📊 Billing Date Logic

The service finds the **next occurrence** of either the 15th or 27th:

- **Current date: Jan 10** → Next: **Jan 15**
- **Current date: Jan 20** → Next: **Jan 27**
- **Current date: Jan 30** → Next: **Feb 15**

**With delays:**
- **Jan 10 + 5 days** = Jan 15 → Next: **Jan 27**
- **Jan 10 + 2 months** = Mar 10 → Next: **Mar 15**

## 💾 Data Storage

All calculations are stored in Airtable with:
- Contact ID and calculation details
- Input parameters and results
- Execution timestamps
- Success/error status

## 🔗 Webhook Integration

Automatically sends calculated dates to Zapier:

```json
{
  "contactId": "12345",
  "calculatedBillingDate": "2024-01-27",
  "dayOfMonth": 27,
  "originalDate": "2024-01-10",
  "delay": {"days": 5, "months": 0},
  "timestamp": "2024-07-18T10:30:00.000Z",
  "source": "billing-date-calculator"
}
```

## 🧪 Testing

```bash
# Health check
curl https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/

# Calculate billing date
curl -X POST https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/calculate-billing-date \
  -H "Content-Type: application/json" \
  -d '{"contactId": "test123", "date": "2024-01-10", "delay": "5 days"}'
```

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Keap Integration Guide](docs/keap-integration.md)
- [Deployment Instructions](deployment/deploy-instructions.md)

## 🚨 Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|-----------|
| `contactId is required` | Missing contact ID | Include contactId in request |
| `Invalid date format` | Wrong date format | Use YYYY-MM-DD format |
| `Airtable error` | API key/permissions | Check Airtable credentials |

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Added bulk processing and error handling
- **v1.2.0**: Enhanced Airtable integration and webhook support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the Zeyad Automation Hub - see the main repository for licensing details.

## 🆘 Support

For issues and questions:
- Check the [API documentation](docs/API.md)
- Review [common issues](docs/troubleshooting.md)
- Create an issue in this repository