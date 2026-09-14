export const PARTNER_EMAIL_MAX_ATTEMPTS = 8;
export const PARTNER_EMAIL_LEASE_MS = 5 * 60 * 1000;

export function partnerEmailContent(action: string) {
  switch (action) {
    case 'BILLING_PAYMENT_CONFIRMED': return {subject:'Your platform payment is confirmed',message:'Your monthly platform payment has been confirmed. Open Billing in your partner dashboard to view your receipt and paid-through date.'};
    case 'BILLING_PAYMENT_REVERSED': return {subject:'Your platform payment was reversed',message:'A platform payment was refunded or reversed. Open Billing to review your access and payment records. Existing customer orders, refunds and legitimate earnings remain available.'};
    case 'BILLING_CANCELLED': return {subject:'Your platform subscription was cancelled',message:'Future subscription renewals have been cancelled. Confirmed paid access remains available through its end date. Open Billing to review your plan.'};
    case 'BILLING_ATTENTION': return {subject:'Your platform subscription needs attention',message:'Your subscription has stopped or needs payment attention. Open Billing to check the next step. Paid customer orders and existing earnings are not forfeited.'};
    case 'WALLET_PAYPAL_DESTINATION_SAVED': return {subject:'Your PayPal payout account was updated',message:'Your verified PayPal email has been saved for future GBP withdrawals. Existing requests keep their original destination. Contact support immediately if you did not make this change.'};
    case 'ORDER_FULFILMENT_UPDATED': return {subject:'Your customer order has an update',message:'Open Orders in your partner dashboard to review the latest status and tracking information. Please keep your customer informed through your business.'};
    case 'ORDER_ADJUSTMENT_PROPOSED': return {subject:'An order cost change needs your review',message:'Open Orders to review the original and revised product or shipping costs. Approve the change before your customer makes an additional payment or a refund is issued.'};
    case 'ORDER_ADJUSTMENT_APPROVED': return {subject:'Order cost change approved',message:'Your review has been recorded. Open Orders to see whether an additional customer payment or a refund is outstanding. Earnings remain unavailable for withdrawal until the change is settled.'};
    case 'ORDER_ADJUSTMENT_REJECTED': return {subject:'Order cost change declined',message:'Your decision has been recorded. The proposed change has not been charged to your customer. Open Orders to view the review history.'};
    case 'ORDER_ADJUSTMENT_SETTLED': return {subject:'Order cost change completed',message:'The required additional payment or refund has been confirmed, or no payment was needed. Your order totals and product earnings have been updated. Earnings remain subject to payment fees, holds and your customer confirming receipt.'};
    case 'COMMERCIAL_TERMS_UPDATED': return { subject: 'Review your updated partner commercial terms', message: 'Your partner service-charge split has been updated. Sign in to review your revised agreement. Once business fit and verification are approved, accept the agreement to enable new customer checkouts. Existing payment and earnings records remain unchanged.' };
    case 'WALLET_BANK_VERIFIED': return {"subject":"Your withdrawal bank account was updated","message":"Your Nigerian bank account has been verified and saved for future withdrawal requests. Existing requests keep their original destination. If you did not make this change, contact support immediately."};
    case 'WALLET_EARNING_PENDING': return {"subject":"New pending partner earnings","message":"A verified customer payment has added earnings to your wallet. They remain pending until your customer confirms receiving or collecting their goods."};
    case 'WALLET_CUSTOMER_RECEIPT_CONFIRMED': return {"subject":"Customer receipt confirmed","message":"Your customer has confirmed receipt of their goods. The related earnings are now available, subject to any outstanding holds or adjustments."};
    case 'WALLET_EARNING_HELD': return {"subject":"Partner earnings placed on hold","message":"An order earning has been held for review. It cannot be withdrawn while the hold remains. Open your wallet or contact support for help."};
    case 'WALLET_EARNING_REVERSED': return {"subject":"Partner earnings adjusted","message":"A refunded or reversed payment has adjusted its related earnings. Open your wallet to review your current balance."};
    case 'WALLET_WITHDRAWAL_REQUESTED': return {"subject":"Withdrawal request received","message":"Your withdrawal request has been received and its amount reserved. A request is not a completed payout. We will notify you when the payment provider confirms the outcome."};
    case 'WALLET_TRANSFER_PAID': return {"subject":"Your partner withdrawal was paid","message":"The payment provider has confirmed that your withdrawal was successful. Open your wallet to view the payment record."};
    case 'WALLET_TRANSFER_FAILED': return {"subject":"Your partner withdrawal could not be completed","message":"The payment provider has confirmed that the transfer failed. Its reserved amount has been released, subject to current holds or adjustments. Check your payout details before making a new request."};
    case 'WALLET_TRANSFER_REVERSED': return {"subject":"Your partner withdrawal was reversed","message":"The payment provider has confirmed a transfer reversal. Your wallet has been updated. Please review the withdrawal before requesting another payout."};
    case 'WALLET_ADMIN_HOLD': return {"subject":"Partner earnings placed on hold","message":"Our team has held an earning for review. Open your wallet to see its status."};
    case 'WALLET_ADMIN_RELEASE': return {"subject":"An earnings hold was released","message":"Our team has completed its review and released an earnings hold. Open your wallet to see your available balance."};
    case 'WALLET_ADMIN_REVERSE': return {"subject":"Partner earnings adjusted","message":"Our team has recorded an earnings adjustment following review. Open your wallet or contact support if you need clarification."};
    case 'BUSINESS_FIT_APPROVED':
      return {
        subject: 'Business fit approved — next: business verification',
        message: 'Your business plan has been approved for a pilot. This completes the business-fit stage, not final business approval. Our team must also accept your business-verification documents. Once both reviews are approved, read and accept your agreement to activate your partner account automatically. Sign in to see your progress and any remaining steps.',
      };
    case 'BUSINESS_FIT_CHANGES':
      return {
        subject: 'Your business plan needs clarification',
        message: 'Our team needs more information about your business plan before completing the business-fit review. Your application has been reopened for corrections. Sign in to read the feedback, update your answers and submit again. Your business has not been activated.',
      };
    case 'BUSINESS_FIT_NOT_READY':
      return {
        subject: 'An update on your business-fit review',
        message: 'Your business-fit review is complete, but your application is not ready to proceed at this stage. Sign in to read the feedback and recommended next steps. Your business has not been activated.',
      };
    case 'SUBMITTED':
      return {
        subject: 'Partner application received',
        message:
          'We have received your partner verification submission. Our team will review it and contact you if anything else is needed. Your business is not yet activated.',
      };
    case 'ADMIN_REQUEST_CHANGES':
      return {
        subject: 'Your partner application needs an update',
        message:
          'Our team has requested changes to your verification submission. Sign in to read the feedback, update your details or documents, and submit again.',
      };
    case 'ADMIN_VERIFIED':
      return {
        subject: 'Your partner KYC evidence has been accepted',
        message:
          'Our team has accepted your verification documents. Once business fit is also approved, open your dashboard and select Read and Accept Agreement. Accepting the agreement automatically completes verification, activates your account and unlocks storefront customization. No further admin approval is needed.',
      };
    case 'ADMIN_REJECTED':
      return {
        subject: 'An update on your partner application',
        message:
          'Our team could not accept your current KYC submission. Sign in to read the decision and any next steps.',
      };
    case 'BUSINESS_ACTIVATED':
      return {
        subject: 'Your Sure Imports partner business has been activated',
        message:
          'Your agreement has been confirmed and business verification is complete. Your business and payment collection have been activated. Publish your verified storefront to accept customer payments. Set up your bank account in Wallet when you are ready to withdraw available earnings. Sign in to view your next steps.',
      };
    default:
      throw new Error('Unsupported partner notification.');
  }
}
export function partnerEmailRetryAt(attempt: number, now = new Date()) {
  if (
    !Number.isInteger(attempt) ||
    attempt < 1 ||
    !Number.isFinite(now.getTime())
  )
    throw new Error('Invalid retry inputs.');
  return new Date(
    now.getTime() +
      Math.min(24 * 60, 5 * 2 ** Math.min(attempt - 1, 10)) * 60000,
  );
}
