import { prisma } from '@/lib/prisma';
import sendEmail from '@/lib/email/config/sendEmail';
import { STAGE_LABELS } from './policy';
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Transactional outbox. Leases allow a later run to recover an interrupted worker.
export async function dispatchVehicleNotifications() {
  const now = new Date();
  const eligible = { OR: [{ status: 'PENDING', nextAttemptAt: { lte: now } }, { status: 'SENDING', leaseUntil: { lt: now } }] };
  const jobs = await prisma.vehicle_notifications.findMany({ where: eligible, take: 8, orderBy: { nextAttemptAt: 'asc' }, include: { event: { include: { order: true } } } });
  const outcomes = await Promise.all(jobs.map(async job => {
    const claimed = await prisma.vehicle_notifications.updateMany({ where: { id: job.id, attempts: job.attempts, ...eligible }, data: { status: 'SENDING', attempts: { increment: 1 }, leaseUntil: new Date(Date.now() + 300000) } });
    if (claimed.count !== 1) return 'busy';
    try {
      const order = job.event.order; const label = STAGE_LABELS[job.event.type] || 'Order update';
      const url = `https://sureimports.com/dashboard/vehicles/${encodeURIComponent(order.id)}`;
      if (job.channel === 'EMAIL') {
        await sendEmail(order.email, `${label} — ${order.vehicleName}`, `<p>Hello ${escapeHtml(order.customerName)},</p><p>${escapeHtml(job.event.message).replace(/\n/g, '<br/>')}</p><p><a href="${url}">View your vehicle order</a></p>`);
      } else {
        const webhook = process.env.N8N_WHATSAPP_WEBHOOK_URL; const templateKey = process.env.VEHICLE_WHATSAPP_TEMPLATE_KEY;
        if (!webhook || !templateKey) throw new Error('Configure the approved vehicle WhatsApp template and n8n webhook.');
        const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.N8N_WHATSAPP_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.N8N_WHATSAPP_WEBHOOK_TOKEN}` } : {}), 'Idempotency-Key': job.id }, signal: AbortSignal.timeout(12000), body: JSON.stringify({ channel: 'whatsapp', useTemplate: true, templateKey, eventId: job.id, requestId: order.id, serviceName: 'Vehicle imports', businessName: 'Sure Imports', contactPersonFullName: order.customerName, contactEmail: order.email, whatsappNumber: order.phone, status: label, message: job.event.message, orderUrl: url }) });
        if (!response.ok) throw new Error(`WhatsApp provider returned ${response.status}`);
      }
      await prisma.vehicle_notifications.update({ where: { id: job.id }, data: { status: 'SENT', sentAt: new Date(), leaseUntil: null, lastError: null } });
      return 'sent';
    } catch(e) {
      const attempts = job.attempts + 1;
      await prisma.vehicle_notifications.update({ where: { id: job.id }, data: { status: attempts >= 8 ? 'FAILED' : 'PENDING', leaseUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** attempts)), lastError: (e as Error).message.slice(0, 1000) } });
      return 'retry';
    }
  }));
  return { processed: jobs.length, outcomes };
}
