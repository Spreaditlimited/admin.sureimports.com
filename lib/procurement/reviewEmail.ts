import { prisma } from '@/lib/prisma';
import transporter from '@/lib/email/config/nodemailerConfig';
import mailTemplate, { escapeEmailText as esc } from '@/lib/email/temp/mailTemplate2';

export const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJiZvgRGGPOxARlHVuAEV0jqw';
export function completedOrderEmail(input: { firstName: string | null; pidOrder: string; orderName: string | null; note?: string | null }) {
  const subject = 'Your order is complete — how was your experience?';
  const html = mailTemplate({
    zTitle: subject, zLabel: 'ORDER COMPLETED', zBodyTitle: 'Your order is complete. Thank you for trusting us.',
    zPreheader: 'Thank you for choosing Sure Imports. Share your experience on Google.',
    zBody1: `<p>Hi ${esc(input.firstName || 'there')},</p><p>Your Buy from Chinese Websites order has been marked completed. Thank you for choosing Sure Imports to handle your purchase and shipping.</p><div class="si-panel" style="padding:17px 18px;background:#f6f5fb;border:1px solid #e9e6f4;border-radius:8px"><p style="margin:0 0 7px;font-size:10px;letter-spacing:1.2px;font-weight:bold">YOUR ORDER</p><p style="margin:0 0 5px;font-size:15px;font-weight:bold">${esc(input.orderName || input.pidOrder)}</p><p style="margin:0;font-size:12px">${esc(input.pidOrder)} · Completed</p></div>${input.note?.trim() ? `<p style="margin-top:20px"><strong>Order note</strong><br>${esc(input.note).replace(/\n/g, '<br>')}</p>` : ''}`,
    zBody2: '<h2 style="font-size:20px;line-height:1.4;margin:0 0 10px">How was your experience?</h2><p>We’d appreciate an honest review on Google. Your feedback helps us improve and helps other buyers decide whether Sure Imports is right for them.</p>',
    zButtonTitle: 'Leave a review on Google', zButtonLink: GOOGLE_REVIEW_URL,
    zAfterButton: 'You may need to sign in to your Google account.<br><br>Need help with your order? <a class="si-link" href="https://www.sureimports.com/dashboard" style="color:#4c419c">Contact support</a>. We’re here to help.',
    zFooter: 'You received this email because you placed an order with Sure Imports.',
  });
  const text = `Hi ${input.firstName || 'there'},\n\nYour order ${input.orderName || input.pidOrder} (${input.pidOrder}) has been marked completed. Thank you for choosing Sure Imports.\n\n${input.note ? `Order note: ${input.note}\n\n` : ''}How was your experience? We’d appreciate an honest review on Google:\n${GOOGLE_REVIEW_URL}\n\nNeed help? https://www.sureimports.com/dashboard`;
  return { subject, html, text };
}

/** The unique order key is inserted in the status transaction, never by a historic backfill. */
export async function dispatchProcurementReviewEmails(pidOrder?: string) {
  const jobs = pidOrder
    ? await prisma.$queryRaw<Array<{pidOrder: string}>>`SELECT pidOrder FROM procurement_review_emails WHERE pidOrder=${pidOrder} AND status='PENDING' AND nextAttemptAt <= NOW(3) LIMIT 1`
    : await prisma.$queryRaw<Array<{pidOrder: string}>>`SELECT pidOrder FROM procurement_review_emails WHERE status='PENDING' AND nextAttemptAt <= NOW(3) ORDER BY createdAt LIMIT 8`;
  let sent = 0;
  for (const job of jobs) {
    const claim = await prisma.$executeRaw`UPDATE procurement_review_emails SET status='SENDING',attempts=attempts+1,claimedAt=NOW(3) WHERE pidOrder=${job.pidOrder} AND status='PENDING' AND nextAttemptAt <= NOW(3)`;
    if (!claim) continue;
    try {
      const order = await prisma.orders.findUnique({where:{pidOrder:job.pidOrder}, include:{user:true}});
      if (!order || order.status !== 'completed') {
        await prisma.$executeRaw`UPDATE procurement_review_emails SET status='CANCELLED' WHERE pidOrder=${job.pidOrder}`;
        continue;
      }
      const [queued] = await prisma.$queryRaw<Array<{note: string | null}>>`SELECT note FROM procurement_review_emails WHERE pidOrder=${job.pidOrder}`;
      const email = completedOrderEmail({firstName:order.user.userFirstname, pidOrder:order.pidOrder, orderName:order.orderName, note:queued?.note});
      const result = await transporter.sendMail({from:`"Sure Imports" <${process.env.SMTP_EMAIL}>`,to:order.user.userEmail,...email,messageId:`<procurement-completed-${Buffer.from(order.pidOrder).toString('hex')}@sureimports.com>`});
      if (!result.accepted?.length) throw new Error('Recipient not accepted');
      await prisma.$executeRaw`UPDATE procurement_review_emails SET status='SENT',sentAt=NOW(3),claimedAt=NULL WHERE pidOrder=${job.pidOrder}`;
      sent++;
    } catch (error) {
      // SMTP timeout/disconnect can occur after acceptance: do not automatically duplicate delivery.
      const code = (error as {code?:string}).code;
      const safeRetry = ['ECONNECTION','EDNS','EAUTH','EENVELOPE'].includes(code || '');
      if (safeRetry) await prisma.$executeRaw`UPDATE procurement_review_emails SET status=IF(attempts<5,'PENDING','FAILED'),nextAttemptAt=DATE_ADD(NOW(3),INTERVAL 1 HOUR),claimedAt=NULL WHERE pidOrder=${job.pidOrder}`;
      else await prisma.$executeRaw`UPDATE procurement_review_emails SET status='REVIEW_REQUIRED',claimedAt=NULL WHERE pidOrder=${job.pidOrder}`;
      console.error('Procurement review email delivery needs attention', job.pidOrder, code || 'DELIVERY_UNCERTAIN');
    }
  }
  // A crash during SMTP delivery has an uncertain outcome; manual review avoids duplicate emails.
  await prisma.$executeRaw`UPDATE procurement_review_emails SET status='REVIEW_REQUIRED' WHERE status='SENDING' AND claimedAt < DATE_SUB(NOW(3),INTERVAL 15 MINUTE)`;
  return {checked:jobs.length,sent};
}
