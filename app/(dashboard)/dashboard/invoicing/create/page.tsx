import CreateInvoiceForm from '../components/CreateInvoiceForm';

export default function CreateInvoicePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Invoice</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Issue invoices to registered users only.</p>
      </div>
      <CreateInvoiceForm />
    </div>
  );
}
