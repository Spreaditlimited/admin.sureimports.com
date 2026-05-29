import CreateInvoiceForm from '../../components/CreateInvoiceForm';

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ pidInvoice: string }>;
}) {
  const { pidInvoice } = await params;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Edit Draft Invoice
        </h1>
        <p className="text-sm text-muted-foreground">
          Update line items and details before issuing this invoice.
        </p>
      </div>

      <CreateInvoiceForm pidInvoice={pidInvoice} />
    </div>
  );
}
