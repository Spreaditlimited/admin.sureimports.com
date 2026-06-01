import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FileText, Calendar, User, CreditCard, Info } from 'lucide-react';
import { parseInvoiceLinkedRequestId } from '@/lib/invoiceLinkedService';
import { getUserBusinessName } from '@/lib/userBusinessName';

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ pidInvoice: string }>;
}) {
  const { pidInvoice } = await params;

  const invoice = await prisma.invoices.findUnique({
    where: { pidInvoice },
    include: {
      items: { orderBy: { lineNo: 'asc' } },
      user: {
        select: {
          userFirstname: true,
          userLastname: true,
          userEmail: true,
          userPhone: true,
        },
      },
    },
  });

  if (!invoice) notFound();

  let corporateBusinessName: string | null = null;
  const link = parseInvoiceLinkedRequestId(invoice.linkedRequestId);
  if (link.type === 'corporate-gift') {
    const gift = await prisma.corporate_gift_request.findUnique({
      where: { pidRequest: link.id },
      select: { businessName: true, contactPersonFullName: true, contactEmail: true },
    });

    if (gift) {
      corporateBusinessName = gift.businessName || null;
      const derivedNameBase = gift.contactPersonFullName || invoice.customerName || `${invoice.user.userFirstname || ''} ${invoice.user.userLastname || ''}`.trim() || 'Customer';
      invoice.customerName = gift.businessName ? `${derivedNameBase} (${gift.businessName})` : derivedNameBase;
      if (!invoice.customerEmail && gift.contactEmail) invoice.customerEmail = gift.contactEmail;
    }
  }

  const userBusinessName = await getUserBusinessName(invoice.pidUser);
  if (userBusinessName) {
    const baseName =
      String(invoice.customerName || '').trim() ||
      `${invoice.user.userFirstname || ''} ${invoice.user.userLastname || ''}`.trim() ||
      'Customer';
    if (!baseName.includes(`(${userBusinessName})`)) {
      invoice.customerName = `${baseName} (${userBusinessName})`;
    }
  }

  const customerName = invoice.customerName || `${invoice.user.userFirstname || ''} ${invoice.user.userLastname || ''}`.trim() || 'Customer';
  const customerEmail = invoice.customerEmail || invoice.user.userEmail || 'N/A';
  const customerPhone = invoice.customerPhone || invoice.user.userPhone || 'N/A';

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let style = 'bg-muted text-muted-foreground border-border';
    if (s === 'paid') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (s === 'partial') style = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (s === 'overdue') style = 'bg-destructive/10 text-destructive border-destructive/20';
    
    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* 1. Preview Branding & Header */}
      <div className="bg-card border border-border shadow-soft rounded-xl overflow-hidden max-w-5xl mx-auto">
        <div className="p-6 sm:p-8 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Sure Imports</span>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Invoice Preview</h1>
              <p className="text-sm text-muted-foreground italic">Official customer-facing document layout</p>
            </div>
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Invoice Number</span>
              <span className="text-xl font-mono font-bold text-foreground">{invoice.invoiceNumber}</span>
              <div className="mt-1">{getStatusBadge(invoice.status || 'Draft')}</div>
            </div>
          </div>
        </div>

        {/* 2. Billing & Date Details */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-muted/30 border border-border rounded-lg p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Billed To
            </h2>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">{customerName}</p>
              {corporateBusinessName && <p className="text-sm font-medium text-foreground">{corporateBusinessName}</p>}
              <p className="text-sm text-muted-foreground">{customerEmail}</p>
              <p className="text-sm text-muted-foreground">{customerPhone}</p>
            </div>
          </div>

          <div className="bg-muted/30 border border-border rounded-lg p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Timeline
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date Issued:</span>
                <span className="font-semibold text-foreground">{invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('en-NG') : 'Pending'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-semibold text-foreground">{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('en-NG') : 'Not Set'}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Full Settlement:</span>
                <span className="font-bold text-foreground">{invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-NG') : 'Outstanding'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Line Items Table */}
        <div className="px-6 sm:p-8">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.items.map((item) => (
                  <tr key={item.pidInvoiceItem} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 text-muted-foreground font-medium">{item.lineNo}</td>
                    <td className="px-4 py-4 font-medium">{item.description}</td>
                    <td className="px-4 py-4 text-center">{Number(item.quantity).toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs">{invoice.currency} {Number(item.unitPrice).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4 text-right font-bold font-mono text-xs">{invoice.currency} {Number(item.lineTotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Financial Summary */}
        <div className="p-6 sm:p-8 flex justify-end bg-muted/10 border-t border-border mt-4">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">{invoice.currency} {Number(invoice.subtotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount Applied</span>
              <span className="font-medium text-destructive">-{invoice.currency} {Number(invoice.discountTotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium text-foreground">{invoice.currency} {Number(invoice.taxTotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-base font-bold text-foreground uppercase tracking-tight">Grand Total</span>
              <span className="text-xl font-bold text-primary font-mono">{invoice.currency} {Number(invoice.grandTotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm pt-2">
              <span className="text-emerald-600 font-medium">Amount Received</span>
              <span className="text-emerald-600 font-bold">{invoice.currency} {Number(invoice.amountPaid).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center bg-primary/5 p-3 rounded-md border border-primary/20">
              <span className="text-sm font-bold text-primary uppercase">Balance Due</span>
              <span className="text-lg font-bold text-primary font-mono">{invoice.currency} {Number(invoice.balanceDue).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* 5. Snapshots & Notes */}
        {(invoice.headerSnapshot || invoice.footerSnapshot || invoice.notes) && (
          <div className="p-6 sm:p-8 bg-muted/20 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoice.headerSnapshot && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><CreditCard className="w-3 h-3" /> Settlement Details</h3>
                <pre className="whitespace-pre-wrap font-sans text-xs text-foreground leading-relaxed bg-card p-3 rounded border border-border">{invoice.headerSnapshot}</pre>
              </div>
            )}
            {invoice.footerSnapshot && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Info className="w-3 h-3" /> Payment Terms</h3>
                <pre className="whitespace-pre-wrap font-sans text-xs text-foreground leading-relaxed bg-card p-3 rounded border border-border">{invoice.footerSnapshot}</pre>
              </div>
            )}
            {invoice.notes && (
              <div className="md:col-span-2 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><FileText className="w-3 h-3" /> Additional Remarks</h3>
                <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed bg-card p-3 rounded border border-border">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
