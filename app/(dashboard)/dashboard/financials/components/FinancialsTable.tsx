'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = {
  id: string;
  source: 'legacy_payments' | 'invoice_payments' | 'invoice_payment_claims';
  status: 'PENDING' | 'COMPLETED';
  amount: number;
  currency: string;
  paymentMethod: string;
  reference: string;
  serviceName: string;
  serviceType: 'CORPORATE_GIFT' | 'INVOICE' | 'ORDER' | 'OTHER';
  links: Array<{ label: string; href: string }>;
  customer: {
    pidUser: string;
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
};

export default function FinancialsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'all' | 'today' | '7d' | '30d' | '90d' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('period', period);
        if (period === 'custom') {
          if (startDate) params.set('startDate', startDate);
          if (endDate) params.set('endDate', endDate);
        }
        const res = await fetch(`/api/financials/payments?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || data?.statusx !== 'SUCCESS') {
          throw new Error(data?.message || 'Failed to load financial payments');
        }
        setRows(data.rows || []);
        setPending(Number(data?.summary?.pending || 0));
        setCompleted(Number(data?.summary?.completed || 0));
      } catch (e: any) {
        setError(e.message || 'Failed to load financial payments');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [period, startDate, endDate]);

  const fmtMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount || 0);

  const sourceLabel = useMemo(
    () => ({
      legacy_payments: 'Legacy',
      invoice_payments: 'Invoice',
      invoice_payment_claims: 'Invoice Claim',
    }),
    [],
  );

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading financial records...</div>;
  }

  if (error) {
    return <div className="p-8 text-sm text-destructive">{error}</div>;
  }

  const exportRows = rows.map((row) => ({
    timestamp: new Date(row.createdAt).toLocaleString(),
    status: row.status,
    source: sourceLabel[row.source],
    sourceLinks: (row.links || []).map((l) => `${l.label}: ${l.href}`).join(' | '),
    amount: fmtMoney(row.amount, row.currency),
    method: row.paymentMethod,
    reference: row.reference,
    service: row.serviceName,
    serviceType: row.serviceType,
    customerName: row.customer.name,
    customerEmail: row.customer.email,
    customerPhone: row.customer.phone,
    customerId: row.customer.pidUser,
  }));

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const headers = [
      'Timestamp',
      'Status',
      'Source',
      'Source Links',
      'Amount',
      'Method',
      'Reference',
      'Service',
      'Service Type',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Customer ID',
    ];
    const lines = [
      headers.join(','),
      ...exportRows.map((r) =>
        [
          r.timestamp,
          r.status,
          r.source,
          r.sourceLinks,
          r.amount,
          r.method,
          r.reference,
          r.service,
          r.serviceType,
          r.customerName,
          r.customerEmail,
          r.customerPhone,
          r.customerId,
        ]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(','),
      ),
    ];
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `financials-${period}-${new Date().toISOString().slice(0, 19)}.csv`);
  };

  const handleExportPdf = async () => {
    const jsPDFModule = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const doc = new jsPDFModule.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const autoTable = (autoTableModule as any).default;
    doc.setFontSize(12);
    doc.text(`Financial Records (${period.toUpperCase()})`, 40, 34);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 50);
    autoTable(doc, {
      startY: 62,
      head: [[
        'Timestamp', 'Status', 'Source', 'Amount', 'Method', 'Reference', 'Service', 'Service Type', 'Customer',
      ]],
      body: exportRows.map((r) => [
        r.timestamp,
        r.status,
        r.source,
        r.amount,
        r.method,
        r.reference,
        r.service,
        r.serviceType,
        `${r.customerName}\n${r.customerEmail}\n${r.customerPhone}`,
      ]),
      styles: { fontSize: 8, cellPadding: 4, valign: 'top' },
      headStyles: { fillColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 88 },
        1: { cellWidth: 54 },
        2: { cellWidth: 58 },
        3: { cellWidth: 66 },
        4: { cellWidth: 70 },
        5: { cellWidth: 95 },
        6: { cellWidth: 130 },
        7: { cellWidth: 80 },
        8: { cellWidth: 130 },
      },
    });
    doc.save(`financials-${period}-${new Date().toISOString().slice(0, 19)}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 text-sm">Total Records: <b>{rows.length}</b></div>
        <div className="rounded-lg border border-border bg-card p-4 text-sm">Pending: <b>{pending}</b></div>
        <div className="rounded-lg border border-border bg-card p-4 text-sm">Completed: <b>{completed}</b></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleExportExcel} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          Export Excel
        </button>
        <button onClick={handleExportPdf} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          Export PDF
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Period</label>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
        {period === 'custom' ? (
          <>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Start date</label>
              <input
                type="date"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">End date</label>
              <input
                type="date"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Customer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.source}-${row.id}`} className="border-t border-border align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>{new Date(row.createdAt).toLocaleDateString()}</div>
                  <div className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleTimeString()}</div>
                </td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 font-semibold">{fmtMoney(row.amount, row.currency)}</td>
                <td className="px-4 py-3">{row.paymentMethod}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.reference}</td>
                <td className="px-4 py-3">
                  <div>{row.serviceName}</div>
                  <div className="text-xs text-muted-foreground">{row.serviceType.replaceAll('_', ' ')}</div>
                  {row.links?.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {row.links.map((link) => (
                        <a key={`${row.id}-${link.label}`} href={link.href} className="text-xs text-primary underline">
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{row.customer.name}</div>
                  <div className="text-xs text-muted-foreground">{row.customer.email}</div>
                  <div className="text-xs text-muted-foreground">{row.customer.phone}</div>
                  <div className="text-xs text-muted-foreground">{row.customer.pidUser}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
