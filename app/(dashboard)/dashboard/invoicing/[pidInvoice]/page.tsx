import InvoiceDetails from '../components/InvoiceDetails';

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ pidInvoice: string }>;
}) {
  const { pidInvoice } = await params;
  return (
    <div className="p-6 space-y-6">
      <InvoiceDetails pidInvoice={pidInvoice} />
    </div>
  );
}
