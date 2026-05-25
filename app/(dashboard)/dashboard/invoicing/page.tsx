import InvoicesTable from './components/InvoicesTable';

export default function InvoicingPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoicing</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Create, issue, and track invoices and payments.</p>
      </div>
      <InvoicesTable />
    </div>
  );
}
