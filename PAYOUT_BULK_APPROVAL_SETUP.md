# Bulk Payout Approval System - Setup Guide

## Overview
This document provides setup instructions for the bulk payout approval system integrated with Paystack API.

## Features Implemented

### 1. Checkbox Selection
- ✅ Checkbox column added to payout requests table
- ✅ "Select All" checkbox in table header
- ✅ Only pending records can be selected
- ✅ Non-pending records have disabled/grayed out checkboxes
- ✅ Selected rows are highlighted with blue background

### 2. Approve Payment Button
- ✅ Positioned in the summary card at the top
- ✅ Disabled when no records are selected
- ✅ Shows count of selected records (e.g., "Approve Payment (3)")
- ✅ Green color to indicate action button

### 3. Selected Total Amount Display
- ✅ Shows total amount of selected payouts in summary card
- ✅ Displays separately from overall total
- ✅ Updates dynamically as checkboxes are selected/deselected
- ✅ Shows count: "X of Y requests selected"

### 4. Approval Modal
- ✅ Opens when "Approve Payment" is clicked
- ✅ Lists all selected payout requests (pidPayout, recipient, amount)
- ✅ Shows total amount to be paid out
- ✅ Displays available balance from Paystack
- ✅ Checks if sufficient funds exist
- ✅ Input field for admin secret passcode
- ✅ "Confirm Payment" and "Cancel" buttons
- ✅ Server-side passcode validation

### 5. Balance Check
- ✅ Calls Paystack Balance API before showing confirmation
- ✅ Compares available balance with total selected amount
- ✅ Shows error if insufficient funds
- ✅ Displays available balance in modal
- ✅ Retry button if balance check fails

### 6. Bulk Transfer Processing
- ✅ Uses Paystack "Initiate Bulk Transfer" API (POST /transfer/bulk)
- ✅ Sends recipient code, amount (in kobo), reference, and reason
- ✅ Sets source to "balance" and currency to "NGN"
- ✅ Handles Paystack API responses

### 7. Transfer Verification
- ✅ Processes bulk transfer response from Paystack
- ✅ Checks status for each transfer
- ✅ Handles both successful and failed transfers

### 8. Database Updates
- ✅ Updates status to "Paid" for successful transfers
- ✅ Updates xStatus with Paystack transfer status
- ✅ Updates updatedAt timestamp
- ✅ Keeps status as "Failed" for failed transfers
- ✅ Refreshes table after updates

### 9. API Routes Created
- ✅ `POST /api/payout-requests/check-balance` - Check Paystack balance
- ✅ `POST /api/payout-requests/approve-bulk` - Process bulk transfer approval

### 10. Error Handling & User Feedback
- ✅ Loading states during processing
- ✅ Success toast for successful transfers
- ✅ Error toast with details for failed transfers
- ✅ Summary display after processing (X of Y successful)
- ✅ Prevents duplicate submissions while processing

### 11. Security
- ✅ Admin passcode stored in environment variable
- ✅ Server-side passcode validation
- ✅ Paystack secret key from environment variables
- ✅ Audit logging for all bulk transfer attempts

## Environment Variables Required

Add the following environment variables to your `.env` file:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here

