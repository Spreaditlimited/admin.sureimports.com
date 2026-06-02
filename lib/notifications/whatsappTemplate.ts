type WhatsAppTemplateInput = {
  requestId: string;
  serviceName?: string;
  businessName: string;
  contactPersonFullName: string;
  contactEmail: string;
  whatsappNumber: string;
  status: string;
  handledByName?: string | null;
  cancellationReason?: string | null;
};

export async function sendApprovedWhatsAppStatusTemplate(input: WhatsAppTemplateInput) {
  const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
  const webhookToken = process.env.N8N_WHATSAPP_WEBHOOK_TOKEN;

  if (!webhookUrl) {
    console.warn('n8n WhatsApp webhook is not configured');
    return;
  }

  const to = String(input.whatsappNumber || '').trim();
  if (!to) {
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
    },
    body: JSON.stringify({
      channel: 'whatsapp',
      useTemplate: true,
      templateKey: 'corporate_gift_status_update',
      requestId: input.requestId,
      serviceName: input.serviceName || '',
      businessName: input.businessName,
      contactPersonFullName: input.contactPersonFullName,
      contactEmail: input.contactEmail,
      whatsappNumber: to,
      status: input.status,
      handledByName: input.handledByName || '',
      cancellationReason: input.cancellationReason || '',
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n WhatsApp webhook error (${response.status}): ${errorText}`);
  }
}
