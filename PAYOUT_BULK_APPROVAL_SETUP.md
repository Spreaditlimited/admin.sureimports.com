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

### 8. Debit Record Creation (Critical Financial Safeguard)
- ✅ Creates a `debits` table record for every successful payout
- ✅ Fetches user details (email, name) from database
- ✅ Uses Prisma transactions for atomicity
- ✅ Ensures debit record is created BEFORE marking payout as "Paid"
- ✅ Rolls back if debit creation fails
- ✅ Validates user exists before processing
- ✅ Handles duplicate pidDebit with retry logic
- ✅ Comprehensive audit logging

### 9. Database Updates
- ✅ Updates status to "Paid" for successful transfers (only after debit record created)
- ✅ Updates xStatus with Paystack transfer status
- ✅ Updates updatedAt timestamp
- ✅ Keeps status as "Failed" for failed transfers
- ✅ Refreshes table after updates
- ✅ Transaction-safe updates (all-or-nothing)

### 10. API Routes Created
- ✅ `POST /api/payout-requests/check-balance` - Check Paystack balance
- ✅ `POST /api/payout-requests/approve-bulk` - Process bulk transfer approval with debit record creation

### 11. Error Handling & User Feedback
- ✅ Loading states during processing
- ✅ Success toast for successful transfers
- ✅ Error toast with details for failed transfers
- ✅ Summary display after processing (X of Y successful)
- ✅ Prevents duplicate submissions while processing

### 12. Security & Audit Trail
- ✅ Admin passcode stored in environment variable
- ✅ Server-side passcode validation
- ✅ Paystack secret key from environment variables
- ✅ Comprehensive audit logging for all bulk transfer attempts
- ✅ Debit records provide complete financial audit trail
- ✅ Transaction-safe database operations prevent data inconsistency

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

## Critical Financial Safeguard: Debit Record Creation

### Why Debit Records Are Essential

The `debits` table is a **critical financial safeguard** that:
- Tracks all wallet debits for accurate balance management
- Provides a complete audit trail for all payout transactions
- Ensures financial integrity and prevents discrepancies
- Enables reconciliation between Paystack transfers and internal records
- **Every successful payout MUST have a corresponding debit record**

### How It Works

1. **Transaction Safety**: Uses Prisma transactions to ensure atomicity
   - Debit record is created FIRST
   - Payout status is updated to "Paid" ONLY if debit creation succeeds
   - If either operation fails, both are rolled back

2. **User Validation**: Before creating debit records:
   - Verifies that the user exists in the database
   - Fetches user email and full name
   - Validates all required fields have valid values

3. **Debit Record Fields**:
   - `pidDebit`: Unique ID (format: `DEB_timestamp_randomcode`)
   - `pidUser`: From `payoutrequest.pidUser`
   - `email`: Fetched from users table
   - `payerName`: User's full name from users table
   - `txID`: Paystack transfer_code
   - `txRef`: Payout reference
   - `paymentStatus`: "DEBITED"
   - `paymentType`: "BANK_PAYOUT"
   - `currency`: "NGN"
   - `amount`: Payout amount
   - `serviceID`: Payout ID (pidPayout)
   - `serviceName`: "Bank Payout"
   - `serviceDescription`: Payout reason or default message
   - `debitExt1`: Paystack recipient code
   - `debitExt2`: Paystack transfer code
   - `xStatus`: Paystack transfer status

4. **Error Handling**:
   - If user not found: Payout is NOT marked as "Paid"
   - If debit creation fails: Transaction is rolled back
   - If duplicate pidDebit: Automatically retries with new ID
   - All failures are logged for audit purposes

5. **Audit Logging**:
   - Every debit record creation is logged
   - Failed attempts are logged with details
   - Critical failures (Paystack success but DB failure) are flagged

### Financial Integrity Guarantee