# Admin Payout Passcode
ADMIN_PAYOUT_PASSCODE=your_secure_passcode_here
```

### Getting Your Paystack Secret Key

1. Log in to your Paystack Dashboard: https://dashboard.paystack.com/
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Copy your **Secret Key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)
4. Add it to your `.env` file

### Setting Admin Passcode

1. Choose a secure passcode for admin approval
2. Add it to your `.env` file as `ADMIN_PAYOUT_PASSCODE`
3. Share this passcode only with authorized administrators
4. **Default**: If not set, the system uses `admin123` (for development only)

## Important Paystack Setup Requirements

### 1. Disable OTP for Transfers

The Paystack Bulk Transfer API requires OTP to be disabled on your dashboard:

1. Log in to Paystack Dashboard
2. Go to **Settings** → **Preferences**
3. Find **Transfer Settings**
4. Disable **"Require OTP for transfers"**
5. Save changes

⚠️ **Security Note**: Disabling OTP means transfers can be initiated programmatically. Ensure your admin passcode is strong and secure.

### 2. Create Transfer Recipients

Before processing payouts, ensure transfer recipients are created in Paystack:

**Option A: Create via Paystack Dashboard**
1. Go to **Transfers** → **Recipients**
2. Click **"Add Recipient"**
3. Enter bank details and save
4. Copy the recipient code (e.g., `RCP_xxxxx`)

**Option B: Create via API**
Use the Paystack Create Transfer Recipient API:

```javascript
POST https://api.paystack.co/transferrecipient
Headers: {
  Authorization: Bearer YOUR_SECRET_KEY
  Content-Type: application/json
}
Body: {
  type: "nuban",
  name: "Customer Name",
  account_number: "0123456789",
  bank_code: "058",
  currency: "NGN"
}
```

**Important**: The `recipient` field in the `payoutrequest` table must contain the Paystack recipient code (e.g., `RCP_xxxxx`).

### 3. Verify Bank Account Numbers

Before creating recipients, verify bank account numbers using Paystack's Resolve Account Number API:

```javascript
GET https://api.paystack.co/bank/resolve?account_number=0123456789&bank_code=058
Headers: {
  Authorization: Bearer YOUR_SECRET_KEY
}
```

This returns the account name for verification.

## Database Schema Requirements

Ensure your `payoutrequest` table has the following fields:

```prisma
model payoutrequest {
  id         Int       @id @default(autoincrement())
  pidPayout  String    @unique()
  pidUser    String?
  amount     Float?
  recipient  String?   // Must contain Paystack recipient code (RCP_xxxxx)
  reference  String?   // Unique reference for the transfer
  reason     String?   // Reason for the payout
  status     String?   // Pending, Paid, Failed, Cancelled
  xStatus    String?   // Paystack transfer status
  createdAt  DateTime? @default(now())
  updatedAt  DateTime?
}
```

## Testing the Implementation

### 1. Test Mode Setup

1. Use Paystack test secret key (starts with `sk_test_`)
2. Create test transfer recipients
3. Ensure test balance is available in Paystack dashboard

### 2. Test Flow

1. Navigate to `/dashboard/payout-requests/requests`
2. Ensure there are payout requests with status "Pending"
3. Select one or more pending payouts using checkboxes
4. Click "Approve Payment (X)" button
5. Verify balance check displays correctly
6. Enter admin passcode
7. Click "Confirm Payment"
8. Wait for processing to complete
9. Verify results are displayed
10. Check that table refreshes with updated statuses

### 3. Test Cases

**Test Case 1: Successful Transfer**
- Select pending payouts with valid recipient codes
- Ensure sufficient balance
- Enter correct passcode
- Verify transfers complete successfully
- Check database records are updated to "Paid"

**Test Case 2: Insufficient Balance**
- Select payouts totaling more than available balance
- Verify error message is displayed
- Confirm "Confirm Payment" button is disabled

**Test Case 3: Invalid Passcode**
- Enter incorrect passcode
- Verify error message: "Invalid passcode"
- Check that transfers are not processed

**Test Case 4: Missing Recipient Code**
- Create payout request without recipient code
- Attempt to approve
- Verify error message about missing recipient code

**Test Case 5: Mixed Results**
- If some transfers fail, verify:
  - Successful transfers are marked "Paid"
  - Failed transfers are marked "Failed"
  - Summary shows correct counts

## API Endpoints Documentation

### Check Balance

**Endpoint**: `POST /api/payout-requests/check-balance`

**Request**: No body required

**Response**:
```json
{
  "success": true,
  "balance": {
    "available": 50000.00,
    "currency": "NGN"
  }
}
```

### Approve Bulk Payouts

**Endpoint**: `POST /api/payout-requests/approve-bulk`

**Request**:
```json
{
  "payoutIds": ["PID_001", "PID_002", "PID_003"],
  "passcode": "your_admin_passcode"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Processed 3 transfers",
  "results": [
    {
      "pidPayout": "PID_001",
      "success": true,
      "message": "Transfer initiated successfully",
      "transfer_code": "TRF_xxxxx"
    },
    {
      "pidPayout": "PID_002",
      "success": true,
      "message": "Transfer initiated successfully",
      "transfer_code": "TRF_yyyyy"
    },
    {
      "pidPayout": "PID_003",
      "success": false,
      "message": "Transfer failed: insufficient_balance"
    }
  ]
}
```

## Troubleshooting

### Issue: "Paystack secret key not configured"
**Solution**: Add `PAYSTACK_SECRET_KEY` to your `.env` file

### Issue: "Invalid passcode"
**Solution**: Verify `ADMIN_PAYOUT_PASSCODE` in `.env` matches the entered passcode

### Issue: "Failed to check balance"
**Solution**: 
- Verify Paystack secret key is correct
- Check internet connection
- Verify Paystack API is accessible

### Issue: "Missing recipient code"
**Solution**: 
- Create transfer recipients in Paystack
- Update `payoutrequest.recipient` field with recipient codes

### Issue: "Insufficient balance"
**Solution**: 
- Add funds to your Paystack balance
- Or reduce the number of selected payouts

### Issue: "OTP required for transfers"
**Solution**: Disable OTP in Paystack Dashboard → Settings → Preferences

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong admin passcode** (minimum 12 characters, mix of letters, numbers, symbols)
3. **Rotate passcode regularly** (every 90 days recommended)
4. **Monitor audit logs** for suspicious activity
5. **Use HTTPS** in production
6. **Limit admin access** to authorized personnel only
7. **Enable Paystack webhooks** to receive transfer status updates
8. **Set up alerts** for large transfers

## Production Deployment Checklist

- [ ] Add production Paystack secret key to environment variables
- [ ] Set strong admin passcode
- [ ] Disable OTP for transfers in Paystack dashboard
- [ ] Create all necessary transfer recipients
- [ ] Test with small amounts first
- [ ] Set up monitoring and alerts
- [ ] Configure audit logging
- [ ] Document passcode recovery process
- [ ] Train administrators on the system
- [ ] Set up backup and recovery procedures

## Support and Resources

- **Paystack Documentation**: https://paystack.com/docs/
- **Paystack Bulk Transfer API**: https://paystack.com/docs/transfers/initiate-bulk-transfer/
- **Paystack Support**: support@paystack.com
- **Dashboard**: https://dashboard.paystack.com/

## Changelog

### Version 1.0.0 (Initial Release)
- Implemented checkbox selection for pending payouts
- Added approve payment button with selected count
- Created approval modal with balance check
- Integrated Paystack Bulk Transfer API
- Added transfer verification and database updates
- Implemented comprehensive error handling
- Added audit logging for security

