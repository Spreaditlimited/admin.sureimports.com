import ReceiptsTable from '../components/ReceiptsTable';

export default function ReceiptsPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Receipts
        </h1>
        <p className="text-sm text-muted-foreground">
          View, manage, and dispatch official payment receipts to your customers.
        </p>
      </div>

      {/* Page Content */}
      <ReceiptsTable />
      
    </div>
  );
}