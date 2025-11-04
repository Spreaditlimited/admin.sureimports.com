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
   - **Total to Transfer**: Shows the sum of selected payouts
   - **Balance Check**: Green checkmark if sufficient, red X if insufficient
   - **Selected Payouts List**: Review all payouts to be processed

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
     - ✅ Success: Transfer completed
     - ❌ Failed: Transfer failed (with reason)
   - A summary toast notification will appear
   - The table will automatically refresh

10. **Close Modal**
    - Click "Close" to return to the payout requests table
    - Successfully processed payouts will now show status "Paid"

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
A: Check the results modal, the table status, and your Paystack dashboard.

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

