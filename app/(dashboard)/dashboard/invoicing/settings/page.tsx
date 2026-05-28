import InvoiceSettingsForm from '../components/InvoiceSettingsForm';

export default function InvoiceSettingsPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Invoice Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure global defaults for invoice snapshots, headers, and footer notes.
        </p>
      </div>

      {/* Page Content */}
      <InvoiceSettingsForm />
      
    </div>
  );
}