**The system guarantees that:**
- ✅ No payout can be marked "Paid" without a debit record
- ✅ Debit amount always matches payout amount
- ✅ User details are validated before processing
- ✅ All operations are atomic (all-or-nothing)
- ✅ Complete audit trail is maintained

**If debit record creation fails:**
- ❌ Payout status remains "Pending"
- ❌ Transaction is rolled back
- ❌ Error is logged and reported to admin
- ❌ Manual intervention required

## Database Schema Requirements

### Payoutrequest Table

Ensure your `payoutrequest` table has the following fields:

```prisma
model payoutrequest {
  id         Int       @id @default(autoincrement())
  pidPayout  String    @unique()
  pidUser    String?   // REQUIRED for debit record creation
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

### Debits Table

The `debits` table stores all wallet debit transactions:

```prisma
model debits {
  id                   Int       @id @default(autoincrement())
  pidDebit             String    @unique()
  pidUser              String    // User ID
  email                String    // User email
  payerName            String    // User full name
  txID                 String    // Paystack transfer code
  txRef                String    // Transfer reference
  paymentStatus        String?   // "DEBITED" for payouts
  paymentType          String?   // "BANK_PAYOUT"
  currency             String?   // "NGN"
  amount               Float     // Debit amount (matches payout amount)
  serviceID            String?   // Payout ID (pidPayout)
  serviceName          String?   // "Bank Payout"
  serviceDescription   String?   // Payout reason
  status1              String?   // "SUCCESS"
  status2              String?   // Additional status
  debitExt1            String?   // Paystack recipient code
  debitExt2            String?   // Paystack transfer code
  xStatus              String?   // Paystack transfer status
  createdAt            DateTime? @default(now())
  updatedAt            DateTime?
}
```

### Users Table

User details are fetched from this table for debit records:

```prisma
model users {
  id                   Int       @id @default(autoincrement())
  pidUser              String    @unique()
  userFirstname        String?   // Used for payerName
  userLastname         String?   // Used for payerName
  userEmail            String    @unique() // Used for debit email
  // ... other fields
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

**Test Case 6: Debit Record Creation**
- Select and approve a payout
- After successful transfer, verify:
  - Debit record exists in `debits` table
  - `pidDebit` is unique and follows format `DEB_timestamp_randomcode`
  - `pidUser` matches payout request
  - `email` and `payerName` are correctly fetched from users table
  - `txID` contains Paystack transfer_code
  - `amount` matches payout amount
  - `paymentStatus` is "DEBITED"
  - `paymentType` is "BANK_PAYOUT"
  - Payout status is "Paid"

**Test Case 7: User Not Found**
- Create payout with invalid `pidUser`
- Attempt to approve
- Verify:
  - Error message: "User not found - cannot create debit record"
  - Payout status remains "Pending"
  - No debit record is created

**Test Case 8: Transaction Rollback**
- Simulate database error during debit creation
- Verify:
  - Payout status remains "Pending"
  - No partial updates occur
  - Error is logged
  - Admin is notified of failure

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

### Issue: "User not found - cannot create debit record"
**Solution**:
- Verify `pidUser` exists in payout request
- Check that user exists in `users` table
- Ensure `pidUser` matches between tables

### Issue: "Database update failed" after successful Paystack transfer
**Solution**:
- **CRITICAL**: Paystack transfer succeeded but debit record creation failed
- Check server logs for detailed error message
- Verify `debits` table schema matches requirements
- Check for database connection issues
- **Manual intervention required**: Create debit record manually to maintain financial integrity
- Contact system administrator immediately

### Issue: Duplicate pidDebit error
**Solution**:
- System automatically retries with new ID
- If retry fails, check logs for details
- Verify `pidDebit` uniqueness constraint in database

### Issue: Payout marked "Paid" but no debit record
**Solution**:
- **CRITICAL FINANCIAL ISSUE**: This should never happen with the new system
- Check server logs for transaction failures
- Verify Prisma transaction is working correctly
- Create debit record manually using transfer details from logs
- Report bug to development team immediately

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

