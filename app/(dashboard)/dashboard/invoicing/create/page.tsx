import CreateInvoiceForm from '../components/CreateInvoiceForm';

export default function CreateInvoicePage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create Invoice
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate and issue official invoices to registered customers.
        </p>
      </div>

      {/* Page Content */}
      <CreateInvoiceForm />
      
    </div>
  );
}