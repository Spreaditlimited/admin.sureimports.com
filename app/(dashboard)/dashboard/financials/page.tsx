import FinancialsTable from './components/FinancialsTable';

export default function FinancialsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Financials</h1>
        <p className="text-sm text-muted-foreground">
          Unified payment ledger across legacy payments, invoice payments, and pending invoice claims.
        </p>
      </div>
      <FinancialsTable />
    </div>
  );
}
