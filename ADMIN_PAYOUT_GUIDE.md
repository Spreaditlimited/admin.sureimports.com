# Administrator Guide: Bulk Payout Approval

## Quick Start Guide

### How to Approve Payouts

1. **Navigate to Payout Requests**
   - Go to Dashboard → Payout Requests → Requests
   - URL: `/dashboard/payout-requests/requests`

2. **Filter Pending Payouts**
   - The status filter defaults to "Pending"
   - You can also filter by "Paid" or "Cancelled" to view history

3. **Select Payouts to Approve**
   - Check the boxes next to the payouts you want to approve
   - Only pending payouts can be selected (others are grayed out)
   - Use "Select All" checkbox to select all pending payouts on the current page

4. **Review Selected Amount**
   - The summary card at the top shows:
     - Total amount of selected payouts
     - Number of selected requests
     - Overall total for the current filter

5. **Click "Approve Payment"**
   - The green "Approve Payment (X)" button appears when payouts are selected
   - Click it to open the approval modal

6. **Review Approval Details**
   - **Available Balance**: Shows your current Paystack balance
   - **Original Amount**: Total amount requested by users
   - **Service Charge (2%)**: Total fees to be deducted (capped at ₦2,000 per transaction)
   - **Net Transfer Amount**: Actual amount that will be sent to banks
   - **Balance Check**: Green checkmark if sufficient, red X if insufficient
   - **Selected Payouts List**: Review all payouts with breakdown:
     - Original amount column
     - Service charge column (shown in orange)
     - Net transfer amount column
   - **Service Charge Notice**: Orange notice explaining the 2% fee structure

7. **Enter Admin Passcode**
   - Enter your secure admin passcode
   - This passcode is set in the system configuration
   - Contact your system administrator if you don't have it

8. **Confirm Payment**
   - Click "Confirm Payment" to process the transfers
   - Wait for processing to complete (do not close the window)
   - A loading indicator will show progress

9. **Review Results**
   - After processing, you'll see results for each transfer:
     - ✅ Success: Transfer completed, debit record created, and email sent to user
     - ❌ Failed: Transfer failed (with reason)
   - A summary toast notification will appear
   - Users will receive email notifications for successful transfers
   - The table will automatically refresh

10. **Close Modal**
    - Click "Close" to return to the payout requests table
    - Successfully processed payouts will now show status "Paid"
    - **Important**: Each successful payout has a corresponding debit record in the system for financial tracking

## Service Charge Information

### 2% Service Charge

**All payout transfers are subject to a 2% service charge, capped at ₦2,000 per transaction.**

**How it works:**
- Users request a payout amount (e.g., ₦10,000)
- System calculates 2% service charge (e.g., ₦200)
- Net amount is transferred to user's bank (e.g., ₦9,800)
- Full original amount is debited from user's wallet (e.g., ₦10,000)

**Examples:**

| Original Amount | Service Charge (2%) | Net Transfer | Wallet Debit |
|----------------|---------------------|--------------|--------------|
| ₦10,000 | ₦200 | ₦9,800 | ₦10,000 |
| ₦50,000 | ₦1,000 | ₦49,000 | ₦50,000 |
| ₦100,000 | ₦2,000 (at cap) | ₦98,000 | ₦100,000 |
| ₦200,000 | ₦2,000 (capped) | ₦198,000 | ₦200,000 |

**Important Notes:**
- ✅ Service charge is **capped at ₦2,000** regardless of payout size
- ✅ Users receive the **net amount** in their bank account
- ✅ Full **original amount** is debited from their wallet
- ✅ Service charge is tracked in debit records for audit purposes
- ✅ Paystack balance is checked against the **net transfer amount**

---

## Understanding the Interface

### Summary Card (Top Section)

```
┌─────────────────────────────────────────────────────────────┐
│ Total Payout Amount (Pending)                               │
│ ₦200,000.00                                                 │
│                                                             │
│ Selected for Approval                                       │
│ ₦50,000.00                                                  │
│ 3 of 10 requests selected                                   │
│                                                             │
│ [Approve Payment (3)]  ← Green button appears when selected │
└─────────────────────────────────────────────────────────────┘
```

### Table Columns

| Column | Description |
|--------|-------------|
| ☐ | Checkbox for selection (only enabled for pending) |
| S/N | Serial number |
| Payout ID | Unique identifier for the payout |
| User ID | Customer's user ID |
| Amount | Payout amount in Naira |
| Recipient | Paystack recipient code |
| Reference | Transfer reference |
| Status | Current status (Pending, Paid, Cancelled, Failed) |
| Date Created | When the payout request was created |
| Actions | "Details" button to view full information |

### Status Badges

- 🟡 **Pending**: Awaiting approval
- 🟢 **Paid**: Successfully transferred
- 🔴 **Cancelled**: Cancelled by admin
- 🔴 **Failed**: Transfer failed

## Common Scenarios

### Scenario 1: Approving Weekly Payouts

