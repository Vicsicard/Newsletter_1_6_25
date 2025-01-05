# Brevo Email Integration Guide

## Overview
This document outlines the integration with Brevo (formerly Sendinblue) for sending newsletter emails in our application.

## Environment Variables
Required environment variables for Brevo integration:
```env
BREVO_API_KEY=your_api_key_here
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Your Company Name
```

## API Integration
The integration is implemented in `utils/email.ts` and provides the following functionality:

### Core Functions
- `sendEmail`: Sends a single email using Brevo's SMTP API
- `validateEmail`: Validates email format
- `sendNewsletterDraft`: Sends newsletter drafts to specified recipients

### Rate Limits
- Brevo Free Plan: 300 emails per day
- API Rate Limit: 6 calls per second
- Recommended: Implement exponential backoff for retries

### Error Handling
The integration includes comprehensive error handling for:
- Invalid API credentials
- Rate limiting
- Network failures
- Invalid email formats
- Recipient validation

## Testing
Test the integration using:
```bash
npm run test:email
```

## Monitoring
Monitor email sending status and errors in:
- Brevo Dashboard
- Application logs
- Error tracking system

## Best Practices
1. Always validate email addresses before sending
2. Implement retry logic for failed sends
3. Use HTML templates for consistent formatting
4. Monitor sending limits and quotas
5. Keep API keys secure and rotate regularly
