import CompanyContactsForm from './CompanyContactsForm';

export default function CompanyContactsPage() {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Company Addresses & Contacts
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage the China and Lagos contact details shown inside customer
          dashboards.
        </p>
      </div>

      <CompanyContactsForm />
    </div>
  );
}