1. Filter by status "Pending"
2. Review the list of pending payouts
3. Select all valid payouts using "Select All"
4. Verify the total amount is reasonable
5. Click "Approve Payment"
6. Check available balance
7. Enter passcode and confirm

### Scenario 2: Insufficient Balance

**What happens:**
- Balance check shows red X
- "Confirm Payment" button is disabled
- Error message: "Insufficient balance (Short by ₦X)"

**What to do:**
1. Add funds to your Paystack account
2. Click "Retry" to refresh balance
3. Or reduce the number of selected payouts
4. Once balance is sufficient, proceed with approval

### Scenario 3: Some Transfers Fail

**What happens:**
- Results modal shows mixed success/failure
- Toast notification: "X successful, Y failed"
- Failed transfers remain in "Pending" or change to "Failed"

**What to do:**
1. Review the failure reasons in the results table
2. Common reasons:
   - Invalid recipient code
   - Recipient account issues
   - Paystack service issues
3. Close the modal
4. Investigate failed payouts individually
5. Retry failed payouts after resolving issues

### Scenario 4: Forgot Passcode

**What to do:**
1. Contact your system administrator
2. They can reset the passcode in the system configuration
3. Never share your passcode with others

## Best Practices

### Before Approving

✅ **DO:**
- Review all selected payouts carefully
- Verify the total amount is correct
- Check that you have sufficient balance
- Ensure recipient codes are valid
- Process payouts during business hours

❌ **DON'T:**
- Approve payouts without reviewing
- Share your admin passcode
- Process payouts when balance is low
- Approve suspicious or unusual amounts
- Close the browser during processing

### During Processing

✅ **DO:**
- Wait for processing to complete
- Keep the browser window open
- Monitor the progress indicator

❌ **DON'T:**
- Close the modal while processing
- Refresh the page
- Click "Confirm Payment" multiple times
- Navigate away from the page

### After Processing

✅ **DO:**
- Review the results carefully
- Note any failed transfers
- Verify the table has refreshed
- Check Paystack dashboard for confirmation
- Document any issues

❌ **DON'T:**
- Ignore failed transfers
- Assume all transfers succeeded
- Retry immediately without investigating failures

## Troubleshooting

### Problem: Can't Select Payouts

**Possible Causes:**
- Payouts are not in "Pending" status
- You're viewing a different status filter

**Solution:**
- Change status filter to "Pending"
- Only pending payouts can be selected

### Problem: "Approve Payment" Button Not Showing

**Possible Causes:**
- No payouts are selected
- All selected payouts became invalid

**Solution:**
- Select at least one pending payout
- Refresh the page if needed

### Problem: "Invalid Passcode" Error

**Possible Causes:**
- Incorrect passcode entered
- Passcode was recently changed

**Solution:**
- Double-check your passcode
- Contact system administrator if forgotten
- Ensure Caps Lock is off

### Problem: Balance Check Fails

**Possible Causes:**
- Internet connection issues
- Paystack API temporarily unavailable
- Invalid Paystack credentials

**Solution:**
- Click "Retry" button
- Check your internet connection
- Wait a few minutes and try again
- Contact system administrator if persists

### Problem: All Transfers Failed

**Possible Causes:**
- Paystack service issues
- Invalid configuration
- OTP enabled on Paystack account

**Solution:**
- Check Paystack dashboard for service status
- Verify OTP is disabled for transfers
- Contact system administrator
- Check Paystack account status

## Security Guidelines

### Passcode Security

1. **Keep it Secret**: Never share your passcode
2. **Use Strong Passcode**: Minimum 12 characters
3. **Change Regularly**: Update every 90 days
4. **Don't Write it Down**: Memorize or use password manager
5. **Report Compromise**: Immediately notify if passcode is exposed

### Access Control

1. **Authorized Personnel Only**: Only approved admins should have access
2. **Log Out**: Always log out when finished
3. **Secure Workstation**: Lock your computer when away
4. **Monitor Activity**: Review audit logs regularly
5. **Report Suspicious Activity**: Notify security team immediately

### Transaction Verification

1. **Verify Amounts**: Double-check all amounts before approving
2. **Check Recipients**: Ensure recipient codes are valid
3. **Review Patterns**: Watch for unusual payout patterns
4. **Confirm Identity**: Verify payout requests are legitimate
5. **Document Issues**: Keep records of any problems

## Support Contacts

### Technical Issues
- **System Administrator**: [contact info]
- **IT Support**: [contact info]

### Paystack Issues
- **Paystack Support**: support@paystack.com
- **Paystack Dashboard**: https://dashboard.paystack.com/
- **Paystack Documentation**: https://paystack.com/docs/

### Emergency Contacts
- **Security Team**: [contact info]
- **Finance Team**: [contact info]

## Frequently Asked Questions

**Q: How long does processing take?**
A: Typically 10-30 seconds for bulk transfers, depending on the number of payouts.

