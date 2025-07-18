# Keap Integration Guide

## Overview
This integration calculates the next billing date (15th or 27th of the month) for your Keap contacts and automatically updates their records.

## Setup in Keap HTTP Post

### Step 1: Create HTTP Post Action
1. In your Keap campaign, add an **HTTP Post** action
2. Configure as follows:

### Step 2: Configuration Settings

**URL:** 
```
https://keap-billing-calculator-el2lyxjihq-uc.a.run.app/calculate-billing-date
```

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "contactId": "~Contact.Id~",
  "date": "~Contact.DateCreated~",
  "delay": "5 days"
}
```

### Step 3: Field Explanations

| Field | Description | Required | Examples |
|-------|-------------|----------|----------|
| `contactId` | Keap contact ID | ✅ Yes | `"~Contact.Id~"` |
| `date` | Starting date for calculation | ✅ Yes | `"~Contact.DateCreated~"`, `"2024-01-10"` |
| `delay` | Time to wait before calculating | ❌ Optional | `"5 days"`, `"2 months"`, `""` |

## Delay Options

### Valid Delay Formats:
- **Days only:** `"5 days"`, `"1 day"`, `"30 days"`
- **Months only:** `"2 months"`, `"1 month"`, `"6 months"`
- **Combination:** `"3 days 2 months"`, `"1 month 5 days"`
- **No delay:** `""` or omit the field entirely

### Invalid Formats:
- ❌ `"2 weeks"` (use `"14 days"`)
- ❌ `"1 year"` (use `"12 months"`)
- ❌ `"2.5 months"` (use whole numbers only)

## Common Use Cases

### 1. New Customer Signup
```json
{
  "contactId": "~Contact.Id~",
  "date": "~Contact.DateCreated~",
  "delay": "7 days"
}
```
*Calculates billing date 7 days after signup*

### 2. Trial Period End
```json
{
  "contactId": "~Contact.Id~",
  "date": "~Contact.DateCreated~",
  "delay": "30 days"
}
```
*Calculates billing date after 30-day trial*

### 3. Immediate Billing Setup
```json
{
  "contactId": "~Contact.Id~",
  "date": "~Contact.DateCreated~",
  "delay": ""
}
```
*Calculates next billing date immediately*

### 4. Subscription Change
```json
{
  "contactId": "~Contact.Id~",
  "date": "~Contact.LastUpdated~",
  "delay": "1 month"
}
```
*Calculates new billing date 1 month from change*

## Expected Response

### Successful Response:
```json
{
  "success": true,
  "contactId": "12345",
  "originalDate": "2024-01-10",
  "calculatedDate": "2024-01-27",
  "dayOfMonth": 27,
  "delay": {"days": 5, "months": 0, "original": "5 days"},
  "integrations": {
    "airtable": {"success": true},
    "webhook": {"success": true}
  }
}
```

### What Happens:
1. ✅ **Calculates** next 15th or 27th of the month
2. ✅ **Stores** result in Airtable for tracking
3. ✅ **Triggers** Zapier webhook to update Keap contact
4. ✅ **Returns** calculated billing date

## Billing Date Logic

The system finds the **next occurrence** of either the 15th or 27th:

- **If today is Jan 10** → Next date is **Jan 15**
- **If today is Jan 20** → Next date is **Jan 27**  
- **If today is Jan 30** → Next date is **Feb 15**

**With delay:**
- **Jan 10 + 5 days** = Jan 15, so next billing date is **Jan 27**
- **Jan 10 + 2 months** = Mar 10, so next billing date is **Mar 15**

## Troubleshooting

### Common Errors:

**Error:** `"contactId is required"`
- **Fix:** Make sure you included the contactId field with `"~Contact.Id~"`

**Error:** `"date is required"`  
- **Fix:** Include a valid date field like `"~Contact.DateCreated~"`

**Error:** `"Invalid date format"`
- **Fix:** Use YYYY-MM-DD format or Keap merge fields

### Testing Your Setup:

Use this test request to verify everything works:
```json
{
  "contactId": "test123",
  "date": "2024-01-10", 
  "delay": "5 days"
}
```

Expected result: `"calculatedDate": "2024-01-27"`

## Advanced Options

### Skip Integrations (for testing):
```json
{
  "contactId": "~Contact.Id~",
  "date": "~Contact.DateCreated~",
  "delay": "5 days",
  "skipAirtable": true,
  "skipWebhook": true
}
```

### Multiple Contacts (bulk processing):
Use the `/bulk-calculate` endpoint for processing multiple contacts at once.

## Support

If you encounter issues:
1. Check the response for error messages
2. Verify your date format is correct
3. Ensure contactId is being passed properly
4. Test with a simple delay like `"5 days"`

The system logs all calculations in Airtable for tracking and debugging.