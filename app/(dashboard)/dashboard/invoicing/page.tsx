import InvoicesTable from './components/InvoicesTable';

export default function InvoicingPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Invoicing
        </h1>
        <p className="text-sm text-muted-foreground">
          Create, issue, and track invoices and customer payments.
        </p>
      </div>

      {/* Page Content */}
      <InvoicesTable />
      
    </div>
  );
}