**Q: Can I cancel a transfer after clicking "Confirm Payment"?**
A: No, once processing starts, it cannot be cancelled. Review carefully before confirming.

**Q: What happens if I close the browser during processing?**
A: The transfers will still process on the server, but you won't see the results. Check the table after a few minutes.

**Q: Can I approve payouts from my mobile device?**
A: Yes, the interface is responsive and works on mobile devices.

**Q: How do I know if a transfer was successful?**
A: Check the results modal, the table status, and your Paystack dashboard. Additionally, a debit record will be created in the system for every successful transfer.

**Q: What if a customer's bank account is invalid?**
A: The transfer will fail. Contact the customer to verify their bank details and create a new payout request.

**Q: Can I approve the same payout twice?**
A: No, once a payout is marked "Paid", it cannot be selected again.

**Q: How do I view payout history?**
A: Change the status filter to "Paid" to see all completed payouts.

**Q: What's the maximum number of payouts I can approve at once?**
A: There's no hard limit, but consider your available balance and processing time.

**Q: How do I add funds to Paystack balance?**
A: Log in to Paystack Dashboard → Balances → Add Funds

**Q: What are debit records and why are they important?**
A: Debit records are financial audit trail entries created for every successful payout. They track wallet debits, ensure accurate balance management, and provide complete transaction history. Every successful payout MUST have a corresponding debit record for financial integrity.

**Q: What happens if a debit record fails to create?**
A: If debit record creation fails, the entire transaction is rolled back. The payout will remain in "Pending" status even if the Paystack transfer succeeded. This ensures financial integrity. Contact your system administrator immediately if this occurs.

**Q: Can I view debit records?**
A: Yes, debit records are stored in the `debits` table in the database. Your system administrator can provide access to view these records for reconciliation and audit purposes.

**Q: Why is there a 2% service charge?**
A: The 2% service charge covers transaction processing costs, including Paystack fees, system maintenance, and operational expenses. The charge is capped at ₦2,000 to ensure fairness for large transactions.

**Q: How is the service charge calculated?**
A: Service charge = minimum of (2% of original amount, ₦2,000). For example:
- ₦10,000 payout → ₦200 service charge (2%)
- ₦200,000 payout → ₦2,000 service charge (capped, not ₦4,000)

**Q: Do users see the service charge before requesting a payout?**
A: Users should be informed about the service charge policy. The admin sees the exact breakdown in the approval modal before processing the transfer.

**Q: Where does the service charge go?**
A: The service charge is the difference between the amount debited from the user's wallet and the amount transferred to their bank. It's tracked in the debit record for audit purposes.

**Q: Can I waive the service charge for specific payouts?**
A: No, the service charge is automatically applied to all payouts. If you need to waive fees, contact your system administrator to modify the system configuration.

**Q: How do I verify the service charge was applied correctly?**
A: Check the debit record in the database. The `amount` field shows the full wallet debit, and `debitExt1` contains the service charge details (e.g., "SC:200|NET:9800").

**Q: Do users receive email notifications when payouts are processed?**
A: Yes! Users automatically receive a professional email notification after their payout is successfully processed. The email includes the transaction summary, service charge breakdown, and transaction reference.

**Q: What happens if the email notification fails to send?**
A: Email failures do NOT affect the payout status. The payout will still be marked as "Paid" and the funds will be transferred. Email errors are logged for admin review, and you can manually notify the user if needed.

**Q: What information is included in the email notification?**
A: The email includes:
- User's name
- Original payout amount
- Service charge (2%)
- Net amount transferred to bank
- Bank account (recipient code)
- Transaction reference (Paystack transfer code)
- Transaction date and time
- Status: "Completed"
- Processing time notice (24 hours)
- Service charge disclaimer
- Support contact information

**Q: Can I customize the email template?**
A: Yes, the email template is located at `lib/email/temp/payoutMailTemplate.ts`. You can modify the HTML, styling, and content as needed. Make sure to test thoroughly after making changes.

**Q: How do I check if emails are being sent successfully?**
A: Check the server console logs. Successful emails show: "📧 Email notification sent to user@email.com (Transfer: TRF_xxxxx)". Failed emails show: "❌ Email sending error for payout PAY_xxxxx: [error message]".

## Appendix: Status Workflow

```
┌─────────┐
│ Pending │ ← Initial status when payout request is created
└────┬────┘
     │
     ├─→ Admin selects and approves
     │
     ▼
┌─────────────┐
│ Processing  │ ← Temporary status during Paystack transfer
└──────┬──────┘
       │
       ├─→ Success ─→ ┌──────┐
       │              │ Paid │ ← Final status for successful transfers
       │              └──────┘
       │
       └─→ Failure ─→ ┌────────┐
                      │ Failed │ ← Status for failed transfers
                      └────────┘

Manual cancellation:
┌─────────┐
│ Pending │ ─→ Admin cancels ─→ ┌───────────┐
└─────────┘                     │ Cancelled │
                                └───────────┘
```

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0

