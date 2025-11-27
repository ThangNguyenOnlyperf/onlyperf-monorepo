# Sepay Payment Integration Documentation

## Overview

This integration provides complete QR code banking payment functionality for your warehouse management system using Sepay's webhook system. It automatically detects bank transfers and updates order payment status in real-time.

## Features

- **QR Code Generation**: Creates unique payment codes and QR codes for each order
- **Webhook Processing**: Receives and processes transaction notifications from Sepay
- **Real-time Updates**: Automatically updates order payment status when payments are detected
- **Admin Dashboard**: Full transaction management and manual linking capabilities
- **Security**: Optional API key authentication and IP whitelist support

## Architecture

### Database Schema
- **`sepay_transactions`**: Stores all transaction data from Sepay webhooks
- **`orders`**: Links to transactions and updates payment status automatically

### Key Components
1. **Payment Page** (`/payment`): QR code display and payment status
2. **Webhook Endpoint** (`/api/webhooks/sepay`): Receives Sepay notifications
3. **Admin Dashboard** (`/admin/sepay`): Transaction management interface
4. **Order Integration**: Payment buttons in order details page

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example.sepay .env.local
```

Configure these variables in `.env.local`:

```env
# Optional: API key for webhook authentication
SEPAY_API_KEY=your_api_key_here

# Optional: Comma-separated list of allowed IP addresses for webhook
SEPAY_ALLOWED_IPS=123.456.789.0,123.456.789.1

# Bank account information for QR code generation
BANK_ACCOUNT_NAME=Your Business Name
BANK_ACCOUNT_NUMBER=123456789
BANK_NAME=Your Bank Name
BANK_BRANCH=Your Bank Branch
```

### 2. Sepay Webhook Configuration

1. Log into your Sepay account
2. Navigate to **Webhooks** menu
3. Add a new webhook with these settings:
   - **URL**: `https://your-domain.com/api/webhooks/sepay`
   - **Authentication**: "Không cần chứng thực" (No authentication) or API Key if configured
   - **Events**: All transaction events

### 3. Testing

Use Sepay's demo account to test the integration:

1. Log into the demo account
2. Go to **Giao dịch → Giả lập giao dịch**
3. Create a test transaction matching your webhook configuration
4. Check the webhook status in **Nhật ký WebHooks**
5. Verify transactions appear in your admin dashboard

## Usage Guide

### For Customers

1. **Payment Initiation**: 
   - Customer clicks "Thanh toán ngay" on order details page
   - System generates unique payment code and QR code
   - Customer scans QR code with banking app

2. **Payment Confirmation**:
   - Customer completes bank transfer
   - Sepay detects the transaction automatically
   - System updates order status to "Đã thanh toán"
   - Customer receives confirmation and is redirected to order page

### For Administrators

1. **Monitor Transactions**:
   - Visit `/admin/sepay` to view all transactions
   - Filter by status, search by reference code
   - View detailed transaction information

2. **Manual Processing**:
   - Link unmatched transactions to orders manually
   - Handle edge cases and exceptions
   - Monitor payment status updates

## API Endpoints

### Webhook Endpoint
```
POST /api/webhooks/sepay
```

**Headers** (optional):
- `x-api-key`: API key for authentication

**Body** (Sepay webhook data):
```json
{
  "gateway": "VCB",
  "transactionDate": "2024-01-01T12:00:00Z",
  "accountNumber": "123456789",
  "subAccount": "",
  "transferType": "in",
  "transferAmount": 100000,
  "accumulated": 500000,
  "code": "ABC123",
  "content": "Payment for order ORD001",
  "referenceCode": "WHM1704067200000XYZ",
  "description": "Bank transfer description"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Transaction processed successfully"
}
```

## Payment Flow Diagram

```
Customer → Order Page → Click "Pay Now" → Payment Page
    ↓
Scan QR Code → Bank Transfer → Sepay Detection
    ↓
Sepay Webhook → Your System → Database Update
    ↓
Order Status → "Paid" → Customer Notification
```

## Security Considerations

1. **Webhook Authentication**:
   - Use API keys if available
   - Implement IP whitelisting
   - Validate incoming data structure

2. **Transaction Validation**:
   - Check for duplicate transactions
   - Validate transaction amounts
   - Verify reference codes

3. **Data Protection**:
   - Store sensitive transaction data securely
   - Log webhook activities for audit trails
   - Implement rate limiting if needed

## Troubleshooting

### Common Issues

1. **Webhook Not Received**:
   - Check Sepay webhook configuration
   - Verify URL accessibility
   - Check firewall/cors settings

2. **Transaction Not Processed**:
   - Check webhook logs in Sepay dashboard
   - Verify data format matches expected schema
   - Check server error logs

3. **Payment Status Not Updated**:
   - Verify transaction reference code matching
   - Check order linking logic
   - Review manual processing options

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=sepay:*
```

This will log detailed webhook processing information.

## Maintenance

1. **Regular Tasks**:
   - Monitor webhook delivery success rates
   - Review unmatched transactions
   - Update bank account information as needed

2. **Monitoring**:
   - Track transaction processing times
   - Monitor webhook endpoint availability
   - Set up alerts for failed webhooks

## Support

For issues related to:
- **Sepay API/Webhooks**: Contact Sepay support
- **Integration Code**: Check this documentation and source code
- **Database Issues**: Review Drizzle ORM migrations

## Future Enhancements

Potential improvements to consider:
- QR code library integration for actual QR generation
- Multiple payment gateway support
- Advanced transaction matching algorithms
- Customer notification system (email/SMS)
- Refund processing capabilities
- Transaction export and reporting features