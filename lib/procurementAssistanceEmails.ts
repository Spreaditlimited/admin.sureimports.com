import xMail from '@/lib/email/xMail2';

const orderHelpUrl = 'https://www.sureimports.com/dashboard/procurement/view-orders/saved';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function greetingName(value?: string | null) {
  return escapeHtml(value?.trim() || 'there');
}

export function buildAssistanceClaimedEmail(input: {
  firstName?: string | null;
  adminFirstName: string;
}) {
  const adminFirstName = input.adminFirstName.trim() || 'A Sure Imports admin';
  const safeAdminFirstName = escapeHtml(adminFirstName);
  return {
    subject: `${adminFirstName} is now helping with your order`,
    heading: 'An admin has started helping you',
    body1: `Hi ${greetingName(input.firstName)},<br /><br />${safeAdminFirstName} has claimed your order help request and can now work on the orders you approved.`,
    body2: 'They may contact you through WhatsApp if they need more information.<br /><br />You can review the request or remove access at any time from your Saved Orders page.',
    buttonTitle: 'View Order Help',
  };
}

export function buildAssistanceReleasedEmail(input: {
  firstName?: string | null;
  adminFirstName: string;
}) {
  const adminFirstName = escapeHtml(
    input.adminFirstName.trim() || 'A Sure Imports admin',
  );
  return {
    subject: 'Admin help with your order has ended',
    heading: 'Your order help request is complete',
    body1: `Hi ${greetingName(input.firstName)},<br /><br />${adminFirstName} has completed your order help request and released access.`,
    body2: 'Our admin can no longer create or change any order covered by this request.<br /><br />Please review your saved order and make sure the details are correct before continuing.<br /><br />If you still need help, you can start another request from your Saved Orders page.',
    buttonTitle: 'Review Saved Order',
  };
}

async function sendOrderHelpEmail(
  email: string,
  content: ReturnType<
    typeof buildAssistanceClaimedEmail | typeof buildAssistanceReleasedEmail
  >,
) {
  try {
    await xMail({
      xEmail: email,
      xTitle: content.subject,
      xBodyTitle: content.heading,
      xBody1: content.body1,
      xBody2: content.body2,
      xButtonTitle: content.buttonTitle,
      xButtonLink: orderHelpUrl,
      throwOnError: true,
    });
  } catch (error) {
    console.error('Failed to send procurement assistance email:', error);
  }
}

export async function sendAssistanceClaimedEmail(input: {
  email: string;
  firstName?: string | null;
  adminFirstName: string;
}) {
  return sendOrderHelpEmail(input.email, buildAssistanceClaimedEmail(input));
}

export async function sendAssistanceReleasedEmail(input: {
  email: string;
  firstName?: string | null;
  adminFirstName: string;
}) {
  return sendOrderHelpEmail(input.email, buildAssistanceReleasedEmail(input));
}
