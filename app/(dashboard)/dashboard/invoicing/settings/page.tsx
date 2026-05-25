import InvoiceSettingsForm from '../components/InvoiceSettingsForm';

export default function InvoiceSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Settings</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage default invoice header and footer notes.</p>
      </div>
      <InvoiceSettingsForm />
    </div>
  );
}
