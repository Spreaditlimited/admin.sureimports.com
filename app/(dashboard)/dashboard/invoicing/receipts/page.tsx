import ReceiptsTable from '../components/ReceiptsTable';

export default function ReceiptsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receipts</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">View and send payment receipts to customers.</p>
      </div>
      <ReceiptsTable />
    </div>
  );
}
