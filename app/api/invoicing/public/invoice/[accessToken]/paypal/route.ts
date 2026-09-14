import { startInvoicePayPalCheckout, confirmInvoicePayPalCheckout } from '@/lib/invoicing/paypalCheckout';
import { after } from 'next/server';
import { notifyInvoicePayPalPayment } from '@/lib/invoicing/paypalNotifications';

export async function POST(request: Request, context: { params: Promise<{ accessToken: string }> }) {
  const { accessToken } = await context.params;
  if (!accessToken || accessToken.length > 256) return Response.json({ message: 'Invalid invoice link.' }, { status: 400 });
  const body = await request.json().catch(() => null);
  try {
    if (body?.action === 'verify' && /^PINV_[a-f0-9]{32}$/.test(body.checkoutId || '')) {
      const result = await confirmInvoicePayPalCheckout(body.checkoutId, accessToken);
      if (result.status === 'PAID') after(() => notifyInvoicePayPalPayment(body.checkoutId));
      return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body?.action !== 'create') return Response.json({ message: 'Invalid checkout action.' }, { status: 400 });
    return Response.json(await startInvoicePayPalCheckout(accessToken), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error && error.name === 'Error' ? error.message : 'Invoice payment is temporarily unavailable. Please refresh before retrying.';
    return Response.json({ message }, { status: 400 });
  }
}
