# Billing Date Calculator API Documentation

## Base URL
```
https://keap-billing-calculator-el2lyxjihq-uc.a.run.app
```

## Authentication
No authentication required for public endpoints.

## Endpoints

### GET /
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "message": "Keap Billing Date Calculator with Airtable & Webhook Integration",
  "features": {
    "airtable": true,
    "webhook": true
  },
  "endpoints": {
    "POST /calculate-billing-date": "Calculate billing date, store in Airtable, and call webhook",
    "GET /billing-date/:contactId": "Get stored billing date from Airtable"
  }
}
```

---

### POST /calculate-billing-date
Calculate the next billing date for a contact with optional delay.

**Request Body:**
```json
{
  "contactId": "string (required)",
  "date": "string (required, YYYY-MM-DD format)",
  "delay": "string (optional)",
  "skipWebhook": "boolean (optional)",
  "skipAirtable": "boolean (optional)"
}
```

**Parameters:**

| Parameter | Type | Required | Description | Examples |
|-----------|------|----------|-------------|----------|
| `contactId` | string | ✅ Yes | Keap contact identifier | `"12345"`, `"~Contact.Id~"` |
| `date` | string | ✅ Yes | Starting date for calculation | `"2024-01-10"`, `"~Contact.DateCreated~"` |
| `delay` | string | ❌ No | Time to wait before calculating | `"5 days"`, `"2 months"`, `"3 days 1 month"` |
| `skipWebhook` | boolean | ❌ No | Skip webhook call (for testing) | `true`, `false` |
| `skipAirtable` | boolean | ❌ No | Skip Airtable storage (for testing) | `true`, `false` |

**Delay Format:**
- **Days:** `"5 days"`, `"1 day"`, `"30 days"`
- **Months:** `"2 months"`, `"1 month"`, `"12 months"`
- **Combined:** `"3 days 2 months"`, `"1 month 15 days"`
- **Empty:** `""` or omit field for immediate calculation

**Success Response (200):**
```json
{
  "success": true,
  "contactId": "12345",
  "originalDate": "2024-01-10",
  "delay": {
    "days": 5,
    "months": 0,
    "original": "5 days"
  },
  "calculatedDate": "2024-01-27",
  "dayOfMonth": 27,
  "message": "Billing date calculated for contact 12345",
  "integrations": {
    "airtable": {
      "attempted": true,
      "success": true,
      "recordId": "recXXXXXXXXXXXXXX"
    },
    "webhook": {
      "attempted": true,
      "success": true
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Missing contactId:**
```json
{
  "error": "contactId is required",
  "example": {
    "contactId": "12345",
    "date": "2024-01-10",
    "delay": "5 days 2 months"
  }
}
```

**400 Bad Request - Invalid date:**
```json
{
  "error": "Invalid date format. Use YYYY-MM-DD",
  "example": {
    "contactId": "12345",
    "date": "2024-01-10"
  }
}
```

---

## Date Calculation Logic

The service uses this logic to find the next billing date:

1. **Apply delay** to the input date (if specified)
2. **Check 15th** of current month - if future, use it
3. **Check 27th** of current month - if future, use it  
4. **Use 15th** of next month if both current month dates have passed

### Examples:

| Input Date | Delay | Adjusted Date | Next Billing Date | Reason |
|------------|-------|---------------|-------------------|---------|
| 2024-01-10 | none | 2024-01-10 | 2024-01-15 | 15th is future |
| 2024-01-10 | 5 days | 2024-01-15 | 2024-01-27 | 15th passed, 27th future |
| 2024-01-20 | none | 2024-01-20 | 2024-01-27 | 15th passed, 27th future |
| 2024-01-30 | none | 2024-01-30 | 2024-02-15 | Both dates passed |
| 2024-01-10 | 2 months | 2024-03-10 | 2024-03-15 | 15th is future |

## Webhook Payload

When a billing date is calculated, the webhook receives:

```json
{
  "contactId": "12345",
  "calculatedBillingDate": "2024-01-27",
  "dayOfMonth": 27,
  "originalDate": "2024-01-10",
  "delay": {
    "days": 5,
    "months": 0,
    "original": "5 days"
  },
  "timestamp": "2024-07-18T10:30:00.000Z",
  "source": "billing-date-calculator"
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Contact not found |
| 500 | Internal Server Error |