import AdminWhatsAppForm from './components/AdminWhatsAppForm';

export default function AdminWhatsAppPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Public WhatsApp Contacts
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage the contacts displayed by the floating WhatsApp button across
          Sure Imports and LineScout public pages.
        </p>
      </div>

      <AdminWhatsAppForm />
    </div>
  );
}
