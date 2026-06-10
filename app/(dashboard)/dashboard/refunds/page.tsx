import { Metadata } from 'next';
import RefundsTable from './components/RefundsTable';

export const metadata: Metadata = {
  title: 'Refunds | Admin Dashboard',
  description: 'Manage customer refunds and settlement status',
};

export default function AdminRefundsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Refunds
        </h1>
        <p className="text-sm text-muted-foreground">
          Review customer refunds, monitor wallet transfers, and mark paid refunds as settled.
        </p>
      </div>

      <RefundsTable />
    </div>
  );
}
