import AdminWhatsAppForm from './components/AdminWhatsAppForm';

export default function AdminWhatsAppPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Admin WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage the WhatsApp contacts displayed on the customer-facing floating chat button.
        </p>
      </div>

      <AdminWhatsAppForm />
    </div>
  );
}
