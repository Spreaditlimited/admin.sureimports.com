interface PayoutEmailProps {
  userName: string;
  originalAmount: number;
  serviceCharge: number;
  netAmount: number;
  recipientCode: string;
  transferCode: string;
  transactionDate: string;
}

export const payoutMailTemplate = ({
  userName,
  originalAmount,
  serviceCharge,
  netAmount,
  recipientCode,
  transferCode,
  transactionDate,
}: PayoutEmailProps): string => {
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payout Transfer Successful</title>
</head>
<body style="font-family: Calibri, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">

  <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 20px 10px 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                <span style="color: white; font-size: 30px;">✓</span>
              </div>
              <h2 style="margin: 10px 0 0 0; color: #10b981; font-size: 24px;">Payout Transfer Successful!</h2>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 30px 10px 30px;">
              <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Dear <strong>${userName}</strong>,
              </p>
              <p style="margin: 15px 0 0 0; color: #666666; font-size: 15px; line-height: 1.6;">
                Your payout request has been successfully processed and the funds have been transferred to your bank account.
              </p>
            </td>
          </tr>

          <!-- Transaction Summary Card -->
          <tr>
            <td style="padding: 20px 30px;">
              <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
                      Transaction Summary
                    </h3>
                    
                    <!-- Original Amount -->
                    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          Original Payout Amount:
                        </td>
                        <td align="right" style="padding: 8px 0; color: #111827; font-size: 15px; font-weight: 600;">
                          ${formatCurrency(originalAmount)}
                        </td>
                      </tr>
                    </table>

                    <!-- Service Charge -->
                    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          Service Charge (2%):
                        </td>
                        <td align="right" style="padding: 8px 0; color: #f59e0b; font-size: 15px; font-weight: 600;">
                          -${formatCurrency(serviceCharge)}
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <div style="border-top: 1px solid #e5e7eb; margin: 15px 0;"></div>

                    <!-- Net Amount -->
                    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 15px;">
                      <tr>
                        <td style="padding: 8px 0; color: #111827; font-size: 16px; font-weight: 700;">
                          Net Amount Transferred:
                        </td>
                        <td align="right" style="padding: 8px 0; color: #10b981; font-size: 18px; font-weight: 700;">
                          ${formatCurrency(netAmount)}
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <div style="border-top: 1px solid #e5e7eb; margin: 15px 0;"></div>

                    <!-- Transaction Details -->
                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">
                          Bank Account:
                        </td>
                        <td align="right" style="padding: 6px 0; color: #374151; font-size: 13px; font-family: monospace;">
                          ${recipientCode}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">
                          Transaction Reference:
                        </td>
                        <td align="right" style="padding: 6px 0; color: #374151; font-size: 13px; font-family: monospace;">
                          ${transferCode}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">
                          Transaction Date:
                        </td>
                        <td align="right" style="padding: 6px 0; color: #374151; font-size: 13px;">
                          ${transactionDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">
                          Status:
                        </td>
                        <td align="right" style="padding: 6px 0;">
                          <span style="background-color: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            ✓ Completed
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Important Notice -->
          <tr>
            <td style="padding: 10px 30px 20px 30px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                  <strong>⏱ Processing Time:</strong> The funds should reflect in your bank account within 24 hours. 
                  Bank processing times may vary.
                </p>
              </div>
            </td>
          </tr>

          <!-- Service Charge Disclaimer -->
          <tr>
            <td style="padding: 10px 30px 20px 30px;">
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; color: #4b5563; font-size: 12px; line-height: 1.5;">
                  <strong>About Service Charge:</strong> A 2% service charge (capped at ₦2,000 per transaction) 
                  is applied to all payout transfers to cover transaction processing costs. The full original amount 
                  has been debited from your wallet, and the net amount (after service charge) has been transferred 
                  to your bank account.
                </p>
              </div>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td style="padding: 20px 30px;">
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                If you have any questions or concerns about this transaction, please contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <img src="${process.env.ROOT_URL}/assets/images/logo.png" height="35" alt="SureImports Logo" style="margin-bottom: 10px;" />
              <p style="margin: 10px 0; color: #666666; font-size: 14px; font-style: italic;">
                Start your importation with peace of mind
              </p>
              
              <p style="margin: 15px 0 5px 0; color: #9ca3af; font-size: 11px;">
                <a href="https://www.facebook.com/spreaditng" style="color: #6b7280; text-decoration: none;">Facebook</a> &nbsp;|&nbsp;
                <a href="https://www.youtube.com/@sureimports" style="color: #6b7280; text-decoration: none;">Youtube</a> &nbsp;|&nbsp;
                <a href="https://www.tiktok.com/@tochukwunkwocha" style="color: #6b7280; text-decoration: none;">Tiktok</a> &nbsp;|&nbsp;
                <a href="https://www.instagram.com/sureimport" style="color: #6b7280; text-decoration: none;">Instagram</a>
              </p>

              <p style="margin: 10px 0; color: #666666; font-size: 13px;">
                <a href="https://sureimports.com" style="color: #10b981; text-decoration: none; font-weight: 600;">www.sureimports.com</a>
              </p>

              <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 11px; line-height: 1.4;">
                This is an automated notification. Please do not reply to this email.<br />
                © ${new Date().getFullYear()} SureImports. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
};

export default payoutMailTemplate